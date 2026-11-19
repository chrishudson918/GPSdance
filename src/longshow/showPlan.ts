// Long-show test: the timing rules, as plain numbers so they can be tested.
//
// A playing song is pinned to the audio clock by an "anchor": at clock time `anchorClock`
// the song was at `anchorSong` seconds (in the original song's own time), and it moves at `rate`
// (0.75 = 75% speed). Everything else follows from that.

/** Crossfade between songs, in real seconds. */
export const CROSSFADE_SECONDS = 3;

export interface Anchor {
  anchorClock: number;
  anchorSong: number;
  rate: number;
}

/** Where the song is (original-song seconds) at a moment on the audio clock. */
export function songTimeAt(a: Anchor, clock: number): number {
  return a.anchorSong + (clock - a.anchorClock) * a.rate;
}

/** The audio-clock moment the song reaches its end. */
export function endClock(a: Anchor, duration: number): number {
  return a.anchorClock + (duration - a.anchorSong) / a.rate;
}

/**
 * Where to start reading in a held copy of the song. Slowed copies may start partway in
 * (`copyFrom`, made from the playhead), and are stretched by 1/rate.
 */
export function copyOffset(songTime: number, copyFrom: number, rate: number): number {
  return Math.max(0, (songTime - copyFrom) / rate);
}

/** Crossfade length for a song with `realSeconds` left to play: never more than half of it. */
export function fadeLength(realSeconds: number): number {
  return Math.max(0, Math.min(CROSSFADE_SECONDS, realSeconds / 2));
}

/**
 * After a jump, speed change or resume, wait this long before loading the next song.
 * Loading right away stacked two decodes on top of songs Chrome hadn't freed yet:
 * the tab peaked at about 686 MB on the Dell 3120 (2026-11-18), while steady play stayed fine.
 */
export const NEXT_LOAD_DELAY_SECONDS = 15;

/** Never wait so long that the next song could be late: start loading by this long before the end. */
export const NEXT_LOAD_DEADLINE_SECONDS = 30;

/** Whether loading the next song may start now (`holdUntil` = clock time set by a jump; end may be Infinity). */
export function mayLoadNext(now: number, holdUntil: number, end: number): boolean {
  return now >= holdUntil || end - now < NEXT_LOAD_DEADLINE_SECONDS;
}

/** Quieter than this everywhere counts as no sound (about -60 dB). */
export const SILENCE_LEVEL = 0.001;

/**
 * Whether any channel has a sample louder than silence. Used to catch slowed copies that come out
 * silent: on the Dell 3120 (2026-11-19) some songs at 75% played with the timer moving but no sound.
 */
export function hasSound(channels: Float32Array[]): boolean {
  for (const samples of channels) {
    for (let i = 0; i < samples.length; i++) {
      if (Math.abs(samples[i]) > SILENCE_LEVEL) return true;
    }
  }
  return false;
}

/**
 * Which song to load next, or null. The rule being tested: hold only the playing song and the next.
 * While two songs are still sounding (a crossfade), nothing new loads; the old one is let go first.
 */
export function songToLoad(current: number, songsSounding: number, songCount: number): number | null {
  if (songsSounding !== 1) return null;
  return current + 1 < songCount ? current + 1 : null;
}
