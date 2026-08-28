import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface StreamPayload {
  eventName?: string;
  jobId?: number;
  interviewRoundIds?: number[];
  [key: string]: unknown;
}

interface StreamState {
  isStreaming: boolean;
  streamError: string | null;
  jobOpeningId: string | number | null;
  interviewRoundId: string | number | null;
  lastPayload: StreamPayload | null;
  lastEvent: string | null;
}

const initialState: StreamState = {
  isStreaming: false,
  streamError: null,
  jobOpeningId: null,
  interviewRoundId: null,
  lastPayload: null,
  lastEvent: null,
};

const streamSlice = createSlice({
  name: 'stream',
  initialState,
  reducers: {
    startStream: (state, action: PayloadAction<{ jobOpeningId: string | number }>) => {
      state.isStreaming = true;
      state.streamError = null;
      state.jobOpeningId = action.payload.jobOpeningId;
    },
    stopStream: (state) => {
      state.isStreaming = false;
    },
    updateStreamPayload: (state, action: PayloadAction<StreamPayload>) => {
      const payload = action.payload;
      state.lastPayload = payload;
      state.lastEvent = payload.eventName || null;

      // Extract jobId from payload
      if (payload.jobId && typeof payload.jobId === 'number') {
        state.jobOpeningId = payload.jobId;
      }

      // Extract first interviewRoundId from array if present
      if (
        Array.isArray(payload.interviewRoundIds) &&
        payload.interviewRoundIds.length > 0 &&
        typeof payload.interviewRoundIds[0] === 'number'
      ) {
        state.interviewRoundId = payload.interviewRoundIds[0];
      }
    },
    setStreamError: (state, action: PayloadAction<string>) => {
      state.streamError = action.payload;
      state.isStreaming = false;
    },
    resetStream: () => initialState,
  },
});

export const { startStream, stopStream, updateStreamPayload, setStreamError, resetStream } =
  streamSlice.actions;
export default streamSlice.reducer;
