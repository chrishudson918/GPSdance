// Runs on the audio thread, before the speed tool's own code (see stretch.worklet.ts).
// Wraps the speed tool's processor (Signalsmith Stretch 1.3.2, MIT license) with:
//
// 1. A processor meter: adds up how long its own work takes in each second of audio and reports it to
//    the page as ['load', second, busyMs]. The library's page side ignores messages it doesn't know.
// 2. An "alive" switch: setting it to 0 makes the speed tool stop for good. Without it a stopped song's
//    speed tool would keep running (and using the processor) until the page closes.
// 3. Two bug fixes in the library's process(), found 2026-11-19. Each throws an error, and Chrome then
//    silences that speed tool for good while the page's timer carries on:
//    - With no inputs (we feed it pieces instead), it reads inputs[0].length while waiting to start.
//      This is what made some slowed copies silent on the Dell 3120.
//    - Reading added audio across the border between two pieces miscounts and overruns its buffer.
//      Our process() below does that reading correctly; everything else is the library's code, unchanged.
// If the library is updated, check whether these are fixed there and this can shrink.

/* The speed tool's insides that process() uses (the library ships no types). */
interface Segment {
  active: boolean;
  input: number;
  output: number;
  rate: number;
  semitones: number;
  tonalityHz: number;
  formantSemitones: number;
  formantCompensation: boolean;
  formantBaseHz: number;
  loopStart: number;
  loopEnd: number;
}
interface WasmModule {
  exports?: { memory: { buffer: ArrayBuffer } };
  HEAP8: { buffer: ArrayBuffer };
  _setTransposeSemitones(semitones: number, tonality: number): void;
  _setFormantSemitones(semitones: number, compensation: boolean): void;
  _setFormantBase(base: number): void;
  _seek(samples: number, rate: number): void;
  _process(inputSamples: number, outputSamples: number): void;
}
interface StretchInsides {
  readonly port: MessagePort;
  wasmReady: boolean;
  wasmModule: WasmModule;
  timeMap: Segment[];
  channels: number;
  inputLatencySeconds: number;
  outputLatencySeconds: number;
  bufferLength: number;
  buffersIn: number[];
  buffersOut: number[];
  audioBuffers: Float32Array[][];
  audioBuffersStart: number;
  timeIntervalCounter: number;
  timeIntervalSamples: number;
}

type Inputs = Float32Array[][];
type Params = Record<string, Float32Array>;
interface WorkletProcessor {
  process(inputs: Inputs, outputs: Inputs, parameters: Params): boolean;
}
type ProcessorClass = new (options: unknown) => WorkletProcessor;
interface WorkletScope {
  currentTime: number;
  sampleRate: number;
  registerProcessor(name: string, processor: ProcessorClass): void;
}

const scope = globalThis as unknown as WorkletScope;
const register = scope.registerProcessor.bind(scope);

