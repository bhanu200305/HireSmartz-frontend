// NOTE: This project uses Tailwind v4's CSS-first config (see
// src/theme/tailwind-theme.css `@theme` block, which is the real source of
// truth for colors/fonts/shadows) — there is no `@config` directive anywhere
// pointing at this file, so nothing here is actually read by the build.
// Kept only as a documentation stub so it doesn't silently drift from reality;
// safe to delete entirely once confirmed nothing external references it.
import type { Config } from 'tailwindcss';

const config: Config = {
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
