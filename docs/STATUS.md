# Status

**Updated:** 2026-11-18 · **Deadline:** January 1, 2027 (R1 features), 44 days away

## Where things stand

- Discovery, [VISION.md](VISION.md), [REQUIREMENTS.md](REQUIREMENTS.md), the [tech stack](design/tech-stack.md) and the build-vs-buy recommendation are approved (build; GoldWave Infinity trial as the fallback). Shared doc: https://claude.ai/artifact/2XYgz1csbokRFJyseGsAtk.
- **The proof of concept passed all six tests** (numbers in [design/tech-stack.md](design/tech-stack.md)). Design rule from tests 1–4: keep only the parts of each song the mix uses in memory.
- **Mockups done; option A picked for both screens** (2026-11-18). Decisions: [design/editor.md](design/editor.md) and [design/player.md](design/player.md).
  - Editor: dark look, one row per song, toolbar on top, settings beside each row; a Time / Measures / 8-counts ruler with a grid that follows each song's tempo (settled now because it changes the project file).
  - Player: playback only; Play starts right away; speed presets; count-in on section jumps; a Big view for across the room.
  - **Set list = the project's song order in the Editor**, no extra files. A whole show can be one long project, so the app must load only what's needed.
- **Live pages:** https://chrishudson918.github.io/GPSdance/ (device check), `/poc/` (tests 1–4), `/drive-test/` (test 5), `/mockups/editor/` and `/mockups/player/` (mockups, no real audio).
- **Google Cloud test project** "GPSdance test" is set up. Its Picker key has no website restriction (the Picker rejected the key with one); see [LESSONS.md](LESSONS.md), "Google".

## Next

1. **Long-show memory test on the Dell 3120:** about 30 minutes, 10 songs, with the Player holding only the current and next song. It decides whether "set list = song order" works as planned.
2. **Editor build plan:** interview the build order and the first runnable version, then build after the user's OK.
3. Run test 5 on the Dell from the live address (`/drive-test/`), to check that the Picker gets through the web filter.
4. Work out the Picker key's website restriction before the district's real key is made.
5. Once the first build runs: review the user's UX ideas parked in design/editor.md (toolbar buttons, row resizing, wheel zoom).

## Waiting on the user (no rush)

- Open the live page once with a **student login** to confirm test 6.
- Listen to "BbY WOW" with the click-along: is it 160 or 120 BPM?
- GoldWave Infinity trial on the Dell 3120 (free evaluation mode), plus asking GoldWave about education pricing.
- Who manages the web filter.
- Heads-up to the Workspace admin coworker.
- Who is in the pilot group; any district rules for new software; a fun app name.

## Not checked yet

- The mockups on the Dell itself (only checked at Dell size in a browser on the PC).
- Test 5 on the Chromebook and from the live address.
- Anything on a district Windows PC.
- Crossfades judged by ear.
- How 8-counts are numbered through a 3/4 or 6/8 song (decide when the ruler is built).
