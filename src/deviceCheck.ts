// "Will it work on this computer?" checks for the starter page.
//
// The checks read from a plain `DeviceInfo` object instead of `window` directly,
// so the tests can feed in a pretend Chromebook, Windows PC, etc.

export type CheckStatus = 'ok' | 'warn' | 'fail';

export interface CheckResult {
  /** Short label shown on screen, e.g. "Audio playback (Web Audio)". */
  label: string;
  status: CheckStatus;
  /** Extra detail shown after the label, e.g. "Chrome 131 on ChromeOS". */
  detail?: string;
}

export interface DeviceInfo {
  userAgent: string;
  /** navigator.userAgentData brands, when the browser offers them (Chrome does). */
  brands?: { brand: string; version: string }[];
  /** navigator.deviceMemory in GB. Chrome rounds it and caps it at 8. */
  deviceMemoryGb?: number;
  hasAudioContext: boolean;
  hasOfflineAudioContext: boolean;
  /** True if the browser can load a small WebAssembly module. */
  wasmWorks: boolean;
  /** The address the page was loaded from, e.g. "chrishudson918.github.io". */
  host: string;
}

/** The app needs at least this much memory for long mixes (see docs/design/tech-stack.md). */
const MIN_MEMORY_GB = 4;

function browserName(info: DeviceInfo): { name: string; version?: string; chromium: boolean } {
  const brands = info.brands ?? [];
  const pick = (name: string) => brands.find((b) => b.brand === name);
  const edge = pick('Microsoft Edge');
  if (edge) return { name: 'Edge', version: edge.version, chromium: true };
  const chrome = pick('Google Chrome');
  if (chrome) return { name: 'Chrome', version: chrome.version, chromium: true };

  // No brands (Firefox, Safari, older Chrome): fall back to the user-agent text.
  const ua = info.userAgent;
  const match = (re: RegExp) => ua.match(re)?.[1];
  if (/Edg\//.test(ua)) return { name: 'Edge', version: match(/Edg\/(\d+)/), chromium: true };
  if (/Firefox\//.test(ua)) return { name: 'Firefox', version: match(/Firefox\/(\d+)/), chromium: false };
  if (/Chrome\//.test(ua)) return { name: 'Chrome', version: match(/Chrome\/(\d+)/), chromium: true };
  if (/Safari\//.test(ua)) return { name: 'Safari', version: match(/Version\/(\d+)/), chromium: false };
  return { name: 'Unknown browser', chromium: false };
}

function osName(userAgent: string): string | undefined {
  if (/CrOS/.test(userAgent)) return 'ChromeOS';
  if (/Windows/.test(userAgent)) return 'Windows';
  if (/Mac OS X/.test(userAgent)) return 'Mac';
  if (/Android/.test(userAgent)) return 'Android';
  if (/iPhone|iPad/.test(userAgent)) return 'iOS';
  if (/Linux/.test(userAgent)) return 'Linux';
  return undefined;
}

export function runChecks(info: DeviceInfo): CheckResult[] {
  const browser = browserName(info);
  const os = osName(info.userAgent);
  const browserText = [browser.name, browser.version].filter(Boolean).join(' ');

  const results: CheckResult[] = [];

  results.push({
    label: 'Browser',
    // The app is built and tested for Chrome (Chromebooks and district PCs).
    status: browser.chromium ? 'ok' : 'warn',
    detail: (os ? `${browserText} on ${os}` : browserText) + (browser.chromium ? '' : ' (use Chrome)'),
  });

  const mem = info.deviceMemoryGb;
  results.push({
    label: 'Memory',
    status: mem === undefined ? 'warn' : mem >= MIN_MEMORY_GB ? 'ok' : 'warn',
    detail:
      mem === undefined
        ? "this browser doesn't say"
        : mem >= 8
          ? 'about 8 GB or more'
          : `about ${mem} GB${mem < MIN_MEMORY_GB ? ' (long mixes may struggle)' : ''}`,
  });

  results.push({
    label: 'Audio playback (Web Audio)',
    status: info.hasAudioContext && info.hasOfflineAudioContext ? 'ok' : 'fail',
    detail: info.hasAudioContext && info.hasOfflineAudioContext ? undefined : 'not available',
  });

  results.push({
    label: 'Fast audio processing (WASM)',
    status: info.wasmWorks ? 'ok' : 'fail',
    detail: info.wasmWorks ? undefined : 'not available',
  });

  // If this code is running at all, the page got past the web filter.
  results.push({
    label: 'Page reached past the filter',
    status: 'ok',
    detail: info.host,
  });

  return results;
}

const STATUS_MARK: Record<CheckStatus, string> = { ok: '✓', warn: '!', fail: '✗' };

export function statusMark(status: CheckStatus): string {
  return STATUS_MARK[status];
}

/** Plain-text results for the "Copy these results" button (pasted into email or chat). */
export function formatResults(
  results: CheckResult[],
  build: { version: string; commit: string; date: string },
  checkedAt: Date,
): string {
  const lines = [
    `GPSdance device check, build ${build.version} (${build.commit}, built ${build.date.slice(0, 10)})`,
    `Checked ${checkedAt.toISOString().replace('T', ' ').slice(0, 16)} UTC`,
    '',
    ...results.map((r) => `${statusMark(r.status)} ${r.label}${r.detail ? `: ${r.detail}` : ''}`),
  ];
  return lines.join('\n');
}

/** The smallest valid WebAssembly module: the magic number and version 1. */
const EMPTY_WASM_MODULE = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

/** Reads the real browser. Only used on the page itself, not in tests. */
export function readDeviceInfo(): DeviceInfo {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    userAgentData?: { brands: { brand: string; version: string }[] };
  };
  let wasmWorks = false;
  try {
    wasmWorks = typeof WebAssembly === 'object' && WebAssembly.validate(EMPTY_WASM_MODULE);
  } catch {
    wasmWorks = false;
  }
  return {
    userAgent: nav.userAgent,
    brands: nav.userAgentData?.brands,
    deviceMemoryGb: nav.deviceMemory,
    hasAudioContext: typeof AudioContext === 'function',
    hasOfflineAudioContext: typeof OfflineAudioContext === 'function',
    wasmWorks,
    host: location.host,
  };
}
