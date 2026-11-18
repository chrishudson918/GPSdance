# Roadmap

Ideas go on here only with the user's yes, after a check against [VISION.md](VISION.md).

## Milestones

- **R1 — January 1, 2027:** Editor basics, transitions + sound effects, Player + set list, sharing + versions. See [REQUIREMENTS.md](REQUIREMENTS.md) §2–5.
- **R2 — shortly after:** automatic bad-word finding (in-browser speech recognition). §6.

## Now

- Chromebook proof of concept (6 tests; [design/tech-stack.md](design/tech-stack.md)), the build-vs-buy decision point. All six have passed; left: test 5 on the Chromebook from the live address, test 6 with a student login, and fixing the Picker key's website restriction.
- Long-show memory test on the Dell 3120 (page built 2026-11-18). First run: straight play passed; jumps peaked at about 686 MB (limit 500). Fixes are live; a short jumps-only re-run is next. See [design/player.md](design/player.md).

## Done

- Project setup and the GitHub repo (2026-11-05).
- Build-vs-buy write-up; recommendation approved (2026-11-05).
- Tech stack chosen (2026-11-05).
- Starter code + GitHub Pages deploy; device-check page live (2026-11-05).
- Proof-of-concept test 6 (web filter) passed on the Dell 3120 Chromebook, staff login (2026-11-05).
- Proof-of-concept page for tests 1–4 built and live (2026-11-10).
- Tests 1–4 passed on the Dell 3120 with real songs, keeping only the parts the mix uses (2026-11-10).
- Google Cloud test project set up; test 5 (Drive sharing) page built and passed on the user's PC (2026-11-10).
- Editor and Player mockups (three clickable options each); the user picked option A for both (2026-11-18). [design/editor.md](design/editor.md), [design/player.md](design/player.md).

## Next

- Editor build plan (interview: build order, first runnable version), then the build.
- Pilot group set up.

## Later

- Move hosting to Firebase in the district's Google Cloud project.
- Allow-list request for the web filter; trust request for the Workspace admin.
- Handoff docs for the next maintainer.

## Maybe

- Offline play in the Player.
- A department-wide shared bad-word list.

## Rejected (for now)

- Vocal-only word removal (stem separation): too heavy for Chromebooks; reversing is enough. (User, 2026-11-05)
- Live Google Docs-style co-editing: needs a server; one editor at a time is enough. (User, 2026-11-05)
- Server or paid cloud processing: on-device is free and private. (User, 2026-11-05)
- Countdown / delay start in the Player: Play should start right away; the count-in is enough. (User, 2026-11-18)
- Reordering or adding songs in the Player: the Player is playback only; the order comes from the Editor. (User, 2026-11-18)
