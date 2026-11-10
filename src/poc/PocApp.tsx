// Proof of concept, tests 1-4 (docs/design/tech-stack.md): a bare-bones page, not the real app.
// Songs are picked from the computer and stay there: nothing is uploaded.

import { useEffect, useMemo, useRef, useState } from 'react';
import { readDeviceInfo, runChecks } from '../deviceCheck';
import {
  audioContext,
  beatTimes,
  bufferMb,
  changeSpeed,
  decodeFile,
  detectBpm,
  encodeMp3,
  playBuffer,
  playMix,
  renderMix,
  slicePart,
  type BpmGuess,
  type Playing,
} from './audio';
import { formatTime, partAt, planMix } from './mixPlan';
import {
  formatPocResults,
  type MemoryMode,
  type PocResults,
  type SongResult,
  type SoundRating,
  type Verdict,
} from './results';

const build = __BUILD_INFO__;
const SPEEDS = [0.9, 1.1];

/**
 * Whole songs (default) or only the parts the mix uses (address ends in ?keep=parts).
 * It's in the address so switching reloads the page and memory starts fresh for a fair comparison.
 */
const memoryMode: MemoryMode = new URLSearchParams(location.search).get('keep') === 'parts' ? 'parts' : 'whole';

/** Where song previews start: past most intros (parts already skip the intro). */
const PREVIEW_FROM = memoryMode === 'parts' ? 0 : 30;

interface Song {
  file: File;
  buffer: AudioBuffer;
  guess?: BpmGuess;
}

function deviceText(): string {
  const [browser, memory] = runChecks(readDeviceInfo());
  return `${browser.detail}, memory ${memory.detail}`;
}

