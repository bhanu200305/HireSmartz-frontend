import { useRef } from 'react';

const STORAGE_KEY = 'cfp_offered_skill_ids';

const readAll = (): Record<string, string[]> => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, string[]>;
  } catch {
    return {};
  }
};

const write = (jobId: string, ids: Set<string>) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readAll(), [jobId]: [...ids] }));
  } catch {
    // Storage unavailable: the set just lives for this mount.
  }
};

/** AI-suggested skills already offered for a job, kept per session so removed ones stay removed. */
export const useOfferedSuggestedSkills = (jobId: string) => {
  const state = useRef<{ jobId: string; ids: Set<string> } | null>(null);
  if (state.current?.jobId !== jobId) {
    state.current = { jobId, ids: new Set(readAll()[jobId] ?? []) };
  }
  const { ids } = state.current;
  return {
    has: (id: string) => ids.has(id),
    add: (id: string) => {
      if (ids.has(id)) return;
      ids.add(id);
      if (jobId) write(jobId, ids);
    },
  };
};
