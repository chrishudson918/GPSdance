import { describe, expect, it } from 'vitest';
import {
  chunkKind,
  id3v2Size,
  mp3ChunkLength,
  patchWavHeader,
  readWavLayout,
  wavChunkDataBytes,
} from './chunks';
import { formatShowResults, type ShowResults } from './results';
import {
  copyOffset,
  CROSSFADE_SECONDS,
  endClock,
  fadeLength,
  hasSound,
  mayLoadNext,
  songTimeAt,
  songToLoad,
} from './showPlan';

describe('showPlan', () => {
  it('tracks the song position at any speed', () => {
    const a = { anchorClock: 10, anchorSong: 30, rate: 0.5 };
    expect(songTimeAt(a, 10)).toBe(30);
    expect(songTimeAt(a, 14)).toBe(32); // 4 real seconds at 50% = 2 song seconds
    expect(endClock(a, 60)).toBe(70); // 30 song seconds left take 60 real seconds
  });

  it('reads a slowed copy made from the playhead at the right spot', () => {
    expect(copyOffset(30, 30, 0.5)).toBe(0);
    expect(copyOffset(40, 30, 0.5)).toBe(20);
    expect(copyOffset(12, 0, 1)).toBe(12);
  });

  it('keeps crossfades to 3 s, or half a very short song', () => {
    expect(fadeLength(200)).toBe(CROSSFADE_SECONDS);
    expect(fadeLength(4)).toBe(2);
  });

  it('waits after a jump before loading the next song, unless the end is near', () => {
    expect(mayLoadNext(105, 115, 300)).toBe(false); // 10 s after a jump
    expect(mayLoadNext(115, 115, 300)).toBe(true);
    expect(mayLoadNext(105, 115, Infinity)).toBe(false); // quick start: length not known yet
    expect(mayLoadNext(105, 115, 130)).toBe(true); // a short song: load now so it isn't late
  });

  it('holds only the playing song and the next', () => {
    expect(songToLoad(0, 1, 10)).toBe(1);
    expect(songToLoad(3, 2, 10)).toBeNull(); // mid-crossfade: let the old song go first
    expect(songToLoad(9, 1, 10)).toBeNull(); // last song
  });
});

