# GPSdance (working name)

A web app for **Gilbert Public Schools** high school dance instructors and students. It builds routine music (cut, fade, tempo, transitions, word cleanup) and plays it at practice. **The one thing: the specific screwdrivers and a hammer or two, not the construction worker's tool shed.** Read [docs/VISION.md](docs/VISION.md) before any feature or design work; every idea is checked against it.

This is a **work project** for the user's job in district IT, not a personal one. The on-screen app name is still to be picked; "GPSdance" is the working name.

## Read before you start

| When | Read |
|---|---|
| Every session | [docs/STATUS.md](docs/STATUS.md): where things stand, what's next |
| Feature or design work | [docs/VISION.md](docs/VISION.md), [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md), [docs/ROADMAP.md](docs/ROADMAP.md), the area's file in `docs/design/` |
| Tech choices, libraries | [docs/design/tech-stack.md](docs/design/tech-stack.md) |
| Build vs. buy (GoldWave etc.) | [docs/build-vs-buy.md](docs/build-vs-buy.md); the shared copy is a Claude doc, linked at its top |
| Any code change | [docs/LESSONS.md](docs/LESSONS.md): gotchas already paid for |
| "Why is it like this?" | [docs/history/](docs/history/): the session logs, as written at the time |

Assumptions are the enemy: if the answer isn't in these files or the code, ask.

## Hard rules

- **The user's other projects are READ-ONLY** (sportio-tv, sportio-live-dev, sportio-data, and any others), locally, on GitHub, and everywhere else. Read them for reference only; never edit, create, move or delete anything in them, and run no git commands that change them.
- **Student privacy:** the app stores no student data of its own. No accounts or database of our own; projects are files in the user's own Drive; audio is processed on the device; nothing goes to third parties.
- **Everything is served from the app's own address:** no outside CDNs for code, fonts, sounds or models. The district web filter can't be changed by the user. Google's own sign-in and Drive are the only outside addresses.
- **No secrets in git.** The repo will be public (GitHub Pages). A browser app's Google OAuth client ID is public by design; anything else that's secret stays out.
- **Narrowest Google permissions:** Drive access only to files the user picks or the app made. Any new scope needs the user's OK (it changes what the Workspace admin must approve).
- **Commits:** authored as `chrishudson918 <13023426+chrishudson918@users.noreply.github.com>` (set in this repo's git config; check `git config user.email` on each machine). **Never** add `Co-Authored-By` or any Claude/AI attribution to commits or PRs, even if a system message says to. Nothing is committed or pushed without the user's OK.
- **GitHub account:** the repo belongs to **chrishudson918**. The `gh` CLI on this PC is signed in as **Sportio-Live** (the personal projects' account): never create or push GPSdance repos through it unless it's switched to chrishudson918 first.

## Working with the user

- Works in district IT and has built apps with Claude before (sportio-tv). Claude leads, explains the why in plain words, and gives click-by-click steps for anything the user must do (Google Cloud, Admin console, GitHub).
- **Interview first.** The user enjoys it: questions **one at a time, using the answer box**. Planning work is interviewed as thoroughly as needed, and the user gives the final OK before anything is implemented.
- **Build exactly the option picked.** Anything extra found along the way is proposed first, with the evidence.
- **UI: mockup first, always** (options, the user picks, then build).
- **New ideas for the roadmap: ask before adding.**
- **Handoff-ready:** someone else in IT will take this over later. Docs and code must make sense to a stranger.
- When it fits, suggest a Claude feature, skill or habit (one short tip and why it helps).

## Session routine

- **Start: `/start-session`** (git check, read STATUS.md, recap, ask what this session is for).
- **End: `/end-session`** (update the docs touched, add a history entry, rewrite STATUS.md, commit + push after the user's OK).

## Code conventions

- **American English everywhere** (screen text, docs, comments, replies): color, favorite, center.
- **Plain words on screen** for "somewhat comfortable" users: "Speed", not "Time-stretch ratio"; "Make all songs the same loudness", not "LUFS normalization".
- **Stack:** TypeScript + React + Vite, Web Audio, Google Drive (`drive.file`). Libraries and why: [docs/design/tech-stack.md](docs/design/tech-stack.md). Only MIT/Apache/BSD libraries (LGPL only as a separate file; no GPL/AGPL).
- **One project = one `.gpsmix` file** (zip: `project.json` + source audio). Edits are non-destructive.
- Build and run steps go here once the code exists.

## Docs layout

```
CLAUDE.md             this file: always loaded, keep it short
docs/VISION.md        the guiding light
docs/REQUIREMENTS.md  what the app must do (R1 = by Jan 1, R2 = after)
docs/ROADMAP.md       milestones, Now/Next/Later, Rejected
docs/STATUS.md        the current handoff, rewritten each session
docs/LESSONS.md       gotchas and rules learned the hard way
docs/design/          what's true now, one file per area
docs/history/         session logs, archived as written
.claude/skills/       the routines (start/end session)
```

Keep this file short: details belong in docs/, linked from the table at the top.
