import { describe, expect, it } from 'vitest';
import { formatResults, runChecks, type DeviceInfo } from './deviceCheck';

const CHROMEBOOK_UA =
  'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const FIREFOX_WINDOWS_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0';

const chromebook: DeviceInfo = {
  userAgent: CHROMEBOOK_UA,
  brands: [
    { brand: 'Not_A Brand', version: '24' },
    { brand: 'Chromium', version: '131' },
    { brand: 'Google Chrome', version: '131' },
  ],
  deviceMemoryGb: 4,
  hasAudioContext: true,
  hasOfflineAudioContext: true,
  wasmWorks: true,
  host: 'chrishudson918.github.io',
};

const byLabel = (info: DeviceInfo, label: string) => runChecks(info).find((r) => r.label === label);

describe('runChecks', () => {
  it('passes everything on a 4 GB Chromebook', () => {
    const results = runChecks(chromebook);
    expect(results.every((r) => r.status === 'ok')).toBe(true);
    expect(byLabel(chromebook, 'Browser')?.detail).toBe('Chrome 131 on ChromeOS');
    expect(byLabel(chromebook, 'Memory')?.detail).toBe('about 4 GB');
  });

  it('warns on low memory', () => {
    const r = byLabel({ ...chromebook, deviceMemoryGb: 2 }, 'Memory');
    expect(r?.status).toBe('warn');
    expect(r?.detail).toContain('may struggle');
  });

  it('says "8 GB or more" because Chrome caps the number at 8', () => {
    expect(byLabel({ ...chromebook, deviceMemoryGb: 8 }, 'Memory')?.detail).toBe('about 8 GB or more');
  });

  it('warns when the browser does not report memory', () => {
    expect(byLabel({ ...chromebook, deviceMemoryGb: undefined }, 'Memory')?.status).toBe('warn');
  });

  it('warns on a non-Chrome browser, using the user-agent text', () => {
    const firefox: DeviceInfo = { ...chromebook, userAgent: FIREFOX_WINDOWS_UA, brands: undefined };
    const r = byLabel(firefox, 'Browser');
    expect(r?.status).toBe('warn');
    expect(r?.detail).toBe('Firefox 132 on Windows (use Chrome)');
  });

  it('fails when Web Audio or WASM is missing', () => {
    const bare = { ...chromebook, hasOfflineAudioContext: false, wasmWorks: false };
    expect(byLabel(bare, 'Audio playback (Web Audio)')?.status).toBe('fail');
    expect(byLabel(bare, 'Fast audio processing (WASM)')?.status).toBe('fail');
  });
});

describe('formatResults', () => {
  it('makes plain text to paste into an email', () => {
    const text = formatResults(
      runChecks(chromebook),
      { version: '0.0.1', commit: 'abc1234', date: '2026-11-05T20:00:00.000Z' },
      new Date('2026-11-06T15:30:00Z'),
    );
    expect(text).toBe(
      [
        'GPSdance device check, build 0.0.1 (abc1234, built 2026-11-05)',
        'Checked 2026-11-06 15:30 UTC',
        '',
        '✓ Browser: Chrome 131 on ChromeOS',
        '✓ Memory: about 4 GB',
        '✓ Audio playback (Web Audio)',
        '✓ Fast audio processing (WASM)',
        '✓ Page reached past the filter: chrishudson918.github.io',
      ].join('\n'),
    );
  });
});
