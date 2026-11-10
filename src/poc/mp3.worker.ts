// Proof of concept (test 4): turns the rendered mix into an MP3, off the main page so it stays responsive.
// lamejs is LGPL, so it stays in its own file: Vite bundles this worker (and lamejs with it)
// as a separate script, apart from the rest of the app.

import { Mp3Encoder } from '@breezystack/lamejs';

interface Job {
  left: Float32Array;
  right: Float32Array;
  sampleRate: number;
  kbps: number;
}

/** Web Audio uses -1..1 floats; the encoder wants 16-bit whole numbers. */
function toInt16(samples: Float32Array, from: number, to: number): Int16Array {
  const out = new Int16Array(to - from);
  for (let i = from; i < to; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i - from] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

self.onmessage = (e: MessageEvent<Job>) => {
  try {
    const { left, right, sampleRate, kbps } = e.data;
    const encoder = new Mp3Encoder(2, sampleRate, kbps);
    const chunks: Uint8Array[] = [];
    // The encoder works best in multiples of 1152 samples (one MP3 frame).
    const block = 1152 * 20;
    for (let i = 0; i < left.length; i += block) {
      const end = Math.min(left.length, i + block);
      const data = encoder.encodeBuffer(toInt16(left, i, end), toInt16(right, i, end));
      if (data.length > 0) chunks.push(data);
    }
    const tail = encoder.flush();
    if (tail.length > 0) chunks.push(tail);
    self.postMessage({ mp3: new Blob(chunks as BlobPart[], { type: 'audio/mpeg' }) });
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
};
