# Status

**Updated:** 2026-11-18 · **Deadline:** January 1, 2027 (R1 features), 44 days away

## Where things stand

- Discovery, [VISION.md](VISION.md), [REQUIREMENTS.md](REQUIREMENTS.md), the [tech stack](design/tech-stack.md) and the build-vs-buy recommendation are approved (build; GoldWave Infinity trial as the fallback). Shared doc: https://claude.ai/artifact/2XYgz1csbokRFJyseGsAtk.
- **The proof of concept passed all six tests** (numbers in [design/tech-stack.md](design/tech-stack.md)). Design rule: keep only what's in use in memory.
- **Mockups done; option A picked for both screens.** Decisions: [design/editor.md](design/editor.md) and [design/player.md](design/player.md). Set list = the project's song order in the Editor.
- **Long-show memory test** (page `/long-show/`, built 2026-11-18). First Dell 3120 run, 10 real songs, 39:32:
  - Straight play **passed**: all 9 song changes on time, at most 215 MB of audio held.
  - Jumps: **quick start passed** (0.9 s); whole song first failed (1.7–3.0 s), so the Player will use quick start.
  - Tab memory **failed around jumps**: about 686 MB (limit 500).
  - Two fixes are live (commit 07d35c5): the next song loads 15 s after a jump, and audio runs at 44.1 kHz. Not yet re-run on the Dell.
- **Live pages:** https://chrishudson918.github.io/GPSdance/ (device check), `/poc/` (tests 1–4), `/drive-test/` (test 5), `/long-show/` (long-show test), `/mockups/editor/` and `/mockups/player/`.
- **Google Cloud test project** "GPSdance test" is set up. Its Picker key has no website restriction (see [LESSONS.md](LESSONS.md), "Google").

## Next

1. **Jumps-only re-run on the Dell 3120** (about 5 minutes): Quick start on; jump to 4–5 songs about 20 s apart; one jump at 75%; note the Task Manager peak; copy the results and paste them in chat. Check that the results say "Audio clock: 44100 Hz". If the peak is still over 500 MB: decode songs in small pieces (the option set aside this session).
2. **Editor build plan:** interview the build order and the first runnable version, then build after the user's OK.
3. Run test 5 on the Dell from the live address (`/drive-test/`), to check that the Picker gets through the web filter.
4. Work out the Picker key's website restriction before the district's real key is made.
5. Once the first build runs: review the user's UX ideas parked in design/editor.md.

## Waiting on the user (no rush)

- Open the live page once with a **student login** to confirm test 6.
- Listen to "BbY WOW" with the click-along: is it 160 or 120 BPM?
- GoldWave Infinity trial on the Dell 3120 (free evaluation mode), plus asking GoldWave about education pricing.
- Who manages the web filter.
- Heads-up to the Workspace admin coworker.
- Who is in the pilot group; any district rules for new software; a fun app name.

## Set aside

- Pulling test results automatically (the page saves them to Drive; Claude reads them through Claude in Chrome or Drive for desktop). The user chose copy-paste for now (2026-11-18); likely easy once the real app saves to Drive.

## Not checked yet

- The jump fixes on the Dell (memory peak, and whether it accepts a 44.1 kHz audio clock).
- A practice speed during a long show on the Dell.
- The mockups on the Dell itself.
- Test 5 on the Chromebook and from the live address.
- Anything on a district Windows PC.
- Crossfades judged by ear.
- How 8-counts are numbered through a 3/4 or 6/8 song (decide when the ruler is built).
