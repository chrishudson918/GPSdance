// Long-show memory test (docs/STATUS.md "Next", docs/design/player.md): play a ~30-minute show of
// 10 whole songs while holding only the playing song and the next one in memory.
// A test bench, not the real Player. Songs are picked from the computer and stay there.

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { readDeviceInfo, runChecks } from '../deviceCheck';
import { formatTime } from '../poc/mixPlan';
import { audioContext } from '../poc/audio';
import { readDropouts, ShowPlayer } from './engine';
import {
  dropoutsText,
  eventText,
  formatShowResults,
  jumpLimit,
  LIMITS,
  type LoadMode,
  type ShowEvent,
  type ShowSong,
} from './results';
import { QUICK_START_SECONDS } from './chunks';

const build = __BUILD_INFO__;
/** The Player's practice-speed presets (docs/design/player.md). */
const SPEEDS = [0.5, 0.6, 0.75, 0.9, 1];

function deviceText(): string {
  const [browser, memory] = runChecks(readDeviceInfo());
  return `${browser.detail}, memory ${memory.detail}`;
}

/** A song's length from the file's own information, without decoding it (cheap; for the song list only). */
function readLength(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (length?: number) => {
      URL.revokeObjectURL(url);
      audio.removeAttribute('src');
      resolve(length !== undefined && Number.isFinite(length) ? length : undefined);
    };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => done(audio.duration);
    audio.onerror = () => done(undefined);
    audio.src = url;
  });
}

