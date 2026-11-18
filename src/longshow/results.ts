// Long-show test: what happened during the run, and the text "Copy results" puts on the clipboard.
// Limits from docs/design/player.md and docs/design/tech-stack.md.

import { formatTime } from '../poc/mixPlan';

/** How a song starts after a jump: decode it whole first, or play its first seconds while the rest decodes. */
export type LoadMode = 'whole' | 'quick';

/** What a jump actually did ("wholeFallback": quick start was on, but this file type can't be cut). */
export type JumpMode = 'whole' | 'quick' | 'wholeFallback';

export type ShowEvent =
  /** The next song took over; `leadSeconds` = how early it was ready (negative = late, a gap). */
  | { kind: 'change'; from: number; to: number; leadSeconds: number; rate: number }
  /** A click on a song: seconds from the click to the first sound. */
  | { kind: 'jump'; to: number; seconds: number; rate: number; mode: JumpMode }
  /** Quick start: the whole song took over with `spareSeconds` of the first part left (negative = ran out). */
  | { kind: 'swap'; song: number; spareSeconds: number }
  /** A new speed: seconds from the click until it played again (or was ready, if paused). */
  | { kind: 'speed'; song: number; rate: number; seconds: number; whilePlaying: boolean }
  | { kind: 'end' }
  | { kind: 'error'; text: string };

export const LIMITS = {
  /** Tab memory in Chrome's Task Manager, MB. */
  memoryMb: 500,
  /** Jump to another song at 100% speed: click to sound. */
  jumpSeconds: 1,
  /** Jump at a practice speed, and a speed change: "Getting it ready…" up to this. */
  slowSeconds: 10,
};

export interface ShowSong {
  name: string;
  sizeMb: number;
  /** From the file's own information (read without decoding), if the browser could tell. */
  lengthSeconds?: number;
}

export interface ShowResults {
  device: string;
  /** The page's audio clock rate in Hz (44100 asked for; the browser may refuse). */
  sampleRate?: number;
  songs: ShowSong[];
  events: ShowEvent[];
  /** Most decoded audio held at once, MB (the page's own count). */
  peakAudioMb: number;
  /** Real time spent playing, seconds. */
  playedSeconds: number;
  /** Peak tab memory from Chrome's Task Manager, typed in by the tester. */
  taskManagerMb?: number;
  /** What the listener heard. */
  gaps?: 'none' | 'some';
  notes: string;
}

const s1 = (n: number) => n.toFixed(1);
const pct = (rate: number) => `${Math.round(rate * 100)}%`;

function passMark(pass: boolean | undefined): string {
  if (pass === undefined) return '';
  return pass ? ' (PASS)' : ' (FAIL)';
}

/** The limit a jump is held to: 1 s at 100%, 10 s at a practice speed (decided 2026-11-18). */
export function jumpLimit(rate: number): number {
  return rate === 1 ? LIMITS.jumpSeconds : LIMITS.slowSeconds;
}

const jumpModeText: Record<JumpMode, string> = {
  whole: 'whole song',
  quick: 'quick start',
  wholeFallback: 'whole song (this file type has no quick start)',
};

/** One line for the on-page log and the copied results. `names` are the song file names. */
export function eventText(e: ShowEvent, names: string[]): string {
  const song = (i: number) => `${i + 1} "${names[i] ?? '?'}"`;
  switch (e.kind) {
    case 'change':
      return e.leadSeconds >= 0
        ? `Song ${e.from + 1} → ${e.to + 1}: next song ready ${s1(e.leadSeconds)} s early${e.rate !== 1 ? ` (at ${pct(e.rate)})` : ''}`
        : `Song ${e.from + 1} → ${e.to + 1}: next song LATE by ${s1(-e.leadSeconds)} s (a gap)${e.rate !== 1 ? ` (at ${pct(e.rate)})` : ''}`;
    case 'jump':
      return `Jump to song ${song(e.to)}${e.rate !== 1 ? ` at ${pct(e.rate)}` : ''}: sound in ${s1(e.seconds)} s, ${jumpModeText[e.mode]}`;
    case 'swap':
      return e.spareSeconds >= 0
        ? `Quick start, song ${e.song + 1}: whole song took over with ${s1(e.spareSeconds)} s to spare`
        : `Quick start, song ${e.song + 1}: first part RAN OUT ${s1(-e.spareSeconds)} s before the whole song was ready`;
    case 'speed':
      return `Speed ${pct(e.rate)} on song ${e.song + 1}: ${e.whilePlaying ? 'playing again' : 'ready'} in ${s1(e.seconds)} s`;
    case 'end':
      return 'The show reached its end';
    case 'error':
      return `Error: ${e.text}`;
  }
}

