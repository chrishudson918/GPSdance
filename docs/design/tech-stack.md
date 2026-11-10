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
| Tempo change, same pitch | **Signalsmith Stretch** | MIT | Good quality, runs in the browser (WASM); best for 0.75×–1.5×, which covers dance tempo changes |
| BPM and beats | **web-audio-beat-detector** (BPM + first beat) + our own beat grid, adjustable by hand | MIT | Small and simple; accuracy to be checked on the department's real songs |
| Volume leveling | **Our own loudness meter** (the broadcast LUFS standard) | — | About 100 lines; no dependency needed |
| Export | **WAV:** our own writer · **MP3:** lamejs (the `@breezystack/lamejs` fork), kept as its own file | — / LGPL | WAV is trivial; lamejs is the standard browser MP3 encoder. The fork is the same encoder repackaged; the original (last updated 2017) is known to break in modern build tools like Vite (user's OK, 2026-11-10) |
| Waveforms | **Our own canvas drawing** from small precomputed summaries | — | Fast even for long mixes |
| Project bundle | **fflate** (zip) | MIT | One project = one file (see below) |
| Google | **Google Identity Services** + **Google Picker** + **Drive API v3**, scope **`drive.file`** | — | The app sees only files the user picks or the app made; the scope that needs no Google security review |
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

Chrome keeps decoded audio as 32-bit numbers at the device's sample rate (usually 48 kHz), so a decoded song takes about **23 MB per stereo minute** in memory (the first estimate, 10 MB, was too low). Ten whole 3.5-minute songs are about 800 MB; a 10-minute mix render needs about 220 MB more. The fallback is to keep only the parts of each song the mix uses (a 10-minute show is then about 230 MB), or to decode on demand (Chrome's WebCodecs). The proof-of-concept page measures both ways on the Chromebook.

## Proof of concept (about 2 weeks; the build-vs-buy decision point)

A bare-bones page, not the real app, tested on a **student Chromebook** and a district Windows PC:

| # | Test | Pass if |
|---|---|---|
| 1 | Load a 10-minute, 8-song mix; play it with crossfades | No stutter; tab stays under ~500 MB; loads in < 30 s |
| 2 | Tempo change on a song (90%, 110%) | **The user listens:** no obvious warble; processing < 10 s per song |
| 3 | BPM detection on 10 of the department's songs | Right on at least 8 (half/double counts as fixable by hand) |
| 4 | Export the 10-minute mix to MP3 | Finishes in < 2 minutes on the Chromebook |
| 5 | Drive: sign in with Gmail, pick a song, save a `.gpsmix`, share it with a second Gmail as Viewer and as Editor | It opens for the second account, play-only vs. editable |
| 6 | Open the test page on a student Chromebook at school | Gets past the web filter (`github.io`) |

The user (and later the pilot group) judges anything heard by ear. Claude measures the times and memory.

**Test device:** a Dell Chromebook 3120, about 4 GB memory, ChromeOS with Chrome 148. A budget education model, so tests 2 and 4 (processor-heavy) are the ones most at risk.

**Results so far**

| # | Result |
|---|---|
| 1–4 | Test page built and live (2026-11-10). On the user's Windows PC with 9 synthetic 2:50 beat tracks: load 3.8 s; audio in memory 560 MB whole songs vs. 247 MB parts only; speed change 2–4 s per song, beats exactly on the new tempo; BPM 1.8 s for all, but right on only 5 of 9 synthetic tracks (real songs decide); MP3 of the 9:39 mix in 17.5 s (13.3 MB). Not yet run on the Chromebook. |
| 6 | **Passed** 2026-11-05: the live site opened on the Dell 3120 at school (school network, staff login). Still to do: confirm once with a student login, since filters can differ by account. |

## What's built now

- **Starter page** ([src/App.tsx](../../src/App.tsx), checks in [src/deviceCheck.ts](../../src/deviceCheck.ts)): "Will it work on this computer?" Shows browser, memory (Chrome rounds it and caps it at 8 GB), Web Audio, WASM, and the address reached, with a **Copy these results** button. Replaced by the real app later.
- **Checks:** `npm run check` = TypeScript type check + Vitest. GitHub Actions runs them on every push and pull request; pushes to `main` that pass are published to GitHub Pages ([.github/workflows/deploy.yml](../../.github/workflows/deploy.yml)).
- **Paths:** the site lives at `/GPSdance/` (`base` in `vite.config.ts`), in dev and preview too.
- **Versions:** pinned exactly in `package.json` (Vite 8.3.5, React 19.3.1, TypeScript 7.0.2, Vitest 5.1.0; audio: signalsmith-stretch 1.3.2, web-audio-beat-detector 8.2.39, @breezystack/lamejs 1.2.7), Node 22 (`.nvmrc`).
- **Two pages:** `index.html` (device check) and `poc/index.html` (tests 1–4), both listed in `build.rollupOptions.input` in `vite.config.ts`.

## Proof-of-concept page (tests 1–4)

At `/GPSdance/poc/` (code in [src/poc/](../../src/poc/), its own entry `poc/index.html`), linked from the device check. A test bench, not the real app; it goes away once the proof of concept is done.

- **Songs** are picked with the browser's file chooser (on a Chromebook that includes Google Drive). Nothing is uploaded.
- **Keep in memory:** whole songs, or only the parts the mix uses (`?keep=parts` in the address; switching reloads the page so memory starts fresh).
- **Test mix:** the first 8 songs, 75 s each from 30 s in, 3-second crossfades, about 10 minutes ([mixPlan.ts](../../src/poc/mixPlan.ts)). The same plan drives live playback and the offline render, so they match.
- **Speed:** Signalsmith Stretch rendered offline (`OfflineAudioContext` + its audio worklet). **BPM:** web-audio-beat-detector `guess()`; version 8.2.39 returns only the rounded BPM and first beat (no exact tempo), so the click-along can drift slightly late in long songs. **MP3:** 192 kbps in a Web Worker ([mp3.worker.ts](../../src/poc/mp3.worker.ts)), so lamejs is bundled as its own file.
- **Copy all results** puts a text summary with PASS/FAIL marks (limits from the table above) on the clipboard. Tab memory can't be read by the page on GitHub Pages, so the tester types it in from Chrome's Task Manager (Search + Esc).

## Setup the user does (click-by-click steps when we get there)

1. A **personal Google Cloud project** (Gmail), in testing mode, with two test Gmail accounts. That gives an OAuth client ID and a Picker API key, both fine in public code.
2. Turn on **GitHub Pages** for the repo (built by Actions).
3. Later: the district Google Cloud project + Admin console trust (the coworker), and the final address allowed through the web filter.
