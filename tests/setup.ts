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

// jsdom has no window.matchMedia — antd's responsive components call it on
// mount. Minimal stub so any antd-based component test doesn't crash.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// jsdom has no ResizeObserver either; antd's layout components construct one on mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!('ResizeObserver' in globalThis)) {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    writable: true,
    configurable: true,
    value: ResizeObserverStub,
  });
}
