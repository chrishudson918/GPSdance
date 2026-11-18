// Long-show test: a bare-bones show player that holds only the playing song and the next one
// in memory (docs/design/player.md, "Set list = the project's song order").
// Not the real Player: just enough to measure memory and timing on a Chromebook over a ~30-minute show.
//
// How it works:
// - Songs stay as the picked files (compressed, a few MB each). Only two are ever decoded.
// - While a song plays, the next one is decoded (and slowed, at a practice speed) in the background,
//   then scheduled on the audio clock to start one crossfade before the current one ends.
// - When a song has finished, it's let go, and loading the one after it starts.
// - A jump drops everything and starts the clicked song: whole (decode it all, then play) or
//   quick start (decode only the first seconds, play, then swap to the whole song in the background).

import { audioContext, bufferMb, changeSpeed, decodeFile, slicePart } from '../poc/audio';
import { readQuickChunk } from './chunks';
import type { JumpMode, LoadMode, ShowEvent } from './results';
import {
  copyOffset,
  endClock,
  fadeLength,
  mayLoadNext,
  NEXT_LOAD_DELAY_SECONDS,
  songTimeAt,
  songToLoad,
  type Anchor,
} from './showPlan';

/** A decoded copy of a song, possibly slowed, possibly starting partway in (`from`, original seconds). */
interface Held {
  buffer: AudioBuffer;
  from: number;
  rate: number;
}

/** A song that is playing or scheduled to play. */
interface Voice extends Anchor {
  index: number;
  gain: GainNode;
  sources: AudioBufferSourceNode[];
  /** Clock time it starts sounding. */
  startClock: number;
  /** Clock time it ends; Infinity while only a quick-start part is known (its length isn't yet). */
  endClock: number;
  /** Fade-out at its end, real seconds (0 for the last song). */
  fadeOut: number;
}

export type ShowState = 'idle' | 'loading' | 'playing' | 'paused' | 'preparing';

export interface ShowSnapshot {
  state: ShowState;
  /** The song playing or paused, if any. */
  index: number | null;
  /** Where in that song, original seconds. */
  songSeconds: number;
  rate: number;
  /** Songs decoded in memory right now. */
  held: number[];
  audioMb: number;
  peakAudioMb: number;
  playedSeconds: number;
  events: ShowEvent[];
}

/** Lead time when starting something "now", so the audio clock can schedule it cleanly. */
const START_DELAY = 0.05;

export class ShowPlayer {
  loadMode: LoadMode = 'whole';

  private files: File[] = [];
  /** Exact song lengths, known once a song has been decoded. */
  private durations: number[] = [];
  private rate = 1;
  /** Bumped by every jump, pause and speed change, so loads started before it are ignored. */
  private generation = 0;
  private voices: Voice[] = [];
  private held = new Map<number, Held>();
  private quickPart: AudioBuffer | null = null;
  private loading = new Set<number>();
  /** Clock time before which the next song isn't loaded (set after a jump, speed change or resume). */
  private holdNextUntil = 0;
  /** A song change that is scheduled but hasn't sounded yet; logged once it does (a pause or jump cancels it). */
  private pendingChange: { event: ShowEvent; at: number } | null = null;
  private paused: { index: number; songSeconds: number } | null = null;
  private state: ShowState = 'idle';
  private events: ShowEvent[] = [];
  private peakAudioMb = 0;
  private playedSeconds = 0;
  private lastTick = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private listeners = new Set<() => void>();
  private snapshot: ShowSnapshot = this.makeSnapshot();

