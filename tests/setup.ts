// Runs once before the test suite. Extends vitest's `expect` with jest-dom's
// DOM matchers (toBeInTheDocument, toHaveTextContent, etc.) used across
// component tests.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// This project doesn't run vitest with `test.globals: true` (see
// vite.config.ts / existing tests, which import describe/it/expect from
// 'vitest' explicitly), so @testing-library/react's own auto-cleanup —
// which only registers itself when it finds afterEach on globalThis —
// never fires. Unmount every rendered component after each test explicitly,
// or later tests in the same file see DOM left over from earlier ones.
afterEach(() => {
  cleanup();
});
