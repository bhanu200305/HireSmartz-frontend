import { useCallback, useState } from 'react';

const STORAGE_PREFIX = 'cfp_page_size_';

const clamp = (size: number, max?: number): number => (max ? Math.min(size, max) : size);

const readStoredPageSize = (key: string, fallback: number, max?: number): number => {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? clamp(parsed, max) : fallback;
  } catch {
    return fallback;
  }
};

/**
 * A "rows per page" choice that survives a refresh, scoped to `key` so, e.g.,
 * the Active Job Openings popup and the Companies popup each remember their
 * own value instead of sharing one. Deliberately per-browser only
 * (`localStorage`) rather than a backend preference — this is a lightweight
 * UI convenience, not account data, so it doesn't need a round trip or a
 * schema of its own. See `recentSearches.helpers.ts` for the same
 * try/catch-and-fall-back-quietly shape applied to a different local value.
 *
 * `max`, when given, caps both the stored read and any new value against a
 * backend's own page-size limit — a value persisted before that limit
 * existed (or shrank) would otherwise keep failing every request until
 * someone clears localStorage by hand.
 */
export const usePersistedPageSize = (
  key: string,
  fallback: number,
  max?: number
): [number, (size: number) => void] => {
  const [pageSize, setPageSizeState] = useState<number>(() =>
    readStoredPageSize(key, fallback, max)
  );

  const setPageSize = useCallback(
    (size: number) => {
      const clamped = clamp(size, max);
      setPageSizeState(clamped);
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${key}`, String(clamped));
      } catch {
        // Best-effort only — a private window or a full quota just means the
        // choice doesn't survive a refresh, not that pagination breaks.
      }
    },
    [key, max]
  );

  return [pageSize, setPageSize];
};
