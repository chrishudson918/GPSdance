# Vision

> Approved by the user 2026-11-05. Changes need the user's OK.

## The one thing

**The specific screwdrivers and a hammer or two, not the construction worker's tool shed.**

A simple web app where Gilbert Public Schools dance instructors and students build routine music (cut, fade, change tempo, blend songs, clean up lyrics) and play it at practice. Nothing more.

Every feature idea is checked against this line. If it makes the app feel like a pro audio editor, it doesn't belong.

## Why build instead of buy

Today the instructors use a patchwork: GoldWave, Audacity, GarageBand on personal devices. All of them:

- do far more than a dance mix needs, which makes the few tools they use harder to find and learn;
- don't work with Google Drive, where the department's music already lives;
- treat sharing as "email the file", with no way to hand another instructor an editable project or a play-only version;
- have no practice player (named sections, loops, count-in, set lists);
- leave bad-word cleanup to a person listening through and selecting each word by hand. GoldWave has a Censor tool and transcription, but they aren't connected;
- mostly don't run on Chromebooks. GoldWave's browser version, Infinity, is the exception (still to be tested on a district Chromebook).

Details: [build-vs-buy.md](build-vs-buy.md).

## Who it's for

- **Instructors** (6 at the start, district high schools): somewhat comfortable with editing software. They can do basic cuts and fades but find pro tools confusing.
- **Students:** make and edit mixes too, and practice to shared mixes.
- Everyone signs in with their district Google account. Everything stays inside the district's Google Workspace.

## What it does

1. **Edit:** open songs from Google Drive; cut, fade, change tempo (same pitch); blend songs with crossfades, beat-matched transitions or sound-effect bridges; optionally lock the whole mix to one BPM; level the volume; reverse inappropriate words; save to Drive or download MP3/WAV.
2. **Play:** practice to a finished mix with named sections, looping, practice speed, a metronome count-in and a countdown; line routines up in a set list for a show.
3. **Share:** give a project to another instructor or a student as **editable** or **play-only**, using Drive's own sharing.

## Principles

- **Small toolbox.** A short, obvious set of tools on a clear timeline. No mixing desk, no effects rack, no menus of options nobody uses.
- **Works on Chromebooks and Windows PCs.** It runs in the browser, with nothing to install.
- **Student data stays out of the app.** No accounts or database of our own. Projects are files in the user's own Drive, and audio is processed on the device.
- **Free to run.** Static files only; no servers to pay for or maintain.
- **Originals are never touched.** Edits live in the project, and the source songs stay as they were.
- **Someone else can take it over.** The code and docs are plain enough for another IT staff member to maintain.

## Not this app (for now)

- A full audio workstation: multitrack recording, effects plugins, EQ, mastering.
- Live co-editing like Google Docs (one editor at a time is enough).
- Vocal separation (removing only the singer's voice). Reversing the word is enough.
- Music from streaming services (Spotify, Apple Music, YouTube).
- Use outside the district.
