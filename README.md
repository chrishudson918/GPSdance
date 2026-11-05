# GPSdance (working name)

A web app for Gilbert Public Schools high school dance instructors and students: build routine music (cut, fade, tempo, transitions) and play it at practice. Everything runs in the browser; projects are files in the user's own Google Drive.

**Live:** https://chrishudson918.github.io/GPSdance/ (right now a starter page that checks whether a computer can run the app).

Start with [docs/VISION.md](docs/VISION.md) and [docs/STATUS.md](docs/STATUS.md). [CLAUDE.md](CLAUDE.md) has the project rules.

## Run it on your computer

Needs [Node.js](https://nodejs.org/) 22 or newer (the version is in `.nvmrc`).

```bash
npm install        # once, and again after package.json changes
npm run dev        # http://localhost:5173/GPSdance/ , reloads as you edit
```

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server with live reload |
| `npm run check` | Type check + tests (the same checks GitHub runs) |
| `npm run typecheck` | TypeScript check only |
| `npm test` | Tests only (Vitest; files named `*.test.ts`) |
| `npm run build` | Builds the site into `dist/` |
| `npm run preview` | Serves `dist/` at http://localhost:4173/GPSdance/ to check a build |

## How it gets published

Every push to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml) on GitHub Actions: install, type check, tests, build, then publish to GitHub Pages. If a check fails, nothing is published. Pull requests run the checks without publishing.

One-time setup (already done once per repo): GitHub repo → **Settings** → **Pages** → **Source: GitHub Actions**.

The site lives in the `/GPSdance/` folder of the Pages address, set by `base` in [vite.config.ts](vite.config.ts). Change it when hosting moves.

## Layout

```
src/            the app (React + TypeScript)
public/         files copied as-is (favicon)
docs/           vision, requirements, design, status, history
.github/        the deploy workflow
```
