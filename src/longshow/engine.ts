// Long-show test: a bare-bones show player that holds only the playing song and the next one
// in memory (docs/design/player.md, "Set list = the project's song order").
// Not the real Player: just enough to measure memory and timing on a Chromebook over a ~30-minute show.
//
// How it works:
// - Songs stay as the picked files (compressed, a few MB each). Only two are ever decoded.
// - While a song plays, the next one is decoded in the background, then scheduled on the audio clock
//   to start one crossfade before the current one ends.
// - When a song has finished, it's let go, and loading the one after it starts.
// - A jump drops everything and starts the clicked song: whole (decode it all, then play) or
//   quick start (decode only the first seconds, play, then swap to the whole song in the background).
// - At 100% songs play straight from the decoded audio. At a practice speed they're slowed live by the
//   speed tool, fed a piece at a time (liveStretch.ts); no slowed copies are made or kept.

import { audioContext, bufferMb, decodeFile } from '../poc/audio';
import { readQuickChunk } from './chunks';
import { LIVE_START_DELAY, LiveFeed, LoadMeter } from './liveStretch';
import type { Dropouts, JumpMode, LoadMode, ShowEvent } from './results';
import {
  endClock,
  fadeLength,
  mayLoadNext,
  NEXT_LOAD_DELAY_SECONDS,
  songTimeAt,
  songToLoad,
  type Anchor,
} from './showPlan';

/** Chrome's count of moments the sound broke up since the page's audio started, if this browser has it. */
export function readDropouts(): Dropouts | null {
  const stats = (audioContext() as AudioContext & {
    playbackStats?: { underrunEvents: number; underrunDuration: number };
  }).playbackStats;
  return stats ? { events: stats.underrunEvents, seconds: stats.underrunDuration } : null;
}

/** A song that is playing or scheduled to play. */
interface Voice extends Anchor {
  index: number;
  gain: GainNode;
  /** At 100%: the decoded audio playing (a quick-start part, then the whole song). */
  sources: AudioBufferSourceNode[];
  /** At a practice speed: the speed tool slowing it live. */
  live: LiveFeed | null;
  /** What it plays from: a quick-start part until the whole song is decoded. */
  audio: AudioBuffer;
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
  /** The speed tool's busiest second so far, as a share of it (undefined until a practice speed has played). */
  peakLoad: number | undefined;
  playedSeconds: number;
  events: ShowEvent[];
}

/** Lead time when starting something "now" at 100%, so the audio clock can schedule it cleanly. */
const START_DELAY = 0.05;

/**
 * At a practice speed, start the next song's speed tool only this close to its crossfade:
 * a speed tool works even while waiting, so making it early would double the processor load for minutes.
 */
const LIVE_SCHEDULE_AHEAD_SECONDS = 5;

export class ShowPlayer {
  loadMode: LoadMode = 'whole';

