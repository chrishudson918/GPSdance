/// <reference types="vite/client" />

/** Set at build time in vite.config.ts. */
declare const __BUILD_INFO__: {
  version: string;
  /** ISO date-time the build ran. */
  date: string;
  /** Short git commit, or "local" for builds on a PC. */
  commit: string;
};