describe('quick start chunks', () => {
  it('knows which files can be cut', () => {
    expect(chunkKind('01 Opener.MP3', '')).toBe('mp3');
    expect(chunkKind('x', 'audio/mpeg')).toBe('mp3');
    expect(chunkKind('song.wav', '')).toBe('wav');
    expect(chunkKind('song.m4a', 'audio/mp4')).toBeNull();
  });

  it('skips past an ID3 tag (album art) before counting audio bytes', () => {
    // Tag of 1000 bytes: syncsafe 1000 = 0x07 0x68.
    const head = new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0x07, 0x68]);
    expect(id3v2Size(head)).toBe(1010);
    expect(id3v2Size(new Uint8Array([0xff, 0xfb, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(0);
    expect(mp3ChunkLength(head, 10_000_000, 12)).toBe(1010 + 12 * 40_000);
    expect(mp3ChunkLength(head, 5000, 12)).toBe(5000); // never past the end
  });

  it('cuts a WAV on whole frames and fixes its header', () => {
    const wav = makeWav(48000, 2, 3); // 3 s of 16-bit stereo
    const layout = readWavLayout(wav)!;
    expect(layout).toMatchObject({ dataOffset: 44, byteRate: 192000, blockAlign: 4, dataLength: 576000 });

    const dataBytes = wavChunkDataBytes(layout, wav.length, 1.00001);
    expect(dataBytes).toBe(192000);
    const cut = wav.slice(0, layout.dataOffset + dataBytes);
    patchWavHeader(cut, layout, dataBytes);
    const view = new DataView(cut.buffer);
    expect(view.getUint32(4, true)).toBe(cut.length - 8);
    expect(view.getUint32(40, true)).toBe(192000);
    // Asking for more than the file has gives the whole file.
    expect(wavChunkDataBytes(layout, wav.length, 60)).toBe(576000);
  });

  it('rejects files that are not WAV', () => {
    expect(readWavLayout(new Uint8Array(64))).toBeNull();
  });
});

describe('formatShowResults', () => {
  const base: ShowResults = {
    device: 'Chrome 148, memory 4 GB',
    songs: Array.from({ length: 3 }, (_, i) => ({ name: `song${i + 1}.mp3`, sizeMb: 4, lengthSeconds: 180 })),
    events: [],
    peakAudioMb: 150,
    playedSeconds: 540,
    notes: '',
  };
  const build = { version: '0.0.1', commit: 'abc1234' };

  it('passes a clean run', () => {
    const text = formatShowResults(
      {
        ...base,
        taskManagerMb: 320,
        gaps: 'none',
        events: [
          { kind: 'jump', to: 0, seconds: 0.4, rate: 1, mode: 'quick' },
          { kind: 'swap', song: 0, spareSeconds: 9 },
          { kind: 'change', from: 0, to: 1, leadSeconds: 170, rate: 1 },
          { kind: 'speed', song: 1, rate: 0.75, seconds: 4.2, whilePlaying: true },
          { kind: 'change', from: 1, to: 2, leadSeconds: 150, rate: 0.75 },
          { kind: 'end' },
        ],
      },
      build,
      new Date(2026, 10, 18),
    );
    expect(text).not.toContain('Audio clock');
    expect(text).toContain('9:00 in all');
    expect(text).toContain('song changes: 2 (a full run has 2)');
    expect(text).toContain('Reached the end: yes');
    expect(text).toContain('320 MB (PASS)');
    expect(text).toContain('Late: 0 (PASS)');
    expect(text).toContain('sound in 0.4 s, quick start (PASS)');
    expect(text).toContain('9.0 s to spare (PASS)');
    expect(text).toContain('playing again in 4.2 s (PASS)');
    expect(text).not.toContain('FAIL');
  });

  it('fails late songs, slow jumps and too much memory', () => {
    const text = formatShowResults(
      {
        ...base,
        taskManagerMb: 620,
        events: [
          { kind: 'jump', to: 2, seconds: 1.8, rate: 1, mode: 'whole' },
          { kind: 'jump', to: 1, seconds: 6, rate: 0.5, mode: 'whole' }, // practice speed: 10 s limit
          { kind: 'change', from: 1, to: 2, leadSeconds: -1.5, rate: 1 },
        ],
      },
      build,
      new Date(2026, 10, 18),
    );
    expect(text).toContain('620 MB (FAIL)');
    expect(text).toContain('sound in 1.8 s, whole song (FAIL)');
    expect(text).toContain('at 50%: sound in 6.0 s, whole song (PASS)');
    expect(text).toContain('LATE by 1.5 s');
    expect(text).toContain('Late: 1 (FAIL)');
  });

  it('lists slowed copies that came out silent', () => {
    const clean = formatShowResults(
      { ...base, events: [{ kind: 'slowCopy', song: 0, rate: 0.75, silent: false }] },
      build,
      new Date(2026, 10, 19),
    );
    expect(clean).toContain('1 made, 0 silent (PASS)');

    const text = formatShowResults(
      {
        ...base,
        events: [
          { kind: 'slowCopy', song: 0, rate: 0.75, silent: false },
          { kind: 'slowCopy', song: 1, rate: 0.75, silent: true },
        ],
      },
      build,
      new Date(2026, 10, 19),
    );
    expect(text).toContain('2 made, 1 silent (FAIL)');
    expect(text).toContain('Slowed copy of song 2 "song2.mp3" at 75%: SILENT (no sound)');
    expect(text).not.toContain('song 1 "song1.mp3" at 75%');
  });

  it('leaves out the slowed-copies section when none were made', () => {
    expect(formatShowResults(base, build, new Date(2026, 10, 19))).not.toContain('Slowed copies');
  });
});

describe('hasSound', () => {
  it('tells silence from music', () => {
    expect(hasSound([new Float32Array(1000)])).toBe(false);
    expect(hasSound([new Float32Array(1000).fill(0.0005)])).toBe(false); // below the silence level
    const right = new Float32Array(1000);
    right[999] = 0.2;
    expect(hasSound([new Float32Array(1000), right])).toBe(true); // sound on one channel is enough
  });
});

/** A silent 16-bit PCM WAV file. */
function makeWav(sampleRate: number, channels: number, seconds: number): Uint8Array {
  const blockAlign = channels * 2;
  const dataBytes = sampleRate * seconds * blockAlign;
  const bytes = new Uint8Array(44 + dataBytes);
  const view = new DataView(bytes.buffer);
  const text = (at: number, s: string) => [...s].forEach((c, i) => (bytes[at + i] = c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, dataBytes, true);
  return bytes;
}