  /** Called whenever something on screen should change. Returns a function that stops listening. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): ShowSnapshot {
    return this.snapshot;
  }

  setSongs(files: File[]): void {
    this.stopEverything();
    this.held.clear();
    this.files = files;
    this.durations = [];
    this.events = [];
    this.peakAudioMb = 0;
    this.playedSeconds = 0;
    this.state = 'idle';
    this.emit();
  }

  /** Starts the clicked song from its beginning (also how the show starts: song 1). */
  async jump(index: number): Promise<void> {
    const clicked = performance.now();
    const ctx = audioContext();
    void ctx.resume(); // starting audio needs a click; this is one
    this.stopEverything();
    this.held.clear();
    const generation = this.generation;
    const rate = this.rate;
    this.state = 'loading';
    this.emit();

    try {
      const quick = this.loadMode === 'quick' && rate === 1 ? await readQuickChunk(this.files[index]) : null;
      if (quick) {
        const part = await ctx.decodeAudioData(quick);
        if (generation !== this.generation) return;
        this.quickPart = part;
        const at = ctx.currentTime + START_DELAY;
        const voice = this.startVoice(index, part, 0, 0, at, 0);
        this.holdNextUntil = at + NEXT_LOAD_DELAY_SECONDS;
        this.logJump(index, clicked, at, rate, 'quick');
        this.beginPlaying();

        const whole = await this.loadSong(index, 1, 0);
        if (generation !== this.generation) return;
        this.held.set(index, whole);
        this.swapInWhole(voice, whole, part);
      } else {
        const whole = await this.loadSong(index, rate, 0);
        if (generation !== this.generation) return;
        this.held.set(index, whole);
        const at = ctx.currentTime + START_DELAY;
        this.setEnd(this.startVoice(index, whole.buffer, whole.from, 0, at, 0));
        this.holdNextUntil = at + NEXT_LOAD_DELAY_SECONDS;
        const mode: JumpMode = this.loadMode === 'quick' && rate === 1 ? 'wholeFallback' : 'whole';
        this.logJump(index, clicked, at, rate, mode);
        this.beginPlaying();
      }
    } catch (err) {
      this.fail(generation, err);
    }
  }

  pause(): void {
    if (this.state !== 'playing') return;
    const now = audioContext().currentTime;
    const voice = this.currentVoice(now);
    if (!voice) return;
    const songSeconds = Math.max(0, songTimeAt(voice, now));
    this.stopEverything();
    // Keep the paused song and the next; anything older (mid-crossfade) can go.
    for (const i of [...this.held.keys()]) if (i !== voice.index && i !== voice.index + 1) this.held.delete(i);
    this.paused = { index: voice.index, songSeconds };
    this.state = 'paused';
    this.emit();
  }

  async resume(): Promise<void> {
    const where = this.paused;
    if (this.state !== 'paused' || !where) return;
    void audioContext().resume();
    this.paused = null;
    await this.playFrom(where.index, where.songSeconds, this.generation, () => {});
  }

  /**
   * Changes the practice speed. If music is playing it pauses, the current song is slowed from where it
   * was ("Getting it ready…"), and it carries on. The next song is then made at the new speed in the background.
   */
  async setSpeed(rate: number): Promise<void> {
    if (rate === this.rate || this.state === 'loading' || this.state === 'preparing') return;
    const clicked = performance.now();
    const ctx = audioContext();
    void ctx.resume();
    const where = this.position();
    const wasPlaying = this.state === 'playing';
    this.stopEverything();
    this.held.clear(); // copies at the old speed are no use now
    this.rate = rate;
    if (!where) {
      this.emit();
      return;
    }

    const generation = this.generation;
    this.state = 'preparing';
    this.emit();
    if (wasPlaying) {
      await this.playFrom(where.index, where.songSeconds, generation, (at) => {
        const seconds = (performance.now() + (at - ctx.currentTime) * 1000 - clicked) / 1000;
        this.log({ kind: 'speed', song: where.index, rate, seconds, whilePlaying: true });
      });
    } else {
      try {
        const copy = await this.loadSong(where.index, rate, where.songSeconds);
        if (generation !== this.generation) return;
        this.held.set(where.index, copy);
        this.paused = where;
        this.state = 'paused';
        this.log({ kind: 'speed', song: where.index, rate, seconds: (performance.now() - clicked) / 1000, whilePlaying: false });
      } catch (err) {
        this.fail(generation, err);
      }
    }
  }

  // ---- inside ----