const seconds = (start: number) => (performance.now() - start) / 1000;
const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** A small row of choice buttons; the picked one is marked. */
function Choice<T extends string>(props: {
  label: string;
  options: [T, string][];
  value?: T;
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
          onClick={() => props.onChange(value)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export default function PocApp() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [results, setResults] = useState<PocResults>(() => ({
    device: deviceText(),
    memoryMode,
    songs: [],
    speeds: [],
    notes: '',
  }));
  const [busy, setBusy] = useState<string>('');
  const [error, setError] = useState<string>('');

  // What's playing right now (only one thing at a time) and a clock for the screen.
  const playing = useRef<Playing | null>(null);
  const [nowPlaying, setNowPlaying] = useState<string>('');
  const [clock, setClock] = useState(0);
  useEffect(() => {
    if (!nowPlaying) return;
    const timer = setInterval(() => setClock(playing.current?.elapsed() ?? 0), 250);
    return () => clearInterval(timer);
  }, [nowPlaying]);

  const [speedSong, setSpeedSong] = useState(0);
  const [stretched, setStretched] = useState<Map<number, AudioBuffer>>(new Map());
  const [mp3Url, setMp3Url] = useState<string>('');
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');

  const plan = useMemo(() => planMix(songs.map((s) => s.buffer.duration)), [songs]);
  const update = (change: Partial<PocResults>) => setResults((r) => ({ ...r, ...change }));
  const updateSong = (index: number, change: Partial<SongResult>) =>
    setResults((r) => ({ ...r, songs: r.songs.map((s, i) => (i === index ? { ...s, ...change } : s)) }));

  function stop() {
    playing.current?.stop();
    playing.current = null;
    setNowPlaying('');
    setClock(0);
  }

  function play(what: string, start: () => Playing) {
    stop();
    playing.current = start();
    setNowPlaying(what);
  }

  async function pickSongs(files: FileList | null) {
    if (!files || files.length === 0) return;
    stop();
    setError('');
    setStretched(new Map());
    setMp3Url('');
    const list = Array.from(files).sort((a, b) => a.name.localeCompare(b.name));
    // Starting audio needs a click on the page; this click counts.
    void audioContext().resume();
    const loaded: Song[] = [];
    const started = performance.now();
    try {
      // One at a time, so memory grows gradually (as it would in the real app).
      for (const [i, file] of list.entries()) {
        setBusy(`Loading song ${i + 1} of ${list.length}…`);
        let buffer = await decodeFile(file);
        if (memoryMode === 'parts') {
          // Same part the mix would take (planMix's rule), then the whole song can be freed.
          const part = planMix([buffer.duration]).parts[0];
          buffer = slicePart(buffer, part.from, part.length);
        }
        loaded.push({ file, buffer });
      }
    } catch (err) {
      setError(`Couldn't load ${list[loaded.length]?.name}: ${errorText(err)}`);
    }
    const loadSeconds = seconds(started);
    setBusy('');
    setSongs(loaded);
    update({
      songs: loaded.map((s) => ({
        name: s.file.name,
        sizeMb: s.file.size / (1024 * 1024),
        lengthSeconds: s.buffer.duration,
      })),
      loadSeconds,
      audioMb: loaded.reduce((sum, s) => sum + bufferMb(s.buffer), 0),
      mixSeconds: planMix(loaded.map((s) => s.buffer.duration)).length,
      speeds: [],
      speedSong: undefined,
      mp3: undefined,
      mp3Error: undefined,
    });
  }

  async function makeSpeed(rate: number) {
    stop();
    const song = songs[speedSong];
    setBusy(`Making ${Math.round(rate * 100)}% speed…`);
    setError('');
    try {
      const started = performance.now();
      const result = await changeSpeed(song.buffer, rate);
      const took = seconds(started);
      setStretched((m) => new Map(m).set(rate, result));
      setResults((r) => ({
        ...r,
        speedSong: song.file.name,
        // A new song for this test clears the earlier song's speed results.
        speeds: [
          ...(r.speedSong === song.file.name ? r.speeds.filter((s) => s.rate !== rate) : []),
          { rate, seconds: took },
        ].sort((a, b) => a.rate - b.rate),
      }));
    } catch (err) {
      setError(`Speed change failed: ${errorText(err)}`);
    }
    setBusy('');
  }

  function rateSpeed(rate: number, rating: SoundRating) {
    setResults((r) => ({ ...r, speeds: r.speeds.map((s) => (s.rate === rate ? { ...s, rating } : s)) }));
  }

  async function findAllBpm() {
    stop();
    setError('');
    const updated = [...songs];
    for (const [i, song] of songs.entries()) {
      setBusy(`Finding BPM: song ${i + 1} of ${songs.length}…`);
      const started = performance.now();
      try {
        const g = await detectBpm(song.buffer);
        updated[i] = { ...song, guess: g };
        updateSong(i, { bpm: g.bpm, bpmSeconds: seconds(started), bpmError: undefined });
      } catch (err) {
        updateSong(i, { bpm: undefined, bpmError: errorText(err) });
      }
    }
    setSongs(updated);
    setBusy('');
  }

  async function makeMp3() {
    stop();
    setError('');
    if (mp3Url) URL.revokeObjectURL(mp3Url);
    setMp3Url('');
    try {
      setBusy('Mixing…');
      let started = performance.now();
      const mix = await renderMix(plan, songs.map((s) => s.buffer));
      const renderSeconds = seconds(started);
      setBusy('Making the MP3…');
      started = performance.now();
      const mp3 = await encodeMp3(mix);
      const encodeSeconds = seconds(started);
      setMp3Url(URL.createObjectURL(mp3));
      update({ mp3: { renderSeconds, encodeSeconds, sizeMb: mp3.size / (1024 * 1024) }, mp3Error: undefined });
    } catch (err) {
      update({ mp3: undefined, mp3Error: errorText(err) });
      setError(`MP3 failed: ${errorText(err)}`);
    }
    setBusy('');
  }

  async function copyResults() {
    try {
      await navigator.clipboard.writeText(formatPocResults(results, build, new Date()));
      setCopied('done');
    } catch {
      setCopied('failed');
    }
  }

  const hasSongs = songs.length > 0;
  const working = busy !== '';
  const speedResult = (rate: number) =>
    results.speedSong === songs[speedSong]?.file.name ? results.speeds.find((s) => s.rate === rate) : undefined;
  const playingPart = nowPlaying === 'mix' ? plan.parts[partAt(plan, clock)] : undefined;

  return (
    <main className="card wide">
      <header className="card-header">
        <div>
          <h1>Chromebook tests 1–4</h1>
          <p className="muted">GPSdance proof of concept · songs stay on this computer</p>
        </div>
        <div className="build">
          <p>build {build.version}</p>
          <p>
            <a href="../">Device check</a>
          </p>
        </div>
      </header>

      <section>
        <h2>Songs</h2>
        <label className={`file-button${working ? ' disabled' : ''}`}>
          Pick 8–10 songs
          <input
            type="file"
            accept="audio/*,.mp3,.m4a,.wav"
            multiple
            disabled={working}
            onChange={(e) => {
              void pickSongs(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
        <Choice<MemoryMode>
          label="Keep in memory:"
          options={[
            ['whole', 'Whole songs'],
            ['parts', 'Only the parts the mix uses'],
          ]}
          value={memoryMode}
          onChange={(mode) => {
            // Reloads the page (songs need picking again), so memory starts fresh.
            if (mode !== memoryMode) location.search = mode === 'parts' ? '?keep=parts' : '';
          }}
        />
        <p className="muted small-text">Switching reloads the page; pick the songs again after.</p>
        {hasSongs && (
          <p className="muted small-text">
            {songs.length} picked · {results.songs.reduce((s, x) => s + x.sizeMb, 0).toFixed(1)} MB · loaded in{' '}
            {results.loadSeconds?.toFixed(1)} s · audio in memory about {Math.round(results.audioMb ?? 0)} MB
          </p>
        )}
        <p className="status" role="status">
          {busy}
        </p>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="test">
        <h2>1 · Play a 10-minute mix</h2>
        <p className="muted small-text">
          First {plan.parts.length || 8} songs, about 75 s each, 3-second crossfades
          {hasSongs && ` · ${formatTime(plan.length)} in all`}
        </p>
        <div className="row">
          {nowPlaying === 'mix' ? (
            <button type="button" onClick={stop}>
              Stop
            </button>
          ) : (
            <button
              type="button"
              disabled={!hasSongs || working}
              onClick={() => play('mix', () => playMix(plan, songs.map((s) => s.buffer)))}
            >
              Play mix
            </button>
          )}
          {playingPart && (
            <span className="muted small-text">
              Song {playingPart.song + 1} of {plan.parts.length} · {formatTime(clock)} / {formatTime(plan.length)}
            </span>
          )}
        </div>
        <Choice
          label="Any stutter or skips?"
          options={[
            ['none', 'None'],
            ['some', 'Some'],
          ]}
          value={results.stutter}
          onChange={(stutter) => update({ stutter })}
        />
        <label className="field">
          Tab memory from Chrome's Task Manager (Search + Esc), in MB:
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={results.taskManagerMb ?? ''}
            onChange={(e) => update({ taskManagerMb: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        </label>
      </section>

      <section className="test">
        <h2>2 · Speed change</h2>
        <div className="row">
          <select
            value={speedSong}
            disabled={!hasSongs || working}
            onChange={(e) => {
              stop();
              setSpeedSong(Number(e.target.value));
              setStretched(new Map());
            }}
          >
            {songs.map((s, i) => (
              <option key={s.file.name} value={i}>
                {s.file.name}
              </option>
            ))}
          </select>
          {SPEEDS.map((rate) => (
            <button key={rate} type="button" disabled={!hasSongs || working} onClick={() => void makeSpeed(rate)}>
              Make {Math.round(rate * 100)}%
            </button>
          ))}
        </div>
        <div className="row">
          <button
            type="button"
            className="small-button"
            disabled={!hasSongs || working}
            onClick={() => play('original', () => playBuffer(songs[speedSong].buffer, PREVIEW_FROM))}
          >
            Play original
          </button>
          {SPEEDS.map((rate) => {
            const buffer = stretched.get(rate);
            return (
              <button
                key={rate}
                type="button"
                className="small-button"
                disabled={!buffer || working}
                // Start at the same spot in the music as the original preview.
                onClick={() => buffer && play(`speed${rate}`, () => playBuffer(buffer, PREVIEW_FROM / rate))}
              >
                Play {Math.round(rate * 100)}%
              </button>
            );
          })}
          {nowPlaying && nowPlaying !== 'mix' && !nowPlaying.startsWith('bpm') && (
            <button type="button" className="small-button" onClick={stop}>
              Stop
            </button>
          )}
        </div>
        {SPEEDS.map((rate) => {
          const r = speedResult(rate);
          if (!r) return null;
          return (
            <Choice
              key={rate}
              label={`${Math.round(rate * 100)}%: ready in ${r.seconds.toFixed(1)} s · sound?`}
              options={[
                ['clean', 'Clean'],
                ['someWarble', 'Some warble'],
                ['bad', 'Bad'],
              ]}
              value={r.rating}
              onChange={(rating) => rateSpeed(rate, rating)}
            />
          );
        })}
      </section>

      <section className="test">
        <h2>3 · BPM on each song</h2>
        <button type="button" disabled={!hasSongs || working} onClick={() => void findAllBpm()}>
          Find BPM
        </button>
        {songs.some((s) => s.guess) && (
          <div className="bpm-table">
            <span className="muted">Song</span>
            <span className="muted">Found</span>
            <span className="muted">Real BPM</span>
            <span className="muted">By ear</span>
            {songs.map((song, i) => {
              const r = results.songs[i];
              const key = `bpm${i}`;
              return (
                <div className="bpm-row" key={song.file.name}>
                  <span className="song-name">
                    <button
                      type="button"
                      className="small-button"
                      disabled={!song.guess}
                      onClick={() =>
                        nowPlaying === key
                          ? stop()
                          : song.guess &&
                            play(key, () =>
                              playBuffer(song.buffer, PREVIEW_FROM, beatTimes(song.guess!, song.buffer.duration)),
                            )
                      }
                    >
                      {nowPlaying === key ? 'Stop' : 'Play + clicks'}
                    </button>{' '}
                    {song.file.name}
                  </span>
                  <span>{r?.bpmError ? 'error' : (r?.bpm ?? '…')}</span>
                  <input
                    type="number"
                    min="40"
                    max="250"
                    aria-label={`Real BPM for ${song.file.name}`}
                    value={r?.realBpm ?? ''}
                    onChange={(e) =>
                      updateSong(i, { realBpm: e.target.value === '' ? undefined : Number(e.target.value) })
                    }
                  />
                  <Choice<Verdict>
                    label=""
                    options={[
                      ['right', 'Right'],
                      ['halfDouble', '½ or 2×'],
                      ['wrong', 'Wrong'],
                    ]}
                    value={r?.verdict}
                    onChange={(verdict) => updateSong(i, { verdict })}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="test">
        <h2>4 · Save the mix as MP3</h2>
        <div className="row">
          <button type="button" disabled={!hasSongs || working} onClick={() => void makeMp3()}>
            Make MP3
          </button>
          {results.mp3 && (
            <span className="muted small-text">
              Done in {(results.mp3.renderSeconds + results.mp3.encodeSeconds).toFixed(1)} s ·{' '}
              {results.mp3.sizeMb.toFixed(1)} MB
            </span>
          )}
          {mp3Url && (
            <a href={mp3Url} download="gpsdance-test-mix.mp3">
              Save file
            </a>
          )}
        </div>
      </section>

      <section className="test">
        <label className="field">
          Notes (anything you noticed):
          <textarea rows={2} value={results.notes} onChange={(e) => update({ notes: e.target.value })} />
        </label>
        <button type="button" className="primary" onClick={() => void copyResults()}>
          Copy all results
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