/** The plain-text summary for the clipboard. */
export function formatShowResults(r: ShowResults, build: { version: string; commit: string }, when: Date): string {
  const names = r.songs.map((s) => s.name);
  const lines: string[] = [];
  lines.push(`GPSdance long-show test (build ${build.version}, ${build.commit})`);
  lines.push(`When: ${when.toLocaleString('en-US')}`);
  lines.push(`Device: ${r.device}`);
  if (r.sampleRate) lines.push(`Audio clock: ${r.sampleRate} Hz`);
  lines.push('');

  const totalMb = r.songs.reduce((sum, s) => sum + s.sizeMb, 0);
  const lengths = r.songs.map((s) => s.lengthSeconds);
  const totalLength = lengths.every((l) => l !== undefined) ? lengths.reduce((a, b) => a! + b!, 0)! : undefined;
  lines.push(
    `Songs: ${r.songs.length} picked, ${s1(totalMb)} MB of files${totalLength !== undefined ? `, ${formatTime(totalLength)} in all` : ''}`,
  );

  const changes = r.events.filter((e) => e.kind === 'change');
  const late = changes.filter((e) => e.leadSeconds < 0);
  const needed = Math.max(0, r.songs.length - 1);
  lines.push(`Played: ${s1(r.playedSeconds / 60)} min; song changes: ${changes.length} (a full run has ${needed})`);
  lines.push(`Reached the end: ${r.events.some((e) => e.kind === 'end') ? 'yes' : 'no'}`);
  lines.push(`Audio held in memory: peak ${Math.round(r.peakAudioMb)} MB (the page's own count)`);
  lines.push(
    `Tab memory, peak (Task Manager): ${
      r.taskManagerMb !== undefined ? `${r.taskManagerMb} MB${passMark(r.taskManagerMb < LIMITS.memoryMb)}` : 'not entered'
    }`,
  );
  lines.push(`Gaps or stutter heard: ${r.gaps ?? 'not answered'}${passMark(r.gaps ? r.gaps === 'none' : undefined)}`);
  lines.push('');

  lines.push('Song changes (the next song must be ready before the crossfade)');
  if (changes.length === 0) lines.push('  None yet');
  for (const e of changes) lines.push(`  ${eventText(e, names)}`);
  if (changes.length > 0) lines.push(`  Late: ${late.length}${passMark(late.length === 0)}`);
  lines.push('');

  lines.push(`Jumps (click to first sound; limit ${LIMITS.jumpSeconds} s at 100%, ${LIMITS.slowSeconds} s at a practice speed)`);
  const jumps = r.events.filter((e) => e.kind === 'jump');
  if (jumps.length === 0) lines.push('  None');
  for (const e of jumps) lines.push(`  ${eventText(e, names)}${passMark(e.seconds < jumpLimit(e.rate))}`);
  lines.push('');

  const swaps = r.events.filter((e) => e.kind === 'swap');
  if (swaps.length > 0) {
    lines.push('Quick start (the first part must not run out before the whole song is ready)');
    for (const e of swaps) lines.push(`  ${eventText(e, names)}${passMark(e.spareSeconds >= 0)}`);
    lines.push('');
  }

  lines.push(`Speed changes (limit ${LIMITS.slowSeconds} s)`);
  const speeds = r.events.filter((e) => e.kind === 'speed');
  if (speeds.length === 0) lines.push('  None');
  for (const e of speeds) lines.push(`  ${eventText(e, names)}${passMark(e.seconds < LIMITS.slowSeconds)}`);

  const errors = r.events.filter((e) => e.kind === 'error');
  if (errors.length > 0) {
    lines.push('');
    lines.push('Errors');
    for (const e of errors) lines.push(`  ${eventText(e, names)}`);
  }

  if (r.notes.trim()) {
    lines.push('');
    lines.push(`Notes: ${r.notes.trim()}`);
  }
  return lines.join('\n');
}
