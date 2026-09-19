import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  test: {
    dir: 'tests',
    // Some modules touch `window` at import time.
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/main.tsx'],
    },
  },
  build: {
    // Raise warning threshold slightly to avoid noise from known large vendor chunks (e.g. antd)
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        // Content-hashed filenames ensure cache busting on every new deploy.
        // Old chunk filenames will never collide with new ones, preventing
        // "Failed to fetch dynamically imported module" errors after deployments.
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',

        // Split vendor libraries into chunks. Only truly self-contained SDKs
        // (no module-level React calls) are split out independently.
        // react, antd, redux, recharts etc. MUST stay in the same chunk —
        // antd/rc-* call React.createContext() at module level and require
        // React to be fully initialized in the same JS execution scope.
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;

          // Agora SDK — fully self-contained, no react peer at module level
          if (id.includes('agora')) return 'vendor-agora';
          // LiveKit — fully self-contained video SDK
          if (id.includes('livekit')) return 'vendor-livekit';
          // ffmpeg — large wasm-based library, self-contained
          if (id.includes('@ffmpeg')) return 'vendor-ffmpeg';

          // Everything else (react, react-dom, antd, redux, recharts,
          // lodash-es, draft-js, react-router, etc.) stays in one vendor chunk.
          // This guarantees React is always initialized before any consumer runs.
          return 'vendor';
        },
      },
    },
  },
});
