import { describe, expect, it } from 'vitest';
import { CROSSFADE_SECONDS, formatTime, partAt, planMix } from './mixPlan';
import { formatPocResults, type PocResults } from './results';

describe('planMix', () => {
  it('takes 75 s from 30 s into each of 8 long songs, about 10 minutes in all', () => {
    const plan = planMix(Array(10).fill(200));
    expect(plan.parts).toHaveLength(8);
    expect(plan.parts[0]).toMatchObject({ song: 0, from: 30, length: 75, at: 0, fadeIn: 0 });
    // Each part overlaps the one before by one crossfade.
    expect(plan.parts[1].at).toBe(75 - CROSSFADE_SECONDS);
    expect(plan.length).toBe(8 * 75 - 7 * CROSSFADE_SECONDS);
    expect(plan.length / 60).toBeGreaterThan(9.5);
  });

  it('handles short songs without reading past their end', () => {
    const plan = planMix([60, 4]);
    expect(plan.parts[0]).toMatchObject({ from: 0, length: 60 });
    expect(plan.parts[1]).toMatchObject({ from: 0, length: 4, fadeIn: 2, fadeOut: 2 });
    for (const p of plan.parts) expect(p.from + p.length).toBeLessThanOrEqual([60, 4][p.song]);
  });

  it('is empty with no songs', () => {
    expect(planMix([])).toEqual({ parts: [], length: 0 });
  });

  it('knows which part is playing', () => {
    const plan = planMix([200, 200, 200]);
    expect(partAt(plan, 0)).toBe(0);
    expect(partAt(plan, 73)).toBe(1);
    expect(partAt(plan, 500)).toBe(2);
  });
});

describe('formatTime', () => {
  it('shows minutes and seconds', () => {
    expect(formatTime(125.4)).toBe('2:05');
    expect(formatTime(0)).toBe('0:00');
  });
});

describe('formatPocResults', () => {
  const base: PocResults = {
    device: 'Chrome 148 on ChromeOS',
    memoryMode: 'whole',
    songs: [],
    speeds: [],
    notes: '',
  };
  const build = { version: '0.0.1', commit: 'abc1234' };
  const when = new Date('2026-11-10T10:00:00');

  it('says "Not run" for tests that did not run', () => {
    const text = formatPocResults(base, build, when);
    expect(text).toContain('Test 2: speed change\n  Not run');
    expect(text).toContain('Test 4: save the mix as MP3\n  Not run');
    expect(text).toContain('Kept in memory: whole songs');
    expect(formatPocResults({ ...base, memoryMode: 'parts' }, build, when)).toContain(
      'Kept in memory: only the parts the mix uses',
    );
  });

  it('marks pass and fail against the test plan limits', () => {
    const songs = Array.from({ length: 10 }, (_, i) => ({
      name: `Song ${i + 1}`,
      sizeMb: 4,
      lengthSeconds: 200,
      bpm: 120,
      bpmSeconds: 1,
      verdict: i < 7 ? ('right' as const) : i < 8 ? ('halfDouble' as const) : ('wrong' as const),
    }));
    const text = formatPocResults(
      {
        ...base,
        songs,
        loadSeconds: 12,
        audioMb: 410,
        stutter: 'none',
        taskManagerMb: 620,
        speeds: [{ rate: 0.9, seconds: 4.2, rating: 'clean' }],
        mp3: { renderSeconds: 30, encodeSeconds: 100, sizeMb: 13.8 },
        notes: ' sounded fine ',
      },
      build,
      when,
    );
    expect(text).toContain('Loaded in 12.0 s (PASS)');
    expect(text).toContain('Stutter: none (PASS)');
    expect(text).toContain('620 MB (FAIL)');
    expect(text).toContain('90%: ready in 4.2 s (PASS); sound: clean');
    expect(text).toContain('Usable (right or half/double): 8 of 10, right on: 7 (PASS)');
    expect(text).toContain('Done in 130.0 s (mixing 30.0 s + MP3 100.0 s) (FAIL)');
    expect(text).toContain('Notes: sounded fine');
  });
});
