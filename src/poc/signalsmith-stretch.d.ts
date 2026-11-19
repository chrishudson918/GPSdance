// Types for signalsmith-stretch 1.3.2, which ships none. Only the parts GPSdance uses
// (offline copies in the proof of concept, live playback in the long-show test).
// Full API: node_modules/signalsmith-stretch/README.md
declare module 'signalsmith-stretch' {
  export interface StretchNode extends AudioWorkletNode {
    /**
     * Adds sample buffers (one Float32Array per channel) after the ones already added; resolves to the
     * new end time in seconds. Pass the arrays' buffers as `transfer` to hand them over instead of copying.
     */
    addBuffers(channels: Float32Array[], transfer?: ArrayBuffer[]): Promise<number>;
    /** Lets go of added buffers that end before `toSeconds` (input time); resolves to what's still held. */
    dropBuffers(toSeconds?: number): Promise<{ start: number; end: number }>;
    /**
     * Like AudioBufferSourceNode.start, plus a playback rate (1 = normal speed): at clock time `when`,
     * play from `offset` seconds into the added buffers.
     */
    start(when?: number, offset?: number, duration?: number, rate?: number, semitones?: number): Promise<unknown>;
    stop(when?: number): void;
  }

  interface SignalsmithStretchFactory {
    (context: BaseAudioContext, channelOptions?: AudioWorkletNodeOptions): Promise<StretchNode>;
    /** Where the audio-thread code is loaded from; unset = the library's built-in copy. */
    moduleUrl?: string;
  }

  const SignalsmithStretch: SignalsmithStretchFactory;
  export default SignalsmithStretch;
}
