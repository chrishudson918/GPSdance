// From vitest/config (not vite) so the `test` section below is type-checked too.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

// Build details shown on the page, so anyone can tell which deploy they're looking at.
// GITHUB_SHA is set by GitHub Actions; local builds show "local".
const buildInfo = {
  version: pkg.version,
  date: new Date().toISOString(),
  commit: process.env.GITHUB_SHA?.slice(0, 7) ?? 'local',
};

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site at https://chrishudson918.github.io/GPSdance/,
  // so every path needs that folder. Used for dev and preview too, so local
  // addresses match the live one (http://localhost:5173/GPSdance/).
  // Change this when hosting moves (e.g. to Firebase Hosting at the root: '/').
  base: '/GPSdance/',
  define: {
    __BUILD_INFO__: JSON.stringify(buildInfo),
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
