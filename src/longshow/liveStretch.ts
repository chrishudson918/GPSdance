// Long-show test: slowing a song live, while it plays (decided 2026-11-19).
//
// Making a whole slowed copy of each song was too slow and too big on the Dell 3120: jumps at 75% took
// 15-21 s and the tab reached about 1 GB. Now the speed tool (Signalsmith Stretch) runs on the
// playing audio clock and is fed the decoded song about 20 s ahead of where it's playing, a piece at
// a time; pieces it has played are let go. Nothing slowed is kept.

import SignalsmithStretch, { type StretchNode } from 'signalsmith-stretch';
import stretchWorkletUrl from './stretch.worklet.ts?worker&url';

// Our copy of the speed tool's audio-thread code, with the processor meter and the "alive" switch.
SignalsmithStretch.moduleUrl = stretchWorkletUrl;

/** Keep the speed tool fed this far ahead of where the song is playing (song seconds). */
export const FEED_AHEAD_SECONDS = 20;
/** Size of each piece handed to the speed tool (song seconds). */
export const PIECE_SECONDS = 10;
/** Keep this much already-played audio (the speed tool reads a little behind the playhead). */
export const KEEP_BEHIND_SECONDS = 5;
/**
 * Lead time when starting a live song "now". The speed tool needs a short head start
 * (its own delay is about a tenth of a second); this leaves room on a slow Chromebook.
 */
export const LIVE_START_DELAY = 0.3;
/** How long the warm-up runs the speed tool on silence, seconds. */
export const WARM_UP_SECONDS = 2;

/**
 * The next piece to hand over, in song seconds, or null if the speed tool has enough for now
 * or no more of the song is decoded yet (`available` = decoded so far: a quick-start part or the whole song).
 */
export function nextPiece(
  fedUntil: number,
  playing: number,
  available: number,
): { from: number; to: number } | null {
  if (fedUntil >= available - 1e-6) return null;
  if (fedUntil - playing >= FEED_AHEAD_SECONDS) return null;
  return { from: fedUntil, to: Math.min(fedUntil + PIECE_SECONDS, available) };
}

/**
 * The processor meter: adds up the speed tools' reports (busy milliseconds in each second of audio,
 * from every song slowing at once, e.g. two during a crossfade) and keeps the busiest second.
 */
export class LoadMeter {
  private seconds = new Map<number, number>();
  /** Busiest second so far, as a share of that second (0.45 = 45%). Undefined until a report arrives. */
  peak: number | undefined;

  add(second: number, busyMs: number): void {
    const total = (this.seconds.get(second) ?? 0) + busyMs;
    this.seconds.set(second, total);
    this.peak = Math.max(this.peak ?? 0, total / 1000);
    for (const s of this.seconds.keys()) if (s < second - 10) this.seconds.delete(s);
  }

  reset(): void {
    this.seconds.clear();
    this.peak = undefined;
  }
}

/**
 * One song slowing live. Input time 0 for the speed tool = `origin` seconds into the song
 * (where this voice started playing), since it can only be fed from where it starts.
 */
export class LiveFeed {
  /** Song seconds handed over so far. */
  private fedUntil: number;
  /** Song seconds let go of so far. */
  private droppedUntil: number;
  private busy = false;
  private stopped = false;

  private constructor(
    private readonly node: StretchNode,
    readonly origin: number,
  ) {
    this.fedUntil = origin;
    this.droppedUntil = origin;
  }

  /** Makes a speed tool for a song that will play from `origin` seconds, sending its meter reports to `meter`. */
  static async create(ctx: AudioContext, channels: number, origin: number, meter: LoadMeter): Promise<LiveFeed> {
    const node = await SignalsmithStretch(ctx, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [channels],
    });
    node.port.addEventListener('message', (event: MessageEvent) => {
      const data = event.data as unknown[];
      if (data[0] === 'load') meter.add(data[1] as number, data[2] as number);
    });
    return new LiveFeed(node, origin);
  }

  /**
   * Runs a speed tool on silence for a moment, so its first-time setup on the audio thread is done before
   * the show starts. Added 2026-11-19: on the Dell 3120 the only dropouts in a 14-minute run came in the
   * first seconds of the first song. Resolves with how long it took, in seconds.
   */
  static async warmUp(ctx: AudioContext): Promise<number> {
    const began = performance.now();
    await ctx.resume();
    const feed = await LiveFeed.create(ctx, 2, 0, new LoadMeter()); // its own meter: not part of the show
    feed.connect(ctx.destination); // silence in, silence out
    const silence = new AudioBuffer({ length: ctx.sampleRate * WARM_UP_SECONDS, numberOfChannels: 2, sampleRate: ctx.sampleRate });
    await feed.start(silence, ctx.currentTime + LIVE_START_DELAY, 0.75);
    await new Promise((resolve) => setTimeout(resolve, (LIVE_START_DELAY + WARM_UP_SECONDS) * 1000));
    feed.stop();
    return (performance.now() - began) / 1000;
  }

  connect(destination: AudioNode): void {
    this.node.connect(destination);
  }

  /** Hands over the first piece, then starts playing at clock time `at` and `rate`. */
  async start(source: AudioBuffer, at: number, rate: number): Promise<void> {
    await this.feed(source, this.origin);
    await this.node.start(at, 0, undefined, rate);
  }

  /** Called a few times a second: keeps the speed tool fed ahead of `playing` and lets go of what has played. */
  async feed(source: AudioBuffer, playing: number): Promise<void> {
    if (this.busy || this.stopped) return;
    this.busy = true;
    try {
      const piece = nextPiece(this.fedUntil, playing, source.duration);
      if (piece) {
        const channels = copyPiece(source, piece.from, piece.to);
        await this.node.addBuffers(
          channels,
          channels.map((c) => c.buffer as ArrayBuffer),
        );
        this.fedUntil = piece.to;
      }
      const dropTo = playing - KEEP_BEHIND_SECONDS;
      if (dropTo - this.droppedUntil >= PIECE_SECONDS) {
        await this.node.dropBuffers(dropTo - this.origin);
        this.droppedUntil = dropTo;
      }
    } finally {
      this.busy = false;
    }
  }

  /** Audio held by the speed tool right now, MB (handed over and not yet let go). */
  heldMb(channels: number, sampleRate: number): number {
    return ((this.fedUntil - this.droppedUntil) * sampleRate * channels * 4) / (1024 * 1024);
  }

  /** Silences it and stops it for good, so it stops using the processor. */
  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.node.parameters.get('alive')?.setValueAtTime(0, 0);
    this.node.disconnect();
  }
}

/** A copy of one piece of the song (its own memory, so it can be handed over without copying again). */
function copyPiece(source: AudioBuffer, from: number, to: number): Float32Array[] {
  const start = Math.floor(from * source.sampleRate);
  const end = Math.min(source.length, Math.floor(to * source.sampleRate));
  return Array.from({ length: source.numberOfChannels }, (_, c) => source.getChannelData(c).slice(start, end));
}
