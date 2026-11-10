// Google sign-in, the Drive file picker, and the few Drive calls GPSdance makes.
// Everything runs in the browser with a short-lived access token held in memory only:
// no server, no stored passwords, nothing saved about the person.
//
// Permission is `drive.file` (see config.ts): Drive only lets the app touch files the person
// picked in the Picker or files the app created. That's why the Picker gets `setAppId`.

import { GOOGLE } from './config';

const SIGN_IN_SCRIPT = 'https://accounts.google.com/gsi/client';
const PICKER_SCRIPT = 'https://apis.google.com/js/api.js';
const DRIVE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

// One load per script, shared by every caller (React's StrictMode runs page setup twice in
// development; a second caller must wait for the same load, not see the tag and go on early).
const scripts = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  let loading = scripts.get(src);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Couldn't load ${src} (blocked by a web filter?)`));
      document.head.append(script);
    });
    scripts.set(src, loading);
  }
  return loading;
}

/**
 * Loads Google's sign-in and Picker scripts. Call it when the page opens: the sign-in popup
 * must open straight from a click, so the scripts have to be ready before that click.
 */
export async function loadGoogle(): Promise<void> {
  await Promise.all([loadScript(SIGN_IN_SCRIPT), loadScript(PICKER_SCRIPT)]);
  await new Promise<void>((resolve) => gapi.load('picker', resolve));
}

export interface Session {
  token: string;
  email: string;
  name: string;
}

/** Opens Google's sign-in popup (always asks which account, so switching accounts is easy). */
export function signIn(): Promise<Session> {
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE.clientId,
      scope: GOOGLE.scope,
      prompt: 'select_account',
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description ?? response.error));
          return;
        }
        const token = response.access_token;
        whoAmI(token).then((user) => resolve({ token, ...user }), reject);
      },
      error_callback: (error) => reject(new Error(error.message ?? `Sign-in stopped (${error.type})`)),
    });
    client.requestAccessToken();
  });
}

/** Signs out by giving the token back to Google. */
export function signOut(session: Session): void {
  google.accounts.oauth2.revoke(session.token);
}

export interface PickedFile {
  id: string;
  name: string;
}

/** What the Picker shows. */
export type PickKind = 'song' | 'project';

const AUDIO_TYPES = 'audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/x-wav';
export const PROJECT_TYPE = 'application/zip';

/** Opens Google's Drive file picker. Resolves with the picked file, or null if closed. */
export function pickFile(session: Session, kind: PickKind): Promise<PickedFile | null> {
  return new Promise((resolve) => {
    const p = google.picker;
    const builder = new p.PickerBuilder()
      .setOAuthToken(session.token)
      .setDeveloperKey(GOOGLE.pickerApiKey)
      .setAppId(GOOGLE.appId)
      .setCallback((data) => {
        if (data.action === p.Action.PICKED && data.docs?.[0]) {
          resolve({ id: data.docs[0].id, name: data.docs[0].name });
        } else if (data.action === p.Action.CANCEL) {
          resolve(null);
        }
      });
    if (kind === 'song') {
      builder.setTitle('Pick a song').addView(new p.DocsView(p.ViewId.DOCS).setMimeTypes(AUDIO_TYPES).setIncludeFolders(true));
    } else {
      // Two tabs: my own projects, and projects other people shared with me.
      builder
        .setTitle('Open a project (.gpsmix)')
        .addView(new p.DocsView(p.ViewId.DOCS).setMimeTypes(PROJECT_TYPE).setOwnedByMe(true).setIncludeFolders(true))
        .addView(new p.DocsView(p.ViewId.DOCS).setMimeTypes(PROJECT_TYPE).setOwnedByMe(false));
    }
    builder.build().setVisible(true);
  });
}

/** A Drive call that failed. `status` 403 usually means "this account isn't allowed". */
export class DriveError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call(session: Session | string, url: string, init: RequestInit = {}): Promise<Response> {
  const token = typeof session === 'string' ? session : session.token;
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body.error?.message) message = `${response.status}: ${body.error.message}`;
    } catch {
      // Not JSON; keep the status line.
    }
    throw new DriveError(message, response.status);
  }
  return response;
}

async function whoAmI(token: string): Promise<{ email: string; name: string }> {
  const response = await call(token, `${DRIVE}/about?fields=user(emailAddress,displayName)`);
  const { user } = (await response.json()) as { user: { emailAddress: string; displayName: string } };
  return { email: user.emailAddress, name: user.displayName };
}

export interface FileInfo {
  id: string;
  name: string;
  size: number;
  ownerEmail: string;
  /** Drive's answer to "can this account change the file?" (Editor: yes; Viewer: no). */
  canEdit: boolean;
  /** Link to the file in Drive (to share it, see its versions). */
  link: string;
}

export async function fileInfo(session: Session, id: string): Promise<FileInfo> {
  const fields = 'id,name,size,webViewLink,owners(emailAddress),capabilities(canEdit)';
  const response = await call(session, `${DRIVE}/files/${id}?fields=${encodeURIComponent(fields)}`);
  const f = (await response.json()) as {
    id: string;
    name: string;
    size?: string;
    webViewLink: string;
    owners?: { emailAddress: string }[];
    capabilities: { canEdit: boolean };
  };
  return {
    id: f.id,
    name: f.name,
    size: Number(f.size ?? 0),
    ownerEmail: f.owners?.[0]?.emailAddress ?? '',
    canEdit: f.capabilities.canEdit,
    link: f.webViewLink,
  };
}

export async function downloadFile(session: Session, id: string): Promise<Uint8Array> {
  const response = await call(session, `${DRIVE}/files/${id}?alt=media`);
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Sends a file's contents to Drive with a "resumable" upload, which has no 5 MB limit
 * (songs are often bigger). First call: where to send it; second call: the bytes.
 */
async function upload(session: Session, startUrl: string, method: 'POST' | 'PATCH', metadata: object, bytes: Uint8Array, type: string) {
  const start = await call(session, startUrl, {
    method,
    headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': type },
    body: JSON.stringify(metadata),
  });
  const sendTo = start.headers.get('Location');
  if (!sendTo) throw new DriveError('Drive gave no upload address', 0);
  const done = await call(session, sendTo, { method: 'PUT', headers: { 'Content-Type': type }, body: bytes as BodyInit });
  return (await done.json()) as { id: string };
}

/** Saves a new file in the top of the person's My Drive. Returns its ID. */
export async function createFile(session: Session, name: string, bytes: Uint8Array, type: string): Promise<string> {
  const made = await upload(session, `${DRIVE_UPLOAD}/files?uploadType=resumable`, 'POST', { name, mimeType: type }, bytes, type);
  return made.id;
}

/** Replaces a file's contents (Drive keeps the old one in the file's version history). */
export async function updateFile(session: Session, id: string, bytes: Uint8Array, type: string): Promise<void> {
  await upload(session, `${DRIVE_UPLOAD}/files/${id}?uploadType=resumable`, 'PATCH', {}, bytes, type);
}
