// Test 5 (docs/design/tech-stack.md): can a .gpsmix project saved in one person's Drive be shared
// with another person as play-only (Viewer) or editable (Editor), using only the narrow
// drive.file permission? A bare-bones test page, not the real app.

import { useEffect, useState } from 'react';
import {
  createFile,
  downloadFile,
  DriveError,
  fileInfo,
  loadGoogle,
  pickFile,
  PROJECT_TYPE,
  signIn,
  signOut,
  updateFile,
  type FileInfo,
  type PickedFile,
  type Session,
} from '../google/google';
import { readGpsmix, songPath, writeGpsmix, type OpenedProject, type Project } from '../google/gpsmix';

const build = __BUILD_INFO__;
const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));
const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

interface Opened {
  info: FileInfo;
  content: OpenedProject;
  /** A playable address for the project's first song. */
  songUrl: string;
}

interface LogLine {
  time: string;
  who: string;
  what: string;
}

export default function DriveTestApp() {
  const [googleReady, setGoogleReady] = useState<'loading' | 'ready' | string>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [song, setSong] = useState<{ file: PickedFile; bytes: Uint8Array } | null>(null);
  const [saved, setSaved] = useState<FileInfo | null>(null);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);

  useEffect(() => {
    loadGoogle().then(
      () => setGoogleReady('ready'),
      (err: unknown) => setGoogleReady(errorText(err)),
    );
  }, []);

  // Free the song's playable address when a different project is opened.
  const songUrl = opened?.songUrl;
  useEffect(
    () => () => {
      if (songUrl) URL.revokeObjectURL(songUrl);
    },
    [songUrl],
  );

  const note = (what: string, who = session?.email ?? '') =>
    setLog((l) => [...l, { time: new Date().toLocaleTimeString(), who, what }]);

  /** Runs one step with a busy message; any error is shown in plain words. */
  async function step(message: string, work: () => Promise<void>) {
    setBusy(message);
    setError('');
    try {
      await work();
    } catch (err) {
      setError(errorText(err));
    }
    setBusy('');
  }

  const startSignIn = () =>
    step('Signing in…', async () => {
      const s = await signIn();
      if (session) signOut(session);
      setSession(s);
      setSong(null);
      setSaved(null);
      setOpened(null);
      note('Signed in', s.email);
    });

  const pickSong = (s: Session) =>
    step('Waiting for a song to be picked…', async () => {
      const file = await pickFile(s, 'song');
      if (!file) return;
      setBusy(`Downloading ${file.name}…`);
      const bytes = await downloadFile(s, file.id);
      setSong({ file, bytes });
      note(`Picked song "${file.name}" (${mb(bytes.length)})`);
    });

  const saveProject = (s: Session, picked: { file: PickedFile; bytes: Uint8Array }) =>
    step('Saving the project to your Drive…', async () => {
      const path = songPath(0, picked.file.name);
      const project: Project = {
        format: 'gpsmix',
        version: 1,
        title: `Test 5 · ${picked.file.name.replace(/\.[^.]+$/, '')}`,
        songs: [{ name: picked.file.name, path }],
        saves: 0,
        lastSavedBy: s.email,
        lastSavedAt: new Date().toISOString(),
      };
      const zip = writeGpsmix(project, new Map([[path, picked.bytes]]));
      const id = await createFile(s, `${project.title}.gpsmix`, zip, PROJECT_TYPE);
      const info = await fileInfo(s, id);
      setSaved(info);
      note(`Saved project "${info.name}" (${mb(info.size)}) to My Drive`);
    });

  const openProject = (s: Session) =>
    step('Waiting for a project to be picked…', async () => {
      const file = await pickFile(s, 'project');
      if (!file) return;
      setBusy(`Opening ${file.name}…`);
      const info = await fileInfo(s, file.id);
      const content = readGpsmix(await downloadFile(s, file.id));
      const first = content.project.songs[0];
      const bytes = first ? content.songs.get(first.path) : undefined;
      const songUrl = bytes ? URL.createObjectURL(new Blob([bytes as BlobPart])) : '';
      setOpened({ info, content, songUrl });
      note(
        `Opened "${info.name}" (owner ${info.ownerEmail}); Drive says can edit: ${info.canEdit ? 'YES → editor' : 'NO → play-only'}; saved ${content.project.saves} time(s) so far`,
      );
    });

  const saveChange = (s: Session, o: Opened) =>
    step('Saving a change to the project…', async () => {
      const project: Project = {
        ...o.content.project,
        saves: o.content.project.saves + 1,
        lastSavedBy: s.email,
        lastSavedAt: new Date().toISOString(),
      };
      try {
        await updateFile(s, o.info.id, writeGpsmix(project, o.content.songs), PROJECT_TYPE);
      } catch (err) {
        const refused = err instanceof DriveError && err.status === 403;
        note(`Tried to save a change: ${refused ? 'REFUSED by Drive (403)' : `failed: ${errorText(err)}`}`);
        throw err;
      }
      setOpened({ ...o, content: { ...o.content, project } });
      note(`Tried to save a change: SAVED (now saved ${project.saves} time(s))`);
    });

  const working = busy !== '';
  const canUseGoogle = googleReady === 'ready' && !working;

  return (
    <main className="card wide">
      <header className="card-header">
        <div>
          <h1>Test 5 · Drive sharing</h1>
          <p className="muted">GPSdance proof of concept · uses your Google Drive (test accounts only)</p>
        </div>
        <div className="build">
          <p>build {build.version}</p>
          <p>
            <a href="../">Device check</a> · <a href="../poc/">Tests 1–4</a>
          </p>
        </div>
      </header>

      <section>
        <h2>Who's signed in</h2>
        {googleReady === 'loading' && <p className="muted">Loading Google sign-in…</p>}
        {googleReady !== 'loading' && googleReady !== 'ready' && <p className="error">{googleReady}</p>}
        <div className="row">
          <button type="button" disabled={!canUseGoogle} onClick={() => void startSignIn()}>
            {session ? 'Switch account' : 'Sign in with Google'}
          </button>
          {session && (
            <span>
              <strong>{session.email}</strong>
            </span>
          )}
        </div>
        <p className="muted small-text">
          Google may warn that the app isn't verified: that's expected for a test project. Click Continue.
        </p>
        <p className="status" role="status">
          {busy}
        </p>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="test">
        <h2>A · As Gmail A: make a project</h2>
        <div className="row">
          <button type="button" disabled={!session || !canUseGoogle} onClick={() => session && void pickSong(session)}>
            1 · Pick a song from Drive
          </button>
          {song && (
            <span className="muted small-text">
              {song.file.name} · {mb(song.bytes.length)}
            </span>
          )}
        </div>
        <div className="row">
          <button
            type="button"
            disabled={!session || !song || !canUseGoogle}
            onClick={() => session && song && void saveProject(session, song)}
          >
            2 · Save as a project
          </button>
          {saved && (
            <span className="small-text">
              Saved: {saved.name} ·{' '}
              <a href={saved.link} target="_blank" rel="noreferrer">
                open it in Drive
              </a>
            </span>
          )}
        </div>
        <p className="muted small-text">
          3 · In Drive, right-click the project → Share → add Gmail B as <strong>Viewer</strong> → Send.
        </p>
      </section>

      <section className="test">
        <h2>B · As Gmail B: open it</h2>
        <p className="muted small-text">Click "Switch account" above and pick Gmail B first.</p>
        <div className="row">
          <button type="button" disabled={!session || !canUseGoogle} onClick={() => session && void openProject(session)}>
            4 · Open a project
          </button>
          <span className="muted small-text">Shared projects are on the Picker's "Shared with me" tab.</span>
        </div>
        {opened && (
          <div className="opened">
            <p>
              <strong>{opened.content.project.title}</strong> · owner {opened.info.ownerEmail}
            </p>
            <p>
              Drive says this account can edit: <strong>{opened.info.canEdit ? 'Yes' : 'No'}</strong> → the app would open
              it in the <strong>{opened.info.canEdit ? 'editor (editable)' : 'player (play-only)'}</strong>
            </p>
            <p className="muted small-text">
              Saved {opened.content.project.saves} time(s) · last by {opened.content.project.lastSavedBy}
            </p>
            {opened.songUrl && <audio controls src={opened.songUrl} />}
          </div>
        )}
        <div className="row">
          <button
            type="button"
            disabled={!session || !opened || !canUseGoogle}
            onClick={() => session && opened && void saveChange(session, opened)}
          >
            5 · Try saving a change
          </button>
          <span className="muted small-text">As Viewer, Drive should refuse. As Editor, it should save.</span>
        </div>
        <p className="muted small-text">
          6 · Then as Gmail A, change Gmail B to <strong>Editor</strong> in Drive, and repeat 4 and 5 as Gmail B.
        </p>
      </section>

      <section className="test">
        <h2>What happened</h2>
        {log.length === 0 ? (
          <p className="muted small-text">Nothing yet.</p>
        ) : (
          <ol className="log small-text">
            {log.map((line, i) => (
              <li key={i}>
                {line.time} · {line.who} · {line.what}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
