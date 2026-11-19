# Status

**Updated:** 2026-11-19 · **Deadline:** January 1, 2027 (R1 features), 43 days away

## Where things stand

- Discovery, [VISION.md](VISION.md), [REQUIREMENTS.md](REQUIREMENTS.md), the [tech stack](design/tech-stack.md) and the build-vs-buy recommendation are approved (build; GoldWave Infinity trial as the fallback). Shared doc: https://claude.ai/artifact/2XYgz1csbokRFJyseGsAtk.
- **The proof of concept passed all six tests** (numbers in [design/tech-stack.md](design/tech-stack.md)). Design rule: keep only what's in use in memory.
- **Mockups done; option A picked for both screens.** Decisions: [design/editor.md](design/editor.md) and [design/player.md](design/player.md). Set list = the project's song order in the Editor.
- **Long-show memory test** (page `/long-show/`) on the Dell 3120, 10 real songs:
  - Straight play at 100% passed (2026-11-18); jumps at 100% pass (0.2–0.6 s).
  - **Practice speeds are now slowed live while the song plays** (2026-11-19), instead of making slowed copies (which took 15–21 s per jump and about 1 GB). Short runs at 75%: jumps 0.4–0.7 s, tab 250 MB, speed tool at most 35% of the processor, no gaps heard.
  - Two bugs in the speed library are fixed in our wrapper ([LESSONS.md](LESSONS.md), "Audio").
  - Known item: 1–3 tiny dropouts early in the first song, never heard; cause unknown.
- **Live pages:** https://chrishudson918.github.io/GPSdance/ (device check), `/poc/` (tests 1–4), `/drive-test/` (test 5), `/long-show/` (long-show test), `/mockups/editor/` and `/mockups/player/`.
- **Google Cloud test project** "GPSdance test" is set up. Its Picker key has no website restriction (see [LESSONS.md](LESSONS.md), "Google").

## Next

1. **Full 40-minute long-show run on the Dell at 75%:** Quick start on; let it run to the end (all 9 song changes); a jump or two; keep the screen awake; Task Manager open, enter the peak; copy the results and paste them in chat. Pass = tab under 500 MB to the end, no late songs, nothing heard.
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

- A full show at a practice speed on the Dell (memory over 40 minutes, all song changes).
- 50% and 60% by ear with live slowing.
- What causes the early dropouts; whether a tab playing sound survives a locked screen.
- The mockups on the Dell itself.
- Test 5 on the Chromebook and from the live address.
- Anything on a district Windows PC.
- Crossfades judged by ear.
- How 8-counts are numbered through a 3/4 or 6/8 song (decide when the ruler is built).