scope.registerProcessor = (name, Processor) => {
  class FixedProcessor extends Processor {
    static get parameterDescriptors() {
      return [{ name: 'alive', defaultValue: 1, minValue: 0, maxValue: 1, automationRate: 'k-rate' }];
    }

    private second = -1;
    private busyMs = 0;

    process(inputs: Inputs, outputs: Inputs, parameters: Params): boolean {
      if (parameters.alive[0] < 0.5) return false; // stopped for good; the browser can free it
      // Date.now() counts whole milliseconds; one call takes a fraction of one, but over a second
      // the rounding evens out (a call counts as 1 ms as often as it straddles a millisecond tick).
      const started = Date.now();
      const keepGoing = this.processFixed(inputs.length ? inputs : [[]], outputs, parameters);
      const busy = Date.now() - started;

      const second = Math.floor(scope.currentTime);
      if (second !== this.second) {
        if (this.second >= 0) (this as unknown as StretchInsides).port.postMessage(['load', this.second, this.busyMs]);
        this.second = second;
        this.busyMs = 0;
      }
      this.busyMs += busy;
      return keepGoing;
    }

    /** The library's process() for playing added audio, with the reading fixed; anything else goes to it. */
    private processFixed(inputs: Inputs, outputs: Inputs, parameters: Params): boolean {
      const self = this as unknown as StretchInsides;
      const output = outputs[0];
      const segmentNow = () => {
        const outputTime = scope.currentTime + self.outputLatencySeconds;
        while (self.timeMap.length > 1 && self.timeMap[1].output <= outputTime) self.timeMap.shift();
        return { outputTime, segment: self.timeMap[0] };
      };
      // Not ready, waiting to start, or a channel change: the library's own code handles those fine.
      if (!self.wasmReady || !output?.length || output.length !== self.channels || inputs[0].length > 0) {
        return super.process(inputs, outputs, parameters);
      }
      if (!segmentNow().segment.active) return super.process(inputs, outputs, parameters);

      // From here on: the library's code for playing added audio, with the reading loop fixed.
      const { outputTime, segment } = segmentNow();
      const wasm = self.wasmModule;
      const sampleRate = scope.sampleRate;
      wasm._setTransposeSemitones(segment.semitones, segment.tonalityHz / sampleRate);
      wasm._setFormantSemitones(segment.formantSemitones, segment.formantCompensation);
      wasm._setFormantBase(segment.formantBaseHz / sampleRate);
      const blockSize = output[0].length;
      const memoryNow = () => (wasm.exports ? wasm.exports.memory.buffer : wasm.HEAP8.buffer);

      let inputTime = segment.input + (outputTime - segment.output) * segment.rate;
      const loopLength = segment.loopEnd - segment.loopStart;
      if (loopLength > 0 && inputTime >= segment.loopEnd) {
        segment.input -= loopLength;
        inputTime -= loopLength;
      }
      inputTime += self.inputLatencySeconds;
      const inputEnd = Math.round(inputTime * sampleRate);

      // Fill the speed tool's input window (the last bufferLength samples up to inputEnd) from the added
      // pieces, with silence wherever there's no audio. The fix: keep the read position moving as we
      // go from one piece to the next.
      const memory = memoryNow();
      const windows = output.map((_, c) => new Float32Array(memory, self.buffersIn[c], self.bufferLength));
      let readAt = inputEnd - self.bufferLength; // input sample the next window slot holds
      let filled = 0; // window slots done
      let pieceStart = self.audioBuffersStart;
      for (const piece of self.audioBuffers) {
        if (filled >= self.bufferLength) break;
        const pieceEnd = pieceStart + piece[0].length;
        if (readAt < pieceStart) {
          // Silence before this piece.
          const gap = Math.min(pieceStart - readAt, self.bufferLength - filled);
          windows.forEach((w) => w.fill(0, filled, filled + gap));
          filled += gap;
          readAt += gap;
        }
        if (filled < self.bufferLength && readAt < pieceEnd) {
          const from = readAt - pieceStart;
          const count = Math.min(pieceEnd - readAt, self.bufferLength - filled);
          windows.forEach((w, c) => w.set(piece[c % piece.length].subarray(from, from + count), filled));
          filled += count;
          readAt += count;
        }
        pieceStart = pieceEnd;
      }
      if (filled < self.bufferLength) windows.forEach((w) => w.fill(0, filled));

      // Constantly seeking, so the input window needn't depend on the rate (the library's approach).
      wasm._seek(self.bufferLength, segment.rate);
      wasm._process(0, blockSize);

      self.timeIntervalCounter -= blockSize;
      if (self.timeIntervalCounter <= 0) {
        self.timeIntervalCounter = self.timeIntervalSamples;
        self.port.postMessage(['time', inputTime]);
      }

      const memoryAfter = memoryNow(); // re-fetched in case it moved (the library does the same)
      output.forEach((channel, c) => channel.set(new Float32Array(memoryAfter, self.buffersOut[c], blockSize)));
      return true;
    }
  }
  register(name, FixedProcessor);
};
