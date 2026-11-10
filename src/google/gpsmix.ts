// The .gpsmix project file: a zip holding project.json (the edit list) plus copies of the songs.
// One file per project so Drive's own Editor/Viewer sharing and version history just work
// (docs/design/tech-stack.md, "One project = one file").
//
// This is the test 5 version: project.json only holds what the sharing test needs.
// The real edit list (parts, fades, tempo, transitions, markers...) comes with the Editor.

import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

export interface ProjectSong {
  /** The song's file name as it was in Drive. */
  name: string;
  /** Where the song's copy is inside the zip. */
  path: string;
}

export interface Project {
  format: 'gpsmix';
  version: 1;
  title: string;
  songs: ProjectSong[];
  /** How many times the project was saved after it was made (shows that an edit really landed). */
  saves: number;
  lastSavedBy: string;
  lastSavedAt: string;
}

export interface OpenedProject {
  project: Project;
  /** Song bytes by their path inside the zip. */
  songs: Map<string, Uint8Array>;
}

/** Builds the zip. Songs are already compressed (MP3 etc.), so they're stored as they are. */
export function writeGpsmix(project: Project, songs: Map<string, Uint8Array>): Uint8Array {
  const entries: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {
    'project.json': strToU8(JSON.stringify(project, null, 2)),
  };
  for (const [path, bytes] of songs) entries[path] = [bytes, { level: 0 }];
  return zipSync(entries);
}

/** Reads a .gpsmix. Throws a plain-words error if it isn't one. */
export function readGpsmix(bytes: Uint8Array): OpenedProject {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error("This file isn't a GPSdance project (not a zip).");
  }
  const json = files['project.json'];
  if (!json) throw new Error("This file isn't a GPSdance project (no project.json inside).");
  const project = JSON.parse(strFromU8(json)) as Project;
  if (project.format !== 'gpsmix') throw new Error("This file isn't a GPSdance project.");
  const songs = new Map<string, Uint8Array>();
  for (const song of project.songs) {
    const data = files[song.path];
    if (data) songs.set(song.path, data);
  }
  return { project, songs };
}

/** A safe path inside the zip for a song file name. */
export function songPath(index: number, name: string): string {
  return `songs/${index + 1}-${name.replace(/[^\w.\- ]+/g, '_')}`;
}
