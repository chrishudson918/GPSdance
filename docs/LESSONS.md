# Lessons

Gotchas already paid for. Read before changing code in an area; add a line when a new one costs time (`/end-session` asks). Each lesson: the rule, then why.

## Carried over from the user's earlier projects

These were learned on sportio-tv and still apply here.

- **Before offering options for a screen, check every way onto it in the code** (callers, what feeds them), not comments. An option was once mocked up, picked and built, then turned out impossible.
- **A mockup that reads well on a monitor can fail on the real device.** Try new layouts early on the real hardware (here: a district Chromebook), before polishing.
- **Keep names, numbers and controls in fixed columns** row to row; the user notices when they don't line up.
- **Claude can't hear audio.** For anything judged by ear (fade shapes, transition smoothness, sound effects, censor results), the user or the pilot group listens and decides. Claude can still measure (levels, BPM, timing).

## Git and GitHub

- **This PC holds logins for two GitHub accounts.** The remote URL carries the username (`https://chrishudson918@github.com/chrishudson918/GPSdance.git`), and the repo's own config pins it too, so Git Credential Manager always uses chrishudson918's login here and never asks or picks Sportio-Live's. On each new machine, run once in the repo: `git config --local credential.https://github.com.username chrishudson918`.

## Build and packages

- **npm 10 crashes with "Cannot read properties of null (reading 'edgesOut')" when Vitest's version doesn't match its newest optional add-ons** (e.g. `@vitest/browser-playwright`). Install the Vitest version that matches them, or upgrade npm. `npm ci` from the lockfile works fine. Cost a few retries on 2026-11-05.
- **`base` in `vite.config.ts` applies to dev and preview too; keep it the same for all.** Setting `/GPSdance/` only for `build` made `vite preview` serve the files at the root, so the page loaded blank (the JS came back as the HTML page). GitHub Pages wasn't affected.
- **Vitest's `test` settings need `defineConfig` from `vitest/config`,** not `vite`, or the type check fails.

## Audio

- **Decoded audio is about 23 MB per stereo minute in Chrome** (32-bit floats at 48 kHz), not 10 MB. Holding whole songs fills memory fast; plan on keeping only the parts in use. Measured 2026-11-10.
- **web-audio-beat-detector 8.2.39's `guess()` returns `{ bpm, offset }` only.** Its README also mentions `tempo`, but the code doesn't return it. Use `analyze()` for the unrounded tempo.
- **Memory spikes when songs are loaded, not while they play.** On the Dell 3120 (2026-11-18), 40 minutes of straight play holding two songs was fine, but jumping between songs pushed the tab to about 686 MB while the page itself held only 215 MB. Songs that were let go aren't freed right away, and a decode briefly needs the file's bytes plus the decoded song (plus a converted copy when the song's rate differs from the audio clock's). Space loads out and avoid loading two songs back to back.
- **Decoding a whole song takes 1.7–3.0 s on the Dell 3120** (MP3, about 4 minutes). Anything that must start "right away" has to play the first seconds while the rest decodes.
- **Signalsmith Stretch works offline:** create it on an `OfflineAudioContext`, `addBuffers()` the song, then `await start(0, 0, undefined, rate)` before rendering. The output is time-aligned (no latency shift); checked with a click track. Without the `await`, some copies on the Dell came out silent (bug 1 below).
- **Signalsmith Stretch 1.3.2 has two bugs that silence it for good** (found 2026-11-19). Each throws on the audio thread; Chrome then stops that speed tool, with no error on the page, while the page's own timer keeps counting. (1) With no audio inputs (fed by `addBuffers()` instead), its `process()` reads `inputs[0]` while waiting to start, which is undefined. (2) Reading added audio across the border between two `addBuffers()` pieces miscounts ("RangeError: offset is out of bounds"). Both are fixed in [stretchProcessor.ts](../src/longshow/stretchProcessor.ts); 1.3.2 is the newest version. When updating the library, check whether they're fixed there. To see these errors, listen for `processorerror` on the node.
- **Slowed copies of whole songs are too slow and too big on the Dell 3120:** jumps at 75% took 15–21 s and the tab reached about 1 GB (2026-11-19). Slow live while playing instead ([liveStretch.ts](../src/longshow/liveStretch.ts)): 0.4–0.7 s jumps, tab 250 MB.
- **A speed tool uses the processor even while waiting to start.** Create the next song's speed tool only a few seconds before it's needed, and stop finished ones for good (our "alive" switch), or they keep running until the page closes.
- **On the Dell, 1–3 tiny dropouts (under 0.05 s in all, never heard) come early in the first song after songs are picked, then none for the rest of the run** (4 runs, 2026-11-19). A silent warm-up of the speed tool took some but not all. Cause unknown; recheck in the real Player.
- **ChromeOS closes (discards) a tab under memory pressure, for example while the screen is locked;** the page comes back plain white. Seen 2026-11-19 on the Dell with the page silently "playing" (a silent slowed copy). Whether a tab playing audible sound is safe isn't known yet. Keep the screen awake during long tests.

## Google (sign-in, Picker, Drive)

- **A website restriction on the Picker API key makes the Picker say "The API developer key is invalid".** It failed with our two addresses, and still failed with `https://docs.google.com/*` added; it worked with Application restrictions = None (the key still limited to the Google Picker API only). Sign-in and Drive calls weren't affected (they use the OAuth token, not the key). Found 2026-11-10 in test 5. The cause isn't known yet: work it out before the district's real key is made.
- **Google key changes take a few minutes to apply.** Wait about 5 minutes after saving before deciding a change didn't work.
- **Load Google's scripts once and share the wait** ([google.ts](../src/google/google.ts) `loadScript`). React's StrictMode runs page setup twice in development; the second run saw the script tag already there, went on early, and hit "gapi is not defined".

## Claude Code

- **Skills made during a session aren't slash commands until the next session** (skills load when a session starts). Follow the SKILL.md by hand in the session that created it.
- **Cloud sessions (claude.ai/code) clone shallowly and may set a different git identity.** Check `git config user.email` before committing there.
- **Testing audio pages without real songs:** build test tracks in the page with `OfflineAudioContext`, wrap them as `File`s, put them on the file input with `DataTransfer`, and dispatch `change`. Keep each `javascript_tool` call under about 40 s (it times out at 45 s).
- **Testing a page in the built-in browser:** it isn't signed in to anything. Files outside the project folder render as static snapshots. Add `<meta name="viewport" content="width=device-width,initial-scale=1">` for phone-width tests. Screenshots can lag a step behind; check state with `javascript_tool` before deciding a click failed.
- **The built-in browser may run no `requestAnimationFrame` frames while its pane is hidden** (0 per second, measured 2026-11-18), so anything animated by rAF looks frozen in tests. Drive mockup clocks with `setInterval`, or check frames with a quick rAF counter before calling it a bug.
- **Python on this PC:** `python -I` can't import user-site packages (e.g. Pillow); use `python -P`. Write long scripts to a file instead of a quote-heavy Bash heredoc.
