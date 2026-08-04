import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { DuplicateCandidate } from '../../types';

const STORAGE_KEY = 'cfp_pending_duplicates';
const BATCH_STORAGE_KEY = 'cfp_active_batches';

type DuplicateCandidateState = {
  pendingByJob: Record<string, DuplicateCandidate[]>; // keyed by jobOpeningId string
  activeBatchByJob: Record<string, string[]>; // jobOpeningId → [batchId, ...] (all in-flight batches)
};

const loadFromStorage = (): DuplicateCandidateState => {
  let pendingByJob: Record<string, DuplicateCandidate[]> = {};
  let activeBatchByJob: Record<string, string[]> = {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DuplicateCandidateState;
      pendingByJob = parsed.pendingByJob ?? {};
    }
  } catch {
    /* ignore malformed data */
  }
  try {
    const raw = sessionStorage.getItem(BATCH_STORAGE_KEY);
    if (raw) activeBatchByJob = JSON.parse(raw) as Record<string, string[]>;
  } catch {
    /* ignore malformed data */
  }
  return { pendingByJob, activeBatchByJob };
};

const saveToStorage = (state: DuplicateCandidateState): void => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ pendingByJob: state.pendingByJob }));
  } catch {
    /* ignore write errors */
  }
  try {
    sessionStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify(state.activeBatchByJob));
  } catch {
    /* ignore write errors */
  }
};

const initialState: DuplicateCandidateState = loadFromStorage();

export const DuplicateCandidateSlice = createSlice({
  name: 'duplicateCandidate',
  initialState,
  reducers: {
    /**
     * Record an in-flight batch. Multiple batches per job are tracked independently
     * so a later batch completing early doesn't clobber an earlier batch's record.
     */
    setActiveBatch: (state, action: PayloadAction<{ jobOpeningId: string; batchId: string }>) => {
      const { jobOpeningId, batchId } = action.payload;
      const existing = state.activeBatchByJob[jobOpeningId] ?? [];
      if (!existing.includes(batchId)) {
        state.activeBatchByJob[jobOpeningId] = [...existing, batchId];
        saveToStorage(state);
      }
    },

    /**
     * Remove a specific completed batch from the tracking list.
     * Takes batchId so concurrent batches don't interfere with each other.
     */
    clearActiveBatch: (state, action: PayloadAction<{ jobOpeningId: string; batchId: string }>) => {
      const { jobOpeningId, batchId } = action.payload;
      const remaining = (state.activeBatchByJob[jobOpeningId] ?? []).filter((id) => id !== batchId);
      if (remaining.length > 0) {
        state.activeBatchByJob[jobOpeningId] = remaining;
      } else {
        delete state.activeBatchByJob[jobOpeningId];
      }
      saveToStorage(state);
    },

    /**
     * Append new duplicates to any already-pending ones for this job.
     * Deduplicates by email so the same candidate isn't shown twice if
     * they appear in multiple batch uploads.
     */
    setPendingDuplicates: (
      state,
      action: PayloadAction<{ jobOpeningId: string; duplicates: DuplicateCandidate[] }>
    ) => {
      const { jobOpeningId, duplicates } = action.payload;
      if (duplicates.length === 0) return;
      const existing = state.pendingByJob[jobOpeningId] ?? [];
      const existingEmails = new Set(existing.map((d) => d.email));
      const newOnes = duplicates.filter((d) => !existingEmails.has(d.email));
      state.pendingByJob[jobOpeningId] = [...existing, ...newOnes];
      saveToStorage(state);
    },

    /**
     * Acknowledge all pending duplicates for a job opening in one action.
     * Clears the entire list and syncs sessionStorage.
     */
    acknowledgeDuplicate: (state, action: PayloadAction<{ jobOpeningId: string }>) => {
      delete state.pendingByJob[action.payload.jobOpeningId];
      saveToStorage(state);
    },
  },
});

export const { setActiveBatch, clearActiveBatch, setPendingDuplicates, acknowledgeDuplicate } =
  DuplicateCandidateSlice.actions;

export default DuplicateCandidateSlice.reducer;
