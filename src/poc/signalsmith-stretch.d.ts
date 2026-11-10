// Types for signalsmith-stretch 1.3.2, which ships none. Only the parts the proof of concept uses.
// Full API: node_modules/signalsmith-stretch/README.md
declare module 'signalsmith-stretch' {
  export interface StretchNode extends AudioWorkletNode {
    /** Adds sample buffers (one Float32Array per channel); resolves to the new end time in seconds. */
    addBuffers(channels: Float32Array[]): Promise<number>;
    /** Like AudioBufferSourceNode.start, plus a playback rate (1 = normal speed). */
    start(when?: number, offset?: number, duration?: number, rate?: number, semitones?: number): void;
    stop(when?: number): void;
  }

  export default function SignalsmithStretch(
    context: BaseAudioContext,
    channelOptions?: AudioWorkletNodeOptions,
  ): Promise<StretchNode>;
}
