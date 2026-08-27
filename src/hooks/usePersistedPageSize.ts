import { useCallback, useState } from 'react';

const STORAGE_PREFIX = 'cfp_page_size_';

const readStoredPageSize = (key: string, fallback: number): number => {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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
 */
export const usePersistedPageSize = (
  key: string,
  fallback: number
): [number, (size: number) => void] => {
  const [pageSize, setPageSizeState] = useState<number>(() => readStoredPageSize(key, fallback));

  const setPageSize = useCallback(
    (size: number) => {
      setPageSizeState(size);
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${key}`, String(size));
      } catch {
        // Best-effort only — a private window or a full quota just means the
        // choice doesn't survive a refresh, not that pagination breaks.
      }
    },
    [key]
  );

  return [pageSize, setPageSize];
};
