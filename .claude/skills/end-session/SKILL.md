---
name: end-session
description: Wrap up a work session on GPSdance - update the docs that changed, add a history log entry, rewrite STATUS.md, then commit and push after the user's OK. Use when the user says "wrap up", "end the session", "let's stop", or before switching machines.
---

# End a session

Run these in order. **Nothing is committed or pushed without the user's OK.**

## 1. Update the docs this session touched

Only what's affected:

- `docs/design/<area>.md`: how the app works now (screens, behavior, removed features). Write what's true now, not the story.
- `docs/REQUIREMENTS.md`: requirements the user changed or added (their OK only). Tick open questions that got answered.
- `docs/ROADMAP.md`: items finished, started, moved, or rejected (with the reason and date). **New ideas only if the user already said yes.**
- `docs/LESSONS.md`: "did anything cost time that the next session should know?" If yes, add the rule + why. If unsure, ask.
- `CLAUDE.md`: only if something in it is now wrong (e.g., the stack or build steps got decided). Keep it short.
- Remember the handoff: would someone new in district IT understand these docs?

## 2. Add a history entry

Append to `docs/history/<YYYY-MM>.md` (create it with a `# History: YYYY-MM` header if it's a new month):

```
## <Short title> (<YYYY-MM-DD>, <whose call: user's list / user's pick / bug report / pilot feedback>)

- What was built or changed, and why (the user's words where they matter).
- Commits: <short hashes>.
- Checked: where and how (Chromebook, Windows PC, browser), with numbers if measured.
- Not checked / open: anything left to try.
```

Facts only, short.

## 3. Rewrite STATUS.md

Rewrite (don't append) `docs/STATUS.md`: date, the deadline, where things stand, what's next, what's waiting on the user, what hasn't been checked yet. Remove items that are done.

## 4. Commit and push (after the user's OK)

1. Show what will be committed (`git status --short` plus a one-line summary per file group) and suggest a commit message.
2. **Ask** (answer box): commit and push? Wait for yes.
3. Check `git config user.email` matches the identity in CLAUDE.md's Hard rules.
4. Commit with a plain message, following CLAUDE.md's attribution rule.
5. `git push`. If refused, stop and tell the user; never force.

## 5. Rename the session

`mcp__ccd_session_mgmt__set_session_title` (`session_id: "self"`): a short title for the work done, at most ~40 characters, main topic first. Skip silently if the tool isn't available.

## 6. Close

In 2-3 plain lines: what's saved, what's next, and anything the user should do (e.g., ask the pilot group, the admin coworker).

## Never

- Write to the user's other projects (sportio-* or any other folder outside GPSdance), locally or on GitHub.
