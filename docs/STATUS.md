# Status

**Updated:** 2026-11-05 · **Deadline:** January 1, 2027 (R1 features), 57 days away

## Where things stand

- Discovery done. [VISION.md](VISION.md), [REQUIREMENTS.md](REQUIREMENTS.md) and the [tech stack](design/tech-stack.md) are approved.
- Build vs. buy: the recommendation is approved (build, with a GoldWave Infinity trial as the fallback). Shared doc: https://claude.ai/artifact/2XYgz1csbokRFJyseGsAtk · repo copy [build-vs-buy.md](build-vs-buy.md).
- Repo: https://github.com/chrishudson918/GPSdance (public).
- **No code yet.**

## Next

1. **Proof of concept** (about 2 weeks; the build-vs-buy decision point). Six tests on a student Chromebook and a district Windows PC: long-mix playback, tempo quality, BPM accuracy, MP3 export time, Drive sharing as Viewer/Editor, the web filter. Plan in [design/tech-stack.md](design/tech-stack.md).
   - First: scaffold Vite + React + TypeScript, and deploy to GitHub Pages.
   - The user sets up a personal Google Cloud project (testing mode, two Gmail test accounts). Claude gives click-by-click steps.
2. Editor and Player mockups (the user picks before anything is built).

## Waiting on the user (no rush)

- Borrow a **student Chromebook** (note its model and RAM).
- Pick **8–10 of the department's real songs** for testing. They stay on the PC in `test-audio/` and never go in git.
- GoldWave Infinity trial on that Chromebook (free evaluation mode), plus asking GoldWave about education pricing.
- Who manages the web filter; does `github.io` open on a student Chromebook?
- Heads-up to the Workspace admin coworker.
- Who is in the pilot group; any district rules for new software; a fun app name.