  /** Decodes a song and, at a practice speed, makes its slowed copy (from `from` seconds on). */
  private async loadSong(index: number, rate: number, from: number): Promise<Held> {
    const decoded = await decodeFile(this.files[index]);
    this.durations[index] = decoded.duration;
    if (rate === 1) return { buffer: decoded, from: 0, rate };
    const start = Math.min(Math.max(0, from), decoded.duration);
    // Only the part from the playhead on: faster to make and smaller to hold (tech-stack.md, "Long mixes").
    const part = start > 0 ? slicePart(decoded, start, decoded.duration - start) : decoded;
    return { buffer: await changeSpeed(part, rate), from: start, rate };
  }

  /** Plays a song from a point, loading it first if it isn't held. `started` gets the clock time it sounds. */
  private async playFrom(index: number, songSeconds: number, generation: number, started: (at: number) => void) {
    const ctx = audioContext();
    try {
      let copy = this.held.get(index);
      if (!copy || copy.rate !== this.rate || songSeconds < copy.from) {
        this.state = 'preparing';
        this.emit();
        copy = await this.loadSong(index, this.rate, songSeconds);
        if (generation !== this.generation) return;
        this.held.set(index, copy);
      }
      const at = ctx.currentTime + START_DELAY;
      this.setEnd(this.startVoice(index, copy.buffer, copy.from, songSeconds, at, 0));
      this.holdNextUntil = at + NEXT_LOAD_DELAY_SECONDS;
      started(at);
      this.beginPlaying();
    } catch (err) {
      this.fail(generation, err);
    }
  }

  private startVoice(index: number, buffer: AudioBuffer, copyFrom: number, songSeconds: number, at: number, fadeIn: number): Voice {
    const ctx = audioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    if (fadeIn > 0) {
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(1, at + fadeIn);
    }
    const voice: Voice = {
      index,
      gain,
      sources: [],
      anchorClock: at,
      anchorSong: songSeconds,
      rate: this.rate,
      startClock: at,
      endClock: Infinity,
      fadeOut: 0,
    };
    this.addSource(voice, buffer, copyFrom, at);
    this.voices.push(voice);
    return voice;
  }

  private addSource(voice: Voice, buffer: AudioBuffer, copyFrom: number, at: number): AudioBufferSourceNode {
    const source = audioContext().createBufferSource();
    source.buffer = buffer;
    source.connect(voice.gain);
    source.start(at, copyOffset(songTimeAt(voice, at), copyFrom, voice.rate));
    voice.sources.push(source);
    return source;
  }

  /** Once a song's length is known: when it ends, and its fade-out if another song follows. */
  private setEnd(voice: Voice): void {
    voice.endClock = endClock(voice, this.durations[voice.index]);
    if (voice.index >= this.files.length - 1) return;
    voice.fadeOut = fadeLength(voice.endClock - voice.startClock);
    const fadeStart = Math.max(voice.endClock - voice.fadeOut, audioContext().currentTime);
    voice.gain.gain.setValueAtTime(1, fadeStart);
    voice.gain.gain.linearRampToValueAtTime(0, voice.endClock);
  }

  /** Quick start: the whole song takes over from the first part, at the same spot in the music. */
  private swapInWhole(voice: Voice, whole: Held, part: AudioBuffer): void {
    const at = audioContext().currentTime + 0.1;
    const spareSeconds = voice.startClock + part.duration - at;
    const first = voice.sources[0];
    this.addSource(voice, whole.buffer, whole.from, at);
    first.stop(at);
    this.quickPart = null;
    this.setEnd(voice);
    this.log({ kind: 'swap', song: voice.index, spareSeconds });
  }

  /** Runs 4 times a second while playing: lets finished songs go, loads and schedules the next one. */
  private tick = () => {
    const now = audioContext().currentTime;
    const wall = performance.now();
    this.playedSeconds += (wall - this.lastTick) / 1000;
    this.lastTick = wall;

    for (const voice of [...this.voices]) {
      if (now > voice.endClock + 0.25) {
        this.dropVoice(voice);
        this.held.delete(voice.index);
      }
    }
    if (this.pendingChange && now >= this.pendingChange.at) {
      this.log(this.pendingChange.event);
      this.pendingChange = null;
    }
    const current = this.currentVoice(now);
    if (!current) {
      this.log({ kind: 'end' });
      this.stopEverything();
      this.held.clear();
      this.state = 'idle';
      this.emit();
      return;
    }

    const next = Number.isFinite(current.endClock)
      ? songToLoad(current.index, this.voices.length, this.files.length)
      : null;
    if (next !== null) {
      const ready = this.held.get(next);
      if (ready) this.scheduleNext(current, next, ready, now);
      else if (!this.loading.has(next) && mayLoadNext(now, this.holdNextUntil, current.endClock)) {
        void this.loadNext(next);
      }
    }
    this.emit();
  };

