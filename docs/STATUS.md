# Status

**Updated:** 2026-11-10 · **Deadline:** January 1, 2027 (R1 features), 52 days away

## Where things stand

- Discovery, [VISION.md](VISION.md), [REQUIREMENTS.md](REQUIREMENTS.md), the [tech stack](design/tech-stack.md) and the build-vs-buy recommendation are approved (build; GoldWave Infinity trial as the fallback). Shared doc: https://claude.ai/artifact/2XYgz1csbokRFJyseGsAtk.
- **The proof of concept supports building it ourselves: all six tests have passed.** Numbers are in [design/tech-stack.md](design/tech-stack.md), "Results so far".
  - Tests 1–4 on the Dell 3120 with 8 real songs: they pass **only when the app keeps just the parts of each song the mix uses** (tab 279 MB). Whole songs fail (831 MB, and a crash). That's now a design rule.
  - Practice speeds: 75% sounds clean; 60% and 50% have some warble but are usable for practice.
  - Test 5 (Drive sharing) passed on this PC: a `.gpsmix` shared as Viewer opens play-only, and shared as Editor it opens editable, using only `drive.file`.
- **Live pages:** https://chrishudson918.github.io/GPSdance/ (device check), `/poc/` (tests 1–4), `/drive-test/` (test 5).
- **Google Cloud test project** "GPSdance test" is set up (details in tech-stack.md, "Setup"). Its Picker key has **no website restriction**, because the Picker rejected the key with one. The key is still limited to the Picker API. See [LESSONS.md](LESSONS.md), "Google".

## Next

1. **Editor and Player mockups** (options first; the user picks before anything is built). Things to bring in: keeping only the parts in memory, a "Getting it ready…" message for practice speed, a progress bar for MP3 export, fixing a wrong BPM by hand, and maybe a hint that very slow speeds sound rougher (just an idea, not agreed).
2. Run test 5 on the Dell 3120 from the live address (`/drive-test/`), to check that the Picker gets through the web filter.
3. Work out the Picker key's website restriction before the district's real key is made.

## Waiting on the user (no rush)

- Open the live page once with a **student login** to confirm test 6.
- Listen to "BbY WOW" with the click-along: is it 160 or 120 BPM?
- GoldWave Infinity trial on the Dell 3120 (free evaluation mode), plus asking GoldWave about education pricing.
- Who manages the web filter.
- Heads-up to the Workspace admin coworker.
- Who is in the pilot group; any district rules for new software; a fun app name.

## Not checked yet

- Test 5 on the Chromebook and from the live address.
- Anything on a district Windows PC.
- Crossfades judged by ear (the mix played with no stutter, but transition quality wasn't rated).
