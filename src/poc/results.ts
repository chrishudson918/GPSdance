// Proof of concept: the results the test page collects, and the text that
// "Copy all results" puts on the clipboard (pasted into chat or an email).
// Pass/fail limits come from docs/design/tech-stack.md ("Proof of concept").

export type Verdict = 'right' | 'halfDouble' | 'wrong';
export type SoundRating = 'clean' | 'someWarble' | 'bad';

export interface SongResult {
  name: string;
  sizeMb: number;
  lengthSeconds: number;
  /** Detected BPM (rounded), if detection ran. */
  bpm?: number;
  /** Seconds the detection took. */
  bpmSeconds?: number;
  bpmError?: string;
  /** BPM typed in by hand, if known. */
  realBpm?: number;
  /** What the listener said after the click-along. */
  verdict?: Verdict;
}

export interface SpeedResult {
  rate: number;
  seconds: number;
  rating?: SoundRating;
}

/** What the page keeps in memory: whole songs, or only the parts the mix uses (the fallback). */
export type MemoryMode = 'whole' | 'parts';

export interface PocResults {
  device: string;
  memoryMode: MemoryMode;
  songs: SongResult[];
  loadSeconds?: number;
  /** Decoded audio held in memory, in MB (our own estimate). */
  audioMb?: number;
  mixSeconds?: number;
  stutter?: 'none' | 'some';
  /** The tab's memory from Chrome's Task Manager, typed in by the listener. */
  taskManagerMb?: number;
  speedSong?: string;
  speeds: SpeedResult[];
  mp3?: { renderSeconds: number; encodeSeconds: number; sizeMb: number };
  mp3Error?: string;
  notes: string;
}

const LIMITS = {
  loadSeconds: 30,
  memoryMb: 500,
  speedSeconds: 10,
  bpmRight: 8,
  mp3Seconds: 120,
};

const verdictText: Record<Verdict, string> = {
  right: 'right',
  halfDouble: 'half/double',
  wrong: 'wrong',
};

const ratingText: Record<SoundRating, string> = {
  clean: 'clean',
  someWarble: 'some warble',
  bad: 'bad',
};

const s1 = (n: number) => n.toFixed(1);

function passMark(pass: boolean | undefined): string {
  if (pass === undefined) return '';
  return pass ? ' (PASS)' : ' (FAIL)';
}

/** The plain-text summary for the clipboard. */
export function formatPocResults(r: PocResults, build: { version: string; commit: string }, when: Date): string {
  const lines: string[] = [];
  lines.push(`GPSdance proof of concept, tests 1-4 (build ${build.version}, ${build.commit})`);
  lines.push(`When: ${when.toLocaleString('en-US')}`);
  lines.push(`Device: ${r.device}`);
  lines.push('');

  const totalMb = r.songs.reduce((sum, s) => sum + s.sizeMb, 0);
  lines.push(`Songs: ${r.songs.length} picked, ${s1(totalMb)} MB of files`);
  lines.push(`  Kept in memory: ${r.memoryMode === 'parts' ? 'only the parts the mix uses' : 'whole songs'}`);
  if (r.loadSeconds !== undefined) {
    lines.push(
      `  Loaded in ${s1(r.loadSeconds)} s${passMark(r.loadSeconds < LIMITS.loadSeconds)}; audio in memory about ${Math.round(r.audioMb ?? 0)} MB`,
    );
  }
  lines.push('');

  lines.push('Test 1: play the 10-minute mix');
  if (r.mixSeconds !== undefined) lines.push(`  Mix length: ${s1(r.mixSeconds / 60)} min`);
  lines.push(`  Stutter: ${r.stutter ?? 'not answered'}${passMark(r.stutter && r.stutter === 'none')}`);
  lines.push(
    `  Tab memory (Task Manager): ${
      r.taskManagerMb !== undefined ? `${r.taskManagerMb} MB${passMark(r.taskManagerMb < LIMITS.memoryMb)}` : 'not entered'
    }`,
  );
  lines.push('');

  lines.push(`Test 2: speed change${r.speedSong ? ` (${r.speedSong})` : ''}`);
  if (r.speeds.length === 0) lines.push('  Not run');
  for (const sp of r.speeds) {
    const fast = sp.seconds < LIMITS.speedSeconds;
    lines.push(
      `  ${Math.round(sp.rate * 100)}%: ready in ${s1(sp.seconds)} s${passMark(fast)}; sound: ${
        sp.rating ? ratingText[sp.rating] : 'not answered'
      }`,
    );
  }
  lines.push('');

  lines.push('Test 3: BPM');
  const detected = r.songs.filter((s) => s.bpm !== undefined || s.bpmError);
  if (detected.length === 0) lines.push('  Not run');
  for (const s of detected) {
    const found = s.bpmError ? `error: ${s.bpmError}` : `${s.bpm} BPM in ${s1(s.bpmSeconds ?? 0)} s`;
    const real = s.realBpm !== undefined ? `; real ${s.realBpm}` : '';
    const ear = s.verdict ? `; by ear: ${verdictText[s.verdict]}` : '';
    lines.push(`  ${s.name}: ${found}${real}${ear}`);
  }
  const judged = detected.filter((s) => s.verdict);
  if (judged.length > 0) {
    // Half/double counts as fixable by hand (the test plan says so).
    const usable = judged.filter((s) => s.verdict !== 'wrong').length;
    const right = judged.filter((s) => s.verdict === 'right').length;
    lines.push(
      `  Usable (right or half/double): ${usable} of ${judged.length}, right on: ${right}${passMark(
        judged.length >= 10 ? usable >= LIMITS.bpmRight : undefined,
      )}`,
    );
  }
  lines.push('');

  lines.push('Test 4: save the mix as MP3');
  if (r.mp3) {
    const total = r.mp3.renderSeconds + r.mp3.encodeSeconds;
    lines.push(
      `  Done in ${s1(total)} s (mixing ${s1(r.mp3.renderSeconds)} s + MP3 ${s1(r.mp3.encodeSeconds)} s)${passMark(
        total < LIMITS.mp3Seconds,
      )}; ${s1(r.mp3.sizeMb)} MB`,
    );
  } else {
    lines.push(r.mp3Error ? `  Error: ${r.mp3Error}` : '  Not run');
  }

  if (r.notes.trim()) {
    lines.push('');
    lines.push(`Notes: ${r.notes.trim()}`);
  }
  return lines.join('\n');
}
