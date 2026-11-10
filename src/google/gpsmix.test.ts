import { describe, expect, it } from 'vitest';
import { readGpsmix, songPath, writeGpsmix, type Project } from './gpsmix';
import { strToU8, zipSync } from 'fflate';

const project: Project = {
  format: 'gpsmix',
  version: 1,
  title: 'Test',
  songs: [{ name: 'Song: one?.mp3', path: songPath(0, 'Song: one?.mp3') }],
  saves: 0,
  lastSavedBy: 'a@example.com',
  lastSavedAt: '2026-11-10T00:00:00.000Z',
};

describe('gpsmix', () => {
  it('keeps the project and song bytes through a save and open', () => {
    const song = new Uint8Array([1, 2, 3, 250]);
    const opened = readGpsmix(writeGpsmix(project, new Map([[project.songs[0].path, song]])));
    expect(opened.project).toEqual(project);
    expect(opened.songs.get(project.songs[0].path)).toEqual(song);
  });

  it('makes zip-safe song paths', () => {
    expect(songPath(0, 'Song: one?.mp3')).toBe('songs/1-Song_ one_.mp3');
  });

  it('says plainly when a file is not a project', () => {
    expect(() => readGpsmix(new Uint8Array([1, 2, 3]))).toThrow(/not a zip/);
    expect(() => readGpsmix(zipSync({ 'a.txt': strToU8('hi') }))).toThrow(/no project.json/);
  });
});
