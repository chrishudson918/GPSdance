# Status

**Updated:** 2026-11-10 · **Deadline:** January 1, 2027 (R1 features), 52 days away

## Where things stand

- Discovery, [VISION.md](VISION.md), [REQUIREMENTS.md](REQUIREMENTS.md), the [tech stack](design/tech-stack.md) and the build-vs-buy recommendation are approved (build; GoldWave Infinity trial as the fallback). Shared doc: https://claude.ai/artifact/2XYgz1csbokRFJyseGsAtk.
- **Live:** https://chrishudson918.github.io/GPSdance/ (device check) and **https://chrishudson918.github.io/GPSdance/poc/** (proof-of-concept tests 1–4, commit 8cdede3). How the test page works: [design/tech-stack.md](design/tech-stack.md), "Proof-of-concept page".
- **Test Chromebook:** Dell Chromebook 3120, about 4 GB memory, Chrome 148. Test 6 (web filter) passed there with a staff login.
- **Measured on this PC only** (synthetic beat tracks): loading, speed change and MP3 export are well inside the limits. Two warnings for the Chromebook run:
  - **Memory:** decoded audio is about 23 MB per minute, not the 10 MB first estimated. Whole songs will likely break test 1's 500 MB limit; the page's "only the parts the mix uses" switch cuts it to about a third.
  - **BPM:** right on only 5 of 9 synthetic tracks. Real songs decide test 3.
- Git on this PC always uses the chrishudson918 GitHub login for this repo (other PCs: one command in [LESSONS.md](LESSONS.md)).

## Next

1. **The user runs tests 1–4 at work on the Dell 3120**, with the songs in a Drive folder: first with "Whole songs", then with "Only the parts the mix uses". Copy the results each time and paste both into the next session (start it with `/start-session`). Steps: pick songs → Play mix (Task Manager: Search + Esc, type in the tab's memory) → Make 90% / 110% and rate them → Find BPM, click-along, mark each song → Make MP3 → Copy all results.
2. Read the results together: pass/fail per test, and whether whole songs or parts-only is the way forward. This is the build-vs-buy decision point.
3. **Test 5 (Drive sharing):** the user sets up a personal Google Cloud project (testing mode, two Gmail test accounts). Claude gives click-by-click steps.
4. Editor and Player mockups (the user picks before anything is built).

## Waiting on the user (no rush)

- Pick **8–10 of the department's real songs** and put them in a Google Drive folder (needed for step 1).
- Open the live page once with a **student login** to confirm test 6.
- GoldWave Infinity trial on the Dell 3120 (free evaluation mode), plus asking GoldWave about education pricing.
- Who manages the web filter.
- Heads-up to the Workspace admin coworker.
- Who is in the pilot group; any district rules for new software; a fun app name.

## Not checked yet

- Tests 1–4 on the Chromebook, with real songs; anything judged by ear (crossfades, speed-change quality, click-along).
- Test 5; anything on a district Windows PC.
