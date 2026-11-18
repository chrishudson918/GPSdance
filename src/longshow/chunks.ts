// Long-show test: "quick start" reads only the first few seconds of a song file, so it can start
// playing before the whole song is decoded (decoding a whole song on a Chromebook takes 1-3 s).
// Works for MP3 (frames can be cut anywhere) and WAV (the header is rewritten for the shorter data).
// M4A can't be cut this way (its index is often at the end of the file), so it falls back to whole song.

export type ChunkKind = 'mp3' | 'wav';

/** How many seconds of music quick start aims for (at least; low-bitrate MP3s give more). */
export const QUICK_START_SECONDS = 12;

/** The highest common MP3 bitrate, 320 kbps, in bytes per second: cutting at this gives at least the target. */
const MAX_MP3_BYTES_PER_SECOND = 320_000 / 8;

/** Which kind of quick start a file allows, or null if it must be decoded whole. */
export function chunkKind(name: string, type: string): ChunkKind | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.mp3') || type === 'audio/mpeg' || type === 'audio/mp3') return 'mp3';
  if (lower.endsWith('.wav') || /^audio\/(wav|x-wav|wave|vnd\.wave)$/.test(type)) return 'wav';
  return null;
}

/**
 * Bytes taken by the ID3v2 tag at the start of an MP3 (title, artist, often album art,
 * which can be hundreds of KB), or 0 if there is none. Needs the file's first 10 bytes.
 */
export function id3v2Size(head: Uint8Array): number {
  if (head.length < 10 || head[0] !== 0x49 || head[1] !== 0x44 || head[2] !== 0x33) return 0; // "ID3"
  // The size is "syncsafe": 4 bytes of 7 bits each.
  const size = ((head[6] & 0x7f) << 21) | ((head[7] & 0x7f) << 14) | ((head[8] & 0x7f) << 7) | (head[9] & 0x7f);
  const footer = head[5] & 0x10 ? 10 : 0;
  return 10 + size + footer;
}

/** How many bytes from the start of an MP3 hold at least `seconds` of music. */
export function mp3ChunkLength(head: Uint8Array, fileSize: number, seconds = QUICK_START_SECONDS): number {
  return Math.min(fileSize, id3v2Size(head) + Math.ceil(seconds * MAX_MP3_BYTES_PER_SECOND));
}

/** Where a WAV file's samples are and how they're packed. */
export interface WavLayout {
  /** Byte where the samples start (just after the "data" chunk's 8-byte header). */
  dataOffset: number;
  /** Bytes of samples the header says there are. */
  dataLength: number;
  /** Bytes per second of audio. */
  byteRate: number;
  /** Bytes per sample frame (all channels); cuts must land on a multiple of this. */
  blockAlign: number;
}

/** Reads a WAV header from the start of the file, or null if it isn't one we understand. */
export function readWavLayout(head: Uint8Array): WavLayout | null {
  const view = new DataView(head.buffer, head.byteOffset, head.byteLength);
  const text = (at: number) => String.fromCharCode(...head.subarray(at, at + 4));
  if (head.length < 12 || text(0) !== 'RIFF' || text(8) !== 'WAVE') return null;

  let byteRate = 0;
  let blockAlign = 0;
  let pos = 12;
  while (pos + 8 <= head.length) {
    const id = text(pos);
    const size = view.getUint32(pos + 4, true);
    if (id === 'fmt ' && pos + 8 + 14 <= head.length) {
      byteRate = view.getUint32(pos + 8 + 8, true);
      blockAlign = view.getUint16(pos + 8 + 12, true);
    }
    if (id === 'data') {
      return byteRate > 0 && blockAlign > 0 ? { dataOffset: pos + 8, dataLength: size, byteRate, blockAlign } : null;
    }
    pos += 8 + size + (size & 1); // chunks are padded to an even length
  }
  return null;
}

/** Bytes of samples to take for `seconds` of music, cut on a whole sample frame. */
export function wavChunkDataBytes(layout: WavLayout, fileSize: number, seconds = QUICK_START_SECONDS): number {
  const wanted = Math.floor((seconds * layout.byteRate) / layout.blockAlign) * layout.blockAlign;
  const available = Math.floor((fileSize - layout.dataOffset) / layout.blockAlign) * layout.blockAlign;
  return Math.max(0, Math.min(wanted, available, layout.dataLength));
}

/** Rewrites the sizes in a cut-down WAV's header so the decoder accepts it. */
export function patchWavHeader(bytes: Uint8Array, layout: WavLayout, dataBytes: number): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  view.setUint32(4, bytes.length - 8, true);
  view.setUint32(layout.dataOffset - 4, dataBytes, true);
}

/** The first few seconds of a song file, ready to decode, or null if this file can't be cut. */
export async function readQuickChunk(file: File): Promise<ArrayBuffer | null> {
  const kind = chunkKind(file.name, file.type);
  if (!kind) return null;
  const head = new Uint8Array(await file.slice(0, 64 * 1024).arrayBuffer());
  if (kind === 'mp3') return file.slice(0, mp3ChunkLength(head, file.size)).arrayBuffer();

  const layout = readWavLayout(head);
  if (!layout) return null;
  const dataBytes = wavChunkDataBytes(layout, file.size);
  const bytes = new Uint8Array(await file.slice(0, layout.dataOffset + dataBytes).arrayBuffer());
  patchWavHeader(bytes, layout, dataBytes);
  return bytes.buffer;
}
