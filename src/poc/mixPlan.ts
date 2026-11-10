// Proof of concept (tests 1 and 4): works out the automatic test mix.
//
// There's no editor yet, so the test mix is built from the picked songs:
// up to 8 songs, about 75 seconds of each (starting 30 seconds in, past most intros),
// joined with 3-second crossfades. That makes a mix of about 10 minutes,
// the length of a long dance show. Plain numbers in, plain numbers out, so it can be tested.

export const MIX_SONG_COUNT = 8;
export const PART_SECONDS = 75;
export const SKIP_INTRO_SECONDS = 30;
export const CROSSFADE_SECONDS = 3;

export interface MixPart {
  /** Index into the list of loaded songs. */
  song: number;
  /** Where the part starts inside the song, in seconds. */
  from: number;
  /** How long the part is, in seconds. */
  length: number;
  /** When the part starts in the mix, in seconds. */
  at: number;
  /** Fade-in length at its start (0 for the first part). */
  fadeIn: number;
  /** Fade-out length at its end (the last part fades out too, so the mix doesn't stop abruptly). */
  fadeOut: number;
}

export interface MixPlan {
  parts: MixPart[];
  /** Total mix length in seconds. */
  length: number;
}

/** Builds the mix plan from each song's length in seconds. */
export function planMix(songLengths: number[]): MixPlan {
  const parts: MixPart[] = [];
  let at = 0;
  const count = Math.min(MIX_SONG_COUNT, songLengths.length);

  for (let song = 0; song < count; song++) {
    const songLength = songLengths[song];
    // Skip the intro when the song is long enough; otherwise take its last 75 s (or all of it).
    const from =
      songLength >= SKIP_INTRO_SECONDS + PART_SECONDS
        ? SKIP_INTRO_SECONDS
        : Math.max(0, songLength - PART_SECONDS);
    const length = Math.min(PART_SECONDS, songLength - from);
    const first = song === 0;
    // A fade can't be longer than half the part, or the fade-in and fade-out would overlap.
    const fade = Math.min(CROSSFADE_SECONDS, length / 2);

    // Each part starts one crossfade before the previous one ends, so they overlap.
    if (!first) at -= fade;
    parts.push({ song, from, length, at, fadeIn: first ? 0 : fade, fadeOut: fade });
    at += length;
  }

  return { parts, length: at };
}

/** Which part is playing at a moment in the mix (the newer one during a crossfade). */
export function partAt(plan: MixPlan, time: number): number {
  let index = 0;
  plan.parts.forEach((p, i) => {
    if (time >= p.at) index = i;
  });
  return index;
}

/** 125.4 → "2:05". */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
