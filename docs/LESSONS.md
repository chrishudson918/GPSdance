# Lessons

Gotchas already paid for. Read before changing code in an area; add a line when a new one costs time (`/end-session` asks). Each lesson: the rule, then why.

## Carried over from the user's earlier projects

These were learned on sportio-tv and still apply here.

- **Before offering options for a screen, check every way onto it in the code** (callers, what feeds them), not comments. An option was once mocked up, picked and built, then turned out impossible.
- **A mockup that reads well on a monitor can fail on the real device.** Try new layouts early on the real hardware (here: a district Chromebook), before polishing.
- **Keep names, numbers and controls in fixed columns** row to row; the user notices when they don't line up.
- **Claude can't hear audio.** For anything judged by ear (fade shapes, transition smoothness, sound effects, censor results), the user or the pilot group listens and decides. Claude can still measure (levels, BPM, timing).

## Git and GitHub

- **This PC holds logins for two GitHub accounts.** The remote URL carries the username (`https://chrishudson918@github.com/chrishudson918/GPSdance.git`), so Git Credential Manager uses chrishudson918's login for this repo and not Sportio-Live's. Keep it that way on every machine.

## Build and packages

- **npm 10 crashes with "Cannot read properties of null (reading 'edgesOut')" when Vitest's version doesn't match its newest optional add-ons** (e.g. `@vitest/browser-playwright`). Install the Vitest version that matches them, or upgrade npm. `npm ci` from the lockfile works fine. Cost a few retries on 2026-11-05.
- **`base` in `vite.config.ts` applies to dev and preview too; keep it the same for all.** Setting `/GPSdance/` only for `build` made `vite preview` serve the files at the root, so the page loaded blank (the JS came back as the HTML page). GitHub Pages wasn't affected.
- **Vitest's `test` settings need `defineConfig` from `vitest/config`,** not `vite`, or the type check fails.

## Claude Code

- **Skills made during a session aren't slash commands until the next session** (skills load when a session starts). Follow the SKILL.md by hand in the session that created it.
- **Cloud sessions (claude.ai/code) clone shallowly and may set a different git identity.** Check `git config user.email` before committing there.
- **Testing a page in the built-in browser:** it isn't signed in to anything. Files outside the project folder render as static snapshots. Add `<meta name="viewport" content="width=device-width,initial-scale=1">` for phone-width tests. Screenshots can lag a step behind; check state with `javascript_tool` before deciding a click failed.
- **Python on this PC:** `python -I` can't import user-site packages (e.g. Pillow); use `python -P`. Write long scripts to a file instead of a quote-heavy Bash heredoc.
