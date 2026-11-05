# Status

**Updated:** 2026-11-05 · **Deadline:** January 1, 2027 (R1 features), 57 days away

## Where things stand

- Discovery, [VISION.md](VISION.md), [REQUIREMENTS.md](REQUIREMENTS.md), the [tech stack](design/tech-stack.md) and the build-vs-buy recommendation are approved (build; GoldWave Infinity trial as the fallback). Shared doc: https://claude.ai/artifact/2XYgz1csbokRFJyseGsAtk.
- **Starter code is live:** https://chrishudson918.github.io/GPSdance/ is a "Will it work on this computer?" device-check page. Every push to `main` runs the type check + tests, then publishes. Run steps: [README.md](../README.md).
- **Test Chromebook:** Dell Chromebook 3120, about 4 GB memory, Chrome 148.
- **Proof of concept, test 6 (web filter): passed** on that Chromebook at school (staff login). Tests 1–5 not started.

## Next

1. **Proof of concept, tests 1–4** (long-mix playback, speed quality, BPM accuracy, MP3 export time) on a bare-bones test page. Needs the department's test songs in `test-audio/` (never in git). Plan in [design/tech-stack.md](design/tech-stack.md).
2. **Test 5 (Drive sharing):** the user sets up a personal Google Cloud project (testing mode, two Gmail test accounts). Claude gives click-by-click steps.
3. Editor and Player mockups (the user picks before anything is built).

## Waiting on the user (no rush)

- Pick **8–10 of the department's real songs** for testing; put them in `test-audio/` on this PC.
- Open the live page once with a **student login** to confirm test 6.
- GoldWave Infinity trial on the Dell 3120 (free evaluation mode), plus asking GoldWave about education pricing.
- Who manages the web filter.
- Heads-up to the Workspace admin coworker.
- Who is in the pilot group; any district rules for new software; a fun app name.

## Not checked yet

- Tests 1–5 of the proof of concept; anything on a district Windows PC.