  private files: File[] = [];
  /** Exact song lengths, known once a song has been decoded. */
  private durations: number[] = [];
  private rate = 1;
  /** Bumped by every jump, pause and speed change, so loads started before it are ignored. */
  private generation = 0;
  private voices: Voice[] = [];
  /** Whole decoded songs (original speed). */
  private held = new Map<number, AudioBuffer>();
  private quickPart: AudioBuffer | null = null;
  /** Songs being decoded or scheduled in the background. */
  private loading = new Set<number>();
  /** Clock time each next song finished decoding (for "next song ready … s early"). */
  private readyAt = new Map<number, number>();
  /** Clock time before which the next song isn't loaded (set after a jump, speed change or resume). */
  private holdNextUntil = 0;
  /** A song change that is scheduled but hasn't sounded yet; logged once it does (a pause or jump cancels it). */
  private pendingChange: { event: ShowEvent; at: number } | null = null;
  private paused: { index: number; songSeconds: number } | null = null;
  private state: ShowState = 'idle';
  private events: ShowEvent[] = [];
  /** The speed tool's first-time setup is done once per page (see LiveFeed.warmUp). */
  private warmedUp = false;
  /** Kept so picking songs again still shows it in the results. */
  private warmUpEvent: ShowEvent | null = null;
  private peakAudioMb = 0;
  private meter = new LoadMeter();
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
    this.readyAt.clear();
    this.files = files;
    this.durations = [];
    this.events = this.warmUpEvent ? [this.warmUpEvent] : [];
    this.peakAudioMb = 0;
    this.meter.reset();
    this.playedSeconds = 0;
    this.state = 'idle';
    this.emit();
    void this.warmUp();
  }

  /** Runs the speed tool on silence once, so its first-time setup isn't done while song 1 plays. */
  private async warmUp(): Promise<void> {
    if (this.warmedUp) return;
    this.warmedUp = true;
    try {
      this.log({ kind: 'warmUp', seconds: await LiveFeed.warmUp(audioContext()) });
      this.warmUpEvent = this.events.at(-1) ?? null;
    } catch (err) {
      this.log({ kind: 'error', text: `Warm-up: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  /** Starts the clicked song from its beginning (also how the show starts: song 1). */
  async jump(index: number): Promise<void> {
    const clicked = performance.now();
    const ctx = audioContext();
    void ctx.resume(); // starting audio needs a click; this is one
    this.stopEverything();
    this.held.clear();
    this.readyAt.clear();
    const generation = this.generation;
    const rate = this.rate;
    this.state = 'loading';
    this.emit();

    try {
      const quick = this.loadMode === 'quick' ? await readQuickChunk(this.files[index]) : null;
      if (quick) {
        const part = await ctx.decodeAudioData(quick);
        if (generation !== this.generation) return;
        this.quickPart = part;
        const voice = await this.startVoice(index, part, 0, null, 0, generation);
        if (!voice) return;
        this.holdNextUntil = voice.startClock + NEXT_LOAD_DELAY_SECONDS;
        this.logJump(index, clicked, voice.startClock, rate, 'quick');
        this.beginPlaying();

        const whole = await this.loadSong(index);
        if (generation !== this.generation) return;
        this.held.set(index, whole);
        this.swapInWhole(voice, whole, part);
      } else {
        const whole = await this.loadSong(index);
        if (generation !== this.generation) return;
        this.held.set(index, whole);
        const voice = await this.startVoice(index, whole, 0, null, 0, generation);
        if (!voice) return;
        this.setEnd(voice);
        this.holdNextUntil = voice.startClock + NEXT_LOAD_DELAY_SECONDS;
        const mode: JumpMode = this.loadMode === 'quick' ? 'wholeFallback' : 'whole';
        this.logJump(index, clicked, voice.startClock, rate, mode);
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
   * Changes the practice speed. If music is playing, it carries on from the same spot at the new speed
   * (the decoded song is kept, so there's nothing to prepare unless it's still decoding).
   */
  async setSpeed(rate: number): Promise<void> {
    if (rate === this.rate || this.state === 'loading' || this.state === 'preparing') return;
    const clicked = performance.now();
    const ctx = audioContext();
    void ctx.resume();
    const where = this.position();
    const wasPlaying = this.state === 'playing';
    this.stopEverything();
    this.rate = rate;
    if (!where) {
      this.emit();
      return;
    }

    if (wasPlaying) {
      await this.playFrom(where.index, where.songSeconds, this.generation, (at) => {
        const seconds = (performance.now() + (at - ctx.currentTime) * 1000 - clicked) / 1000;
        this.log({ kind: 'speed', song: where.index, rate, seconds, whilePlaying: true });
      });
    } else {
      this.paused = where;
      this.state = 'paused';
      this.log({ kind: 'speed', song: where.index, rate, seconds: (performance.now() - clicked) / 1000, whilePlaying: false });
    }
  }

  // ---- inside ----

  /** Decodes a whole song. */
  private async loadSong(index: number): Promise<AudioBuffer> {
    const decoded = await decodeFile(this.files[index]);
    this.durations[index] = decoded.duration;
    return decoded;
  }

  /** Plays a song from a point, decoding it first if it isn't held. `started` gets the clock time it sounds. */
  private async playFrom(index: number, songSeconds: number, generation: number, started: (at: number) => void) {
    try {
      let whole = this.held.get(index);
      if (!whole) {
        this.state = 'preparing';
        this.emit();
        whole = await this.loadSong(index);
        if (generation !== this.generation) return;
        this.held.set(index, whole);
      }
      const voice = await this.startVoice(index, whole, songSeconds, null, 0, generation);
      if (!voice) return;
      this.setEnd(voice);
      this.holdNextUntil = voice.startClock + NEXT_LOAD_DELAY_SECONDS;
      started(voice.startClock);
      this.beginPlaying();
    } catch (err) {
      this.fail(generation, err);
    }
  }

  /**
   * Starts a song sounding at clock time `at` (null = as soon as it can), from `songSeconds` into it,
   * at the current speed. Returns null if a jump, pause or speed change came first.
   */
  private async startVoice(
    index: number,
    audio: AudioBuffer,
    songSeconds: number,
    at: number | null,
    fadeIn: number,
    generation: number,
  ): Promise<Voice | null> {
    const ctx = audioContext();
    const rate = this.rate;
    let live: LiveFeed | null = null;
    if (rate !== 1) {
      live = await LiveFeed.create(ctx, audio.numberOfChannels, songSeconds, this.meter);
      if (generation !== this.generation) {
        live.stop();
        return null;
      }
    }
    const lead = live ? LIVE_START_DELAY : START_DELAY;
    const onTime = at !== null && at >= ctx.currentTime + lead;
    const startAt = onTime ? at : ctx.currentTime + lead;

    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    // A song that couldn't start on time comes straight in: the one before it has already faded.
    if (fadeIn > 0 && (onTime || at === null)) {
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(1, startAt + fadeIn);
    }
    const voice: Voice = {
      index,
      gain,
      sources: [],
      live,
      audio,
      anchorClock: startAt,
      anchorSong: songSeconds,
      rate,
      startClock: startAt,
      endClock: Infinity,
      fadeOut: 0,
    };
    this.voices.push(voice);
    if (live) {
      live.connect(gain);
      await live.start(audio, startAt, rate);
    } else {
      this.addSource(voice, audio, startAt);
    }
    return voice;
  }

  /** At 100%: plays `buffer` (which starts at the song's beginning) from where the song is at `at`. */
  private addSource(voice: Voice, buffer: AudioBuffer, at: number): AudioBufferSourceNode {
    const source = audioContext().createBufferSource();
    source.buffer = buffer;
    source.connect(voice.gain);
    source.start(at, Math.max(0, songTimeAt(voice, at)));
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
  private swapInWhole(voice: Voice, whole: AudioBuffer, part: AudioBuffer): void {
    const at = audioContext().currentTime + 0.1;
    // Real seconds of the first part left to play when the whole song takes over.
    const spareSeconds = endClock(voice, part.duration) - at;
    voice.audio = whole; // a live voice is fed from here on
    if (!voice.live) {
      const first = voice.sources[0];
      this.addSource(voice, whole, at);
      first.stop(at);
    }
    this.quickPart = null;
    this.setEnd(voice);
    this.log({ kind: 'swap', song: voice.index, spareSeconds });
  }

  /** Runs 4 times a second while playing: feeds live songs, lets finished ones go, loads and schedules the next. */
  private tick = () => {
    const now = audioContext().currentTime;
    const wall = performance.now();
    this.playedSeconds += (wall - this.lastTick) / 1000;
    this.lastTick = wall;

    for (const voice of [...this.voices]) {
      if (now > voice.endClock + 0.25) {
        this.dropVoice(voice);
        this.held.delete(voice.index);
      } else if (voice.live) {
        void voice.live.feed(voice.audio, songTimeAt(voice, now)).catch((err) => this.fail(this.generation, err));
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
    this.readyAt.clear();
      this.state = 'idle';
      this.emit();
      return;
    }

    const next = Number.isFinite(current.endClock)
      ? songToLoad(current.index, this.voices.length, this.files.length)
      : null;
    if (next !== null && !this.loading.has(next)) {
      const ready = this.held.get(next);
      if (ready) {
        const startsIn = current.endClock - current.fadeOut - now;
        if (this.rate === 1 || startsIn <= LIVE_SCHEDULE_AHEAD_SECONDS) void this.scheduleNext(current, next, ready);
      } else if (mayLoadNext(now, this.holdNextUntil, current.endClock)) {
        void this.loadNext(next);
      }
    }
    this.emit();
  };

  private async loadNext(index: number): Promise<void> {
    const generation = this.generation;
    this.loading.add(index);
    try {
      const whole = await this.loadSong(index);
      if (generation !== this.generation) return;
      this.loading.delete(index);
      this.held.set(index, whole);
      this.readyAt.set(index, audioContext().currentTime);
      this.tick(); // schedule it if it's time
    } catch (err) {
      this.fail(generation, err);
    }
  }

  /** Starts the next song one crossfade before the current one ends (or now, if it's already late). */
  private async scheduleNext(current: Voice, next: number, ready: AudioBuffer): Promise<void> {
    const generation = this.generation;
    this.loading.add(next); // so the next tick doesn't schedule it twice
    try {
      const planned = current.endClock - current.fadeOut;
      const voice = await this.startVoice(next, ready, 0, planned, current.fadeOut, generation);
      if (!voice) return;
      this.loading.delete(next);
      this.setEnd(voice);
      // How early it was ready: from when it finished decoding to when it was planned to sound
      // (negative if it started late, a gap).
      const late = voice.startClock > planned + 0.01;
      const leadSeconds = late ? planned - voice.startClock : planned - (this.readyAt.get(next) ?? planned);
      this.readyAt.delete(next);
      this.pendingChange = {
        event: { kind: 'change', from: current.index, to: next, leadSeconds, rate: this.rate },
        at: voice.startClock,
      };
    } catch (err) {
      this.fail(generation, err);
    }
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
    voice.live?.stop();
    voice.gain.disconnect();
    this.voices = this.voices.filter((v) => v !== voice);
  }

  /** Silences everything and forgets work in progress (held songs are kept unless the caller clears them). */
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
    const dropouts = readDropouts();
    if (dropouts) event = { ...event, dropoutsSoFar: dropouts.events };
    this.events = [...this.events, event];
    this.emit();
  }

  private audioMb(): number {
    let mb = this.quickPart ? bufferMb(this.quickPart) : 0;
    for (const song of this.held.values()) mb += bufferMb(song);
    for (const voice of this.voices) mb += voice.live?.heldMb(voice.audio.numberOfChannels, voice.audio.sampleRate) ?? 0;
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
      peakLoad: this.meter.peak,
      playedSeconds: this.playedSeconds,
      events: this.events,
    };
  }

  private emit(): void {
    this.snapshot = this.makeSnapshot();
    for (const listener of this.listeners) listener();
  }
}
