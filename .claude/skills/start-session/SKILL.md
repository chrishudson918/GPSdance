---
name: start-session
description: Start a work session on GPSdance - check this machine against GitHub, pull safely, read STATUS.md, recap where things stand, and ask what the session is for. Use at the start of every session or when the user says "start", "let's begin", "where were we".
---

# Start a session

Run these in order. Stop and ask the user whenever a step says so.

## 1. Is this machine or GitHub newer?

Skip this step (say so in one line) if the repo has no `origin` remote yet.

```bash
git fetch origin
git status --short
git rev-list --left-right --count main...origin/main   # "<ahead> <behind>"
git log --oneline origin/main..main                     # commits here, not on GitHub
```

- **Uncommitted changes or commits GitHub doesn't have:** **stop and ask the user.** Show what's there (files, commit titles). Don't pull, stash or commit.
- **Behind only** (clean, ahead = 0): `git pull --ff-only`.
- **Up to date:** say so in one line.
- Check the commit identity once against the one in CLAUDE.md's Hard rules. If it differs, tell the user; don't change it silently.

## 2. Read the handoff

Read `docs/STATUS.md`. Skim `docs/ROADMAP.md` "Now" if the user hasn't said what this session is for.

## 3. Recap

In 2-3 short lines and plain words:
- what's true now,
- what's next (from STATUS.md), and days left until the January 1 deadline,
- anything the git check turned up,
- anything in "Waiting on the user" that's still open (one line).

Then ask what this session is for (one question, answer box), offering STATUS.md's next items as options, unless the user already said.

## Never

- Write to the user's other projects (sportio-* or any other folder outside GPSdance), locally or on GitHub.