/** A small row of choice buttons; the picked one is marked. */
function Choice<T extends string>(props: {
  label: string;
  options: [T, string][];
  value?: T;
  disabled?: boolean;
  onChange: (v: T) => void;
}) {
  return (
    <div className="choice">
      <span>{props.label}</span>
      {props.options.map(([value, text]) => (
        <button
          key={value}
          type="button"
          className={`small-button${props.value === value ? ' picked' : ''}`}
          aria-pressed={props.value === value}
          disabled={props.disabled}
          onClick={() => props.onChange(value)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export default function LongShowApp() {
  const player = useRef<ShowPlayer>(null);
  player.current ??= new ShowPlayer();
  const show = player.current;
  const snap = useSyncExternalStore(
    (listener) => show.subscribe(listener),
    () => show.getSnapshot(),
  );

  const [songs, setSongs] = useState<ShowSong[]>([]);
  const [loadMode, setLoadMode] = useState<LoadMode>('whole');
  const [taskManagerMb, setTaskManagerMb] = useState<number | undefined>();
  const [gaps, setGaps] = useState<'none' | 'some' | undefined>();
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');

  useEffect(() => {
    show.loadMode = loadMode;
  }, [show, loadMode]);

  async function pickSongs(files: FileList | null) {
    if (!files || files.length === 0) return;
    // In name order, so numbering the files (01, 02…) sets the show order.
    const list = Array.from(files).sort((a, b) => a.name.localeCompare(b.name));
    show.setSongs(list);
    setSongs(list.map((f) => ({ name: f.name, sizeMb: f.size / (1024 * 1024) })));
    const lengths = await Promise.all(list.map(readLength));
    setSongs(list.map((f, i) => ({ name: f.name, sizeMb: f.size / (1024 * 1024), lengthSeconds: lengths[i] })));
  }

  async function copyResults() {
    const text = formatShowResults(
      {
        device: deviceText(),
        sampleRate: audioContext().sampleRate,
        songs,
        events: snap.events,
        peakAudioMb: snap.peakAudioMb,
        peakLoad: snap.peakLoad,
        dropouts: readDropouts(),
        playedSeconds: snap.playedSeconds,
        taskManagerMb,
        gaps,
        notes,
      },
      build,
      new Date(),
    );
    try {
      await navigator.clipboard.writeText(text);
      setCopied('done');
    } catch {
      setCopied('failed');
    }
  }

  const hasSongs = songs.length > 0;
  const busy = snap.state === 'loading' || snap.state === 'preparing';
  const total = songs.every((s) => s.lengthSeconds !== undefined)
    ? songs.reduce((sum, s) => sum + (s.lengthSeconds ?? 0), 0)
    : undefined;
  const names = songs.map((s) => s.name);
  const current = snap.index;

  return (
    <main className="card wide">
      <header className="card-header">
        <div>
          <h1>Long-show memory test</h1>
          <p className="muted">GPSdance · songs stay on this computer</p>
        </div>
        <div className="build">
          <p>build {build.version}</p>
          <p>
            <a href="../">Device check</a>
          </p>
        </div>
      </header>

      <section>
        <h2>How to run it</h2>
        <ol className="steps small-text">
          <li>Pick 10 songs (about 30 minutes in all). They play in file-name order.</li>
          <li>Open Chrome's Task Manager (Search + Esc) and keep an eye on this tab's memory.</li>
          <li>Press Play show and let it run to the end. Listen at each song change.</li>
          <li>Along the way: click a few songs in the list to jump (try both ways of starting a song), and try a practice speed.</li>
          <li>Type in the highest tab memory you saw, answer the questions, and copy the results.</li>
        </ol>
      </section>

      <section className="test">
        <h2>Songs</h2>
        <label className={`file-button${busy ? ' disabled' : ''}`}>
          Pick 10 songs
          <input
            type="file"
            accept="audio/*,.mp3,.m4a,.wav"
            multiple
            disabled={busy}
            onChange={(e) => {
              void pickSongs(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
        {hasSongs && (
          <p className="muted small-text">
            {songs.length} picked · {songs.reduce((s, x) => s + x.sizeMb, 0).toFixed(1)} MB of files
            {total !== undefined && ` · ${formatTime(total)} in all`}
          </p>
        )}
        {hasSongs && (
          <ol className="show-list">
            {songs.map((song, i) => (
              <li key={`${i}-${song.name}`} className={i === current ? 'now' : undefined}>
                <button
                  type="button"
                  className="small-button"
                  disabled={busy}
                  onClick={() => void show.jump(i)}
                >
                  Play
                </button>
                <span className="song-name">
                  {i + 1}. {song.name}
                </span>
                <span className="muted small-text">
                  {song.lengthSeconds !== undefined ? formatTime(song.lengthSeconds) : ''}
                  {snap.held.includes(i) ? ' · in memory' : ''}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="test">
        <h2>Play</h2>
        <div className="row">
          {snap.state === 'playing' ? (
            <button type="button" onClick={() => show.pause()}>
              Pause
            </button>
          ) : snap.state === 'paused' ? (
            <button type="button" onClick={() => void show.resume()}>
              Play
            </button>
          ) : (
            <button type="button" disabled={!hasSongs || busy} onClick={() => void show.jump(0)}>
              Play show
            </button>
          )}
          <span className="small-text" role="status">
            {snap.state === 'loading' && 'Loading…'}
            {snap.state === 'preparing' && 'Getting it ready…'}
            {current !== null &&
              snap.state !== 'loading' &&
              `Song ${current + 1} of ${songs.length} · ${formatTime(snap.songSeconds)}${
                songs[current]?.lengthSeconds !== undefined ? ` / ${formatTime(songs[current].lengthSeconds!)}` : ''
              }${snap.state === 'paused' ? ' · paused' : ''}`}
          </span>
        </div>
        <Choice<string>
          label="Practice speed:"
          options={SPEEDS.map((r) => [String(r), `${Math.round(r * 100)}%`])}
          value={String(snap.rate)}
          disabled={!hasSongs || busy}
          onChange={(r) => void show.setSpeed(Number(r))}
        />
        <Choice<LoadMode>
          label="Starting a song after a click:"
          options={[
            ['whole', 'Whole song first'],
            ['quick', `Quick start (first ${QUICK_START_SECONDS}+ s)`],
          ]}
          value={loadMode}
          onChange={setLoadMode}
        />
        <p className="muted small-text">
          Quick start works for MP3 and WAV, at any speed; other files load the whole song. Practice speeds are
          slowed live while the song plays.
          Limits: a jump sounds within {LIMITS.jumpSeconds} s at 100% ({jumpLimit(0.5)} s at a practice speed); a new
          speed within {LIMITS.slowSeconds} s.
        </p>
        <p className="small-text">
          Audio in memory: <strong>{Math.round(snap.audioMb)} MB</strong> (highest {Math.round(snap.peakAudioMb)} MB)
          {snap.held.length > 0 && ` · songs ${snap.held.map((i) => i + 1).join(' and ')}`} · played{' '}
          {formatTime(snap.playedSeconds)} · audio clock {audioContext().sampleRate} Hz
          {snap.peakLoad !== undefined && ` · speed tool busiest second ${Math.round(snap.peakLoad * 100)}%`}
        </p>
      </section>

      <section className="test">
        <h2>What happened</h2>
        {snap.events.length === 0 ? (
          <p className="muted small-text">Nothing yet.</p>
        ) : (
          <ol className="log small-text">
            {snap.events.map((e, i) => (
              <li key={i} className={isProblem(e) ? 'problem' : undefined}>
                {eventText(e, names)}
                {dropoutsText(e)}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="test">
        <Choice
          label="Any gaps, skips or stutter?"
          options={[
            ['none', 'None'],
            ['some', 'Some'],
          ]}
          value={gaps}
          onChange={setGaps}
        />
        <label className="field">
          Highest tab memory in Chrome's Task Manager, in MB:
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={taskManagerMb ?? ''}
            onChange={(e) => setTaskManagerMb(e.target.value === '' ? undefined : Number(e.target.value))}
          />
        </label>
        <label className="field">
          Notes (anything you noticed):
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <button type="button" className="primary" onClick={() => void copyResults()}>
          Copy results
        </button>
        <p className="copy-status" role="status">
          {copied === 'done' && 'Copied. Paste them into chat or an email.'}
          {copied === 'failed' && "Couldn't copy. Take a screenshot instead."}
        </p>
      </section>

      <footer className="muted small">Commit {build.commit}</footer>
    </main>
  );
}

/** Log lines worth a second look: late songs, a quick start that ran out, slow jumps or speeds, errors. */
function isProblem(e: ShowEvent): boolean {
  switch (e.kind) {
    case 'change':
      return e.leadSeconds < 0;
    case 'swap':
      return e.spareSeconds < 0;
    case 'jump':
      return e.seconds >= jumpLimit(e.rate);
    case 'speed':
      return e.seconds >= LIMITS.slowSeconds;
    case 'error':
      return true;
    default:
      return false;
  }
}
