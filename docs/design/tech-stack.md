# Tech stack

> Approved by the user 2026-11-05. Changes need the user's OK. Every library must be free for a public district repo (MIT/Apache/BSD preferred; LGPL only as a separate, swappable file; no GPL/AGPL).

## The shape of the app

A **static web app**: HTML, JS and CSS files, with no server of our own. All audio work happens in the browser. Projects are files in the user's Google Drive.

```
Browser (Chrome on Chromebook / Windows)
 ├─ UI: React + TypeScript
 ├─ Audio: Web Audio API (play, preview) + an offline render (export)
 │    ├─ tempo: Signalsmith Stretch (WASM)
 │    ├─ BPM/beats: web-audio-beat-detector + our own beat grid
 │    ├─ loudness: our own LUFS meter (small, no library)
 │    └─ export: WAV (our own), MP3 (lamejs)
 └─ Google: sign-in (Google Identity Services) + Picker + Drive API, scope drive.file
        └─ the user's Drive: project files (.gpsmix bundles), exported MP3/WAV
```

## Choices

| Area | Choice | License | Why |
|---|---|---|---|
| Language | **TypeScript** | — | Catches mistakes before they reach users; the most common choice for web apps, so easiest to hand off |
| UI | **React** | MIT | The most widely known UI library; any future maintainer (or Claude) knows it |
| Build | **Vite** | MIT | Fast, simple; produces plain static files |
| Playback and mixing | **Web Audio API** (built into Chrome) | — | Plays clips, fades and crossfades in sync; `OfflineAudioContext` renders the final mix |
| Tempo change, same pitch | **Signalsmith Stretch** | MIT | Good quality, runs in the browser (WASM). On the Chromebook: clean at 75%–110%; some warble at 60% and 50%, still usable for practice (test 2) |
| BPM and beats | **web-audio-beat-detector** (BPM + first beat) + our own beat grid, adjustable by hand | MIT | Small and simple; accuracy to be checked on the department's real songs |
| Volume leveling | **Our own loudness meter** (the broadcast LUFS standard) | — | About 100 lines; no dependency needed |
| Export | **WAV:** our own writer · **MP3:** lamejs (the `@breezystack/lamejs` fork), kept as its own file | — / LGPL | WAV is trivial; lamejs is the standard browser MP3 encoder. The fork is the same encoder repackaged; the original (last updated 2017) is known to break in modern build tools like Vite (user's OK, 2026-11-10) |
| Waveforms | **Our own canvas drawing** from small precomputed summaries | — | Fast even for long mixes |
| Project bundle | **fflate** 0.8.3 (zip) | MIT | One project = one file (see below) |
| Google | **Google Identity Services** + **Google Picker** + **Drive API v3**, scope **`drive.file`** | — | The app sees only files the user picks or the app made; the scope that needs no Google security review. Test 5 showed it's enough for Editor/Viewer sharing |
| Tests | **Vitest** (logic) + **Playwright** (in a real browser) | MIT / Apache | Standard pair for React + Vite |
| Hosting | **GitHub Pages** (built by GitHub Actions) → later **Firebase Hosting** in the district's Google Cloud | — | Free; static files only |
| R2 word-finding | **Transformers.js** + a **Whisper** model, served from our own address | Apache / MIT | Runs on the device; nothing leaves the computer |

Everything is bundled and served from the app's own address. The only outside addresses are Google's own (sign-in, Picker, Drive), which a Google Workspace district already allows.

## One project = one file

A project is a single `.gpsmix` file in Drive (the name can change with the app's name). It's a zip holding:

- `project.json`: the edit list (which song, which part, fades, tempo, transitions, markers, censored words). Edits are **non-destructive**: the original songs are never changed.
- `audio/`: copies of the source songs as they came (MP3/M4A/WAV), plus any sound effects used.

**Why one file:** with the narrow `drive.file` permission, the app can open only files a person picks or the app made. Google doesn't clearly say whether picking a *folder* grants access to the files inside it, so a project made of loose files might not open for the person it's shared with. One file avoids the question:

- **Share as Editor** → the other person opens it in the editor.
- **Share as Viewer** → they can open it in the player only.
- **Saved versions** come from Drive's own version history of that file.
- **"Changed since you opened it"** uses the file's version number in Drive.

Cost: song copies take Drive space (about 4 MB per song as MP3). A 10-song mix is about 40 MB.

## Long mixes on Chromebooks

Chrome keeps decoded audio as 32-bit numbers at the device's sample rate (usually 48 kHz), so a decoded song takes about **23 MB per stereo minute** in memory.

**Rule (decided 2026-11-10 from test 1 on the Dell 3120): keep only the parts of each song the mix uses in memory, never whole songs.** With 8 real songs: whole songs took 708 MB of audio and 831 MB for the tab (fails the 500 MB limit), and the tab crashed at about 1,095 MB while making speed copies of a third song. Parts only: 220 MB of audio, 279 MB for the tab, no stutter.

The same goes for speed changes: make the slowed or sped-up copy only of the part in use, and free the old copy before making a new one (each copy is the part's length ÷ the speed, so 50% doubles it).

## Proof of concept (about 2 weeks; the build-vs-buy decision point)

A bare-bones page, not the real app, tested on a **student Chromebook** and a district Windows PC:

| # | Test | Pass if |
|---|---|---|
| 1 | Load a 10-minute, 8-song mix; play it with crossfades | No stutter; tab stays under ~500 MB; loads in < 30 s |
| 2 | Tempo change on a song (90%, 110%; practice speeds 75%, 60%, 50% added 2026-11-10) | **The user listens:** no obvious warble; processing < 10 s per song |
| 3 | BPM detection on 10 of the department's songs | Right on at least 8 (half/double counts as fixable by hand) |
| 4 | Export the 10-minute mix to MP3 | Finishes in < 2 minutes on the Chromebook |
| 5 | Drive: sign in with Gmail, pick a song, save a `.gpsmix`, share it with a second Gmail as Viewer and as Editor | It opens for the second account, play-only vs. editable |
| 6 | Open the test page on a student Chromebook at school | Gets past the web filter (`github.io`) |

The user (and later the pilot group) judges anything heard by ear. Claude measures the times and memory.

**Test device:** a Dell Chromebook 3120, about 4 GB memory, ChromeOS with Chrome 148. A budget education model, so tests 2 and 4 (processor-heavy) are the ones most at risk.

**Results so far**

| # | Result |
|---|---|
| 1 | **Passed with parts only** (Dell 3120, 8 real songs, 2026-11-10): loaded in 9.8 s, 220 MB of audio, tab 279 MB, no stutter. **Failed with whole songs:** 708 MB of audio, tab 831 MB. |
| 2 | **Passed:** 90% and 110% clean, 2.4–7.4 s (whole songs slower). Practice speeds (parts only): 75% clean; 60% and 50% some warble but usable; all under 10 s. |
| 3 | **Passed:** 8 of 8 right by ear, 0.1–0.5 s each. One song ("BbY WOW") came out 160 BPM from the whole song and 120 from the part; the user isn't sure which is right, so detection can depend on what it hears. Fixing BPM by hand stays a requirement. |
| 4 | **Passed:** MP3 of the 9.7-minute mix in 40.7 s (parts only; 13.3 MB). Long enough that the real app should show progress. |
| 5 | **Passed** on the user's Windows PC (localhost, Chrome, two Gmail accounts, 2026-11-10): Gmail A picked a song and saved a `.gpsmix`; shared as Viewer, Gmail B opened it play-only (Drive's `canEdit` false) and a save was refused (403); shared as Editor, Gmail B opened it editable and a save went through; the song inside played. Not yet run on the Chromebook or from the live address. **Open:** the Picker API key only works with no website restriction (see [LESSONS.md](../LESSONS.md), "Google"). |
| 6 | **Passed** 2026-11-05: the live site opened on the Dell 3120 at school (school network, staff login). Still to do: confirm once with a student login, since filters can differ by account. |

## What's built now

- **Starter page** ([src/App.tsx](../../src/App.tsx), checks in [src/deviceCheck.ts](../../src/deviceCheck.ts)): "Will it work on this computer?" Shows browser, memory (Chrome rounds it and caps it at 8 GB), Web Audio, WASM, and the address reached, with a **Copy these results** button. Replaced by the real app later.
- **Checks:** `npm run check` = TypeScript type check + Vitest. GitHub Actions runs them on every push and pull request; pushes to `main` that pass are published to GitHub Pages ([.github/workflows/deploy.yml](../../.github/workflows/deploy.yml)).
- **Paths:** the site lives at `/GPSdance/` (`base` in `vite.config.ts`), in dev and preview too.
- **Versions:** pinned exactly in `package.json` (Vite 8.3.5, React 19.3.1, TypeScript 7.0.2, Vitest 5.1.0; audio: signalsmith-stretch 1.3.2, web-audio-beat-detector 8.2.39, @breezystack/lamejs 1.2.7), Node 22 (`.nvmrc`).
- **Three pages:** `index.html` (device check), `poc/index.html` (tests 1–4) and `drive-test/index.html` (test 5), all listed in `build.rollupOptions.input` in `vite.config.ts`.
- **Google code** ([src/google/](../../src/google/)), meant to carry over to the real app: [config.ts](../../src/google/config.ts) (client ID, Picker key, project number: all public by design), [google.ts](../../src/google/google.ts) (sign-in with a token kept in memory only, the Picker, Drive calls; uploads are resumable, so no 5 MB limit), [gpsmix.ts](../../src/google/gpsmix.ts) (write and read the `.gpsmix` zip; songs stored uncompressed).

## Proof-of-concept page (tests 1–4)

At `/GPSdance/poc/` (code in [src/poc/](../../src/poc/), its own entry `poc/index.html`), linked from the device check. A test bench, not the real app; it goes away once the proof of concept is done.

- **Songs** are picked with the browser's file chooser (on a Chromebook that includes Google Drive). Nothing is uploaded.
- **Keep in memory:** whole songs, or only the parts the mix uses (`?keep=parts` in the address; switching reloads the page so memory starts fresh).
- **Test mix:** the first 8 songs, 75 s each from 30 s in, 3-second crossfades, about 10 minutes ([mixPlan.ts](../../src/poc/mixPlan.ts)). The same plan drives live playback and the offline render, so they match.
- **Speed:** 50%, 60%, 75%, 90% and 110%, Signalsmith Stretch rendered offline (`OfflineAudioContext` + its audio worklet). **BPM:** web-audio-beat-detector `guess()`; version 8.2.39 returns only the rounded BPM and first beat (no exact tempo), so the click-along can drift slightly late in long songs. **MP3:** 192 kbps in a Web Worker ([mp3.worker.ts](../../src/poc/mp3.worker.ts)), so lamejs is bundled as its own file.
- **Copy all results** puts a text summary with PASS/FAIL marks (limits from the table above) on the clipboard. Tab memory can't be read by the page on GitHub Pages, so the tester types it in from Chrome's Task Manager (Search + Esc).

## Test 5 page (Drive sharing)

At `/GPSdance/drive-test/` (code in [src/drivetest/](../../src/drivetest/)). Steps on the page: sign in as Gmail A → pick a song from Drive → save as a project (`.gpsmix` in My Drive, type `application/zip`) → share it in Drive → switch to Gmail B → open it (the Picker's second tab is "Shared with me") → try saving a change. Drive's `capabilities.canEdit` decides editor vs. play-only. A "What happened" list records each step. In the test project's `project.json`, only the title, song list and a save counter.

## Setup the user does

1. **Done 2026-11-10:** personal Google Cloud project **GPSdance test** (project number 1079259439393), owned by the user's Gmail, in testing mode with two test Gmail accounts. Drive API and Google Picker API on; consent screen External, scope `drive.file` only; OAuth client "GPSdance web" (JavaScript origins `http://localhost:5173` and `https://chrishudson918.github.io`, no redirect URIs); API key "GPSdance Picker key" (Google Picker API only, no website restriction; see LESSONS.md).
2. **Done:** **GitHub Pages** for the repo (built by Actions).
3. Later: the district Google Cloud project + Admin console trust (the coworker), and the final address allowed through the web filter.