  private async loadNext(index: number): Promise<void> {
    const generation = this.generation;
    this.loading.add(index);
    try {
      const copy = await this.loadSong(index, this.rate, 0);
      if (generation !== this.generation) return;
      this.loading.delete(index);
      this.held.set(index, copy);
      this.tick(); // schedule it right away
    } catch (err) {
      this.fail(generation, err);
    }
  }

  /** Starts the next song one crossfade before the current one ends (or now, if it's already late). */
  private scheduleNext(current: Voice, next: number, ready: Held, now: number): void {
    const planned = current.endClock - current.fadeOut;
    const leadSeconds = planned - now;
    const late = leadSeconds < START_DELAY;
    const at = late ? now + START_DELAY : planned;
    this.setEnd(this.startVoice(next, ready.buffer, ready.from, 0, at, late ? 0 : current.fadeOut));
    this.pendingChange = { event: { kind: 'change', from: current.index, to: next, leadSeconds, rate: this.rate }, at };
  }

  /** The song most recently started (the newer one during a crossfade). */
  private currentVoice(now: number): Voice | undefined {
    const started = this.voices.filter((v) => v.startClock <= now);
    return started[started.length - 1] ?? this.voices[0];
  }

  private position(): { index: number; songSeconds: number } | null {
    if (this.state === 'paused') return this.paused;
    if (this.state !== 'playing') return null;
    const now = audioContext().currentTime;
    const voice = this.currentVoice(now);
    return voice ? { index: voice.index, songSeconds: Math.max(0, songTimeAt(voice, now)) } : null;
  }

  private beginPlaying(): void {
    this.state = 'playing';
    this.lastTick = performance.now();
    this.timer ??= setInterval(this.tick, 250);
    this.emit();
  }

  private logJump(index: number, clicked: number, at: number, rate: number, mode: JumpMode): void {
    const soundAt = performance.now() + (at - audioContext().currentTime) * 1000;
    this.log({ kind: 'jump', to: index, seconds: (soundAt - clicked) / 1000, rate, mode });
  }

  private dropVoice(voice: Voice): void {
    for (const source of voice.sources) {
      try {
        source.stop();
      } catch {
        // already stopped
      }
      source.disconnect();
    }
    voice.gain.disconnect();
    this.voices = this.voices.filter((v) => v !== voice);
  }

  /** Silences everything and forgets work in progress (held copies are kept unless the caller clears them). */
  private stopEverything(): void {
    this.generation++;
    for (const voice of [...this.voices]) this.dropVoice(voice);
    this.quickPart = null;
    this.pendingChange = null;
    this.loading.clear();
    this.paused = null;
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
  }

  private fail(generation: number, err: unknown): void {
    if (generation !== this.generation) return;
    this.stopEverything();
    this.state = 'idle';
    this.log({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
  }

  private log(event: ShowEvent): void {
    this.events = [...this.events, event];
    this.emit();
  }

  private audioMb(): number {
    let mb = this.quickPart ? bufferMb(this.quickPart) : 0;
    for (const copy of this.held.values()) mb += bufferMb(copy.buffer);
    return mb;
  }

  private makeSnapshot(): ShowSnapshot {
    const position = this.position();
    const audioMb = this.audioMb();
    this.peakAudioMb = Math.max(this.peakAudioMb, audioMb);
    return {
      state: this.state,
      index: position?.index ?? null,
      songSeconds: position?.songSeconds ?? 0,
      rate: this.rate,
      held: [...this.held.keys()].sort((a, b) => a - b),
      audioMb,
      peakAudioMb: this.peakAudioMb,
      playedSeconds: this.playedSeconds,
      events: this.events,
    };
  }

  private emit(): void {
    this.snapshot = this.makeSnapshot();
    for (const listener of this.listeners) listener();
  }
}
