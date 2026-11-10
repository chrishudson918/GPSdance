// Proof of concept: the audio work behind tests 1-4, using the browser's Web Audio.
// Not the real app's audio engine: just enough to measure speed, memory and sound on a Chromebook.

import SignalsmithStretch from 'signalsmith-stretch';
import { guess } from 'web-audio-beat-detector';
import type { MixPlan } from './mixPlan';

let sharedContext: AudioContext | undefined;

/** One audio context for the whole page (Chrome limits how many a page can open). */
export function audioContext(): AudioContext {
  sharedContext ??= new AudioContext();
  return sharedContext;
}

/** Decodes a picked song file into audio samples held in memory. */
export async function decodeFile(file: File): Promise<AudioBuffer> {
  const bytes = await file.arrayBuffer();
  return audioContext().decodeAudioData(bytes);
}

/**
 * A copy of just one part of a song (from `from`, `length` seconds long). Once the caller lets go of
 * the whole song, the browser can free its memory: the "only the parts the mix uses" fallback
 * in docs/design/tech-stack.md.
 */
export function slicePart(buffer: AudioBuffer, from: number, length: number): AudioBuffer {
  const start = Math.floor(from * buffer.sampleRate);
  const frames = Math.min(buffer.length - start, Math.ceil(length * buffer.sampleRate));
  const part = new AudioBuffer({ length: frames, numberOfChannels: buffer.numberOfChannels, sampleRate: buffer.sampleRate });
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    part.copyToChannel(buffer.getChannelData(c).subarray(start, start + frames), c);
  }
  return part;
}

/** Memory a decoded song takes: 4 bytes per sample per channel. */
export function bufferMb(buffer: AudioBuffer): number {
  return (buffer.length * buffer.numberOfChannels * 4) / (1024 * 1024);
}

/**
 * Puts every part of the mix on the timeline of `ctx`, with crossfades.
 * Used both to play the mix live (AudioContext) and to render it for the MP3 (OfflineAudioContext),
 * so both sound the same. Returns the sources so live playback can be stopped.
 */
export function scheduleMix(
  ctx: BaseAudioContext,
  plan: MixPlan,
  buffers: AudioBuffer[],
  startAt: number,
): AudioBufferSourceNode[] {
  return plan.parts.map((part) => {
    const source = ctx.createBufferSource();
    source.buffer = buffers[part.song];
    const gain = ctx.createGain();
    source.connect(gain).connect(ctx.destination);

    const start = startAt + part.at;
    const end = start + part.length;
    // Straight-line fades: the test is about smooth playback, not fade shapes (those come later).
    gain.gain.setValueAtTime(part.fadeIn > 0 ? 0 : 1, start);
    if (part.fadeIn > 0) gain.gain.linearRampToValueAtTime(1, start + part.fadeIn);
    gain.gain.setValueAtTime(1, end - part.fadeOut);
    gain.gain.linearRampToValueAtTime(0, end);

    source.start(start, part.from, part.length);
    return source;
  });
}

/** Renders the whole mix to one stereo buffer, faster than real time. */
export async function renderMix(plan: MixPlan, buffers: AudioBuffer[]): Promise<AudioBuffer> {
  const sampleRate = audioContext().sampleRate;
  const offline = new OfflineAudioContext(2, Math.ceil(plan.length * sampleRate), sampleRate);
  scheduleMix(offline, plan, buffers, 0);
  return offline.startRendering();
}

/**
 * Makes a new copy of a song at another speed with the same pitch (Signalsmith Stretch).
 * `rate` 0.9 = 90% speed (slower, longer), 1.1 = 110% (faster, shorter).
 */
export async function changeSpeed(buffer: AudioBuffer, rate: number): Promise<AudioBuffer> {
  const length = Math.ceil((buffer.length / rate) + buffer.sampleRate * 0.5);
  const offline = new OfflineAudioContext(buffer.numberOfChannels, length, buffer.sampleRate);
  const stretch = await SignalsmithStretch(offline, {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [buffer.numberOfChannels],
  });
  stretch.connect(offline.destination);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
  await stretch.addBuffers(channels);
  stretch.start(0, 0, undefined, rate);
  return offline.startRendering();
}

export interface BpmGuess {
  /** BPM, rounded to a whole number (this version of the library gives no exact tempo). */
  bpm: number;
  /** Seconds to the first beat. */
  offset: number;
}

/** Guesses a song's BPM and first beat (web-audio-beat-detector; it looks for 90-180 BPM). */
export function detectBpm(buffer: AudioBuffer): Promise<BpmGuess> {
  return guess(buffer);
}

/** Something playing that can be stopped. */
export interface Playing {
  stop(): void;
  /** Seconds since it started. */
  elapsed(): number;
}

/** Plays a buffer from `from` seconds in, with optional soft clicks at the given song times. */
export function playBuffer(buffer: AudioBuffer, from: number, clicks: number[] = []): Playing {
  const ctx = audioContext();
  void ctx.resume();
  const startAt = ctx.currentTime + 0.1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(startAt, from);

  const clickNodes = clicks
    .filter((t) => t >= from && t < buffer.duration)
    .map((t) => {
      // A short, soft beep: easy to hear over music without being harsh.
      const osc = ctx.createOscillator();
      osc.frequency.value = 1500;
      const gain = ctx.createGain();
      const at = startAt + (t - from);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.35, at + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.06);
      return osc;
    });

  return {
    stop() {
      source.stop();
      clickNodes.forEach((n) => n.stop());
    },
    elapsed: () => Math.max(0, ctx.currentTime - startAt),
  };
}

/** Plays the whole mix live. */
export function playMix(plan: MixPlan, buffers: AudioBuffer[]): Playing {
  const ctx = audioContext();
  void ctx.resume();
  const startAt = ctx.currentTime + 0.2;
  const sources = scheduleMix(ctx, plan, buffers, startAt);
  return {
    stop: () => sources.forEach((s) => s.stop()),
    elapsed: () => Math.max(0, ctx.currentTime - startAt),
  };
}

/** Beat times in seconds from the detected tempo and first beat, up to the song's end. */
export function beatTimes(guessed: BpmGuess, duration: number): number[] {
  // From the rounded BPM, so clicks can drift slightly late in a long song; fine for judging by ear.
  const beat = 60 / guessed.bpm;
  const times: number[] = [];
  for (let t = guessed.offset; t < duration; t += beat) times.push(t);
  return times;
}

/** Encodes a buffer to MP3 in a background worker, so the page stays responsive. */
export function encodeMp3(buffer: AudioBuffer, kbps = 192): Promise<Blob> {
  const worker = new Worker(new URL('./mp3.worker.ts', import.meta.url), { type: 'module' });
  const left = buffer.getChannelData(0).slice();
  const right = (buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : buffer.getChannelData(0)).slice();
  return new Promise((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<{ mp3?: Blob; error?: string }>) => {
      worker.terminate();
      if (e.data.mp3) resolve(e.data.mp3);
      else reject(new Error(e.data.error ?? 'MP3 encoding failed'));
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || 'MP3 worker failed to start'));
    };
    worker.postMessage({ left, right, sampleRate: buffer.sampleRate, kbps }, [left.buffer, right.buffer]);
  });
}
