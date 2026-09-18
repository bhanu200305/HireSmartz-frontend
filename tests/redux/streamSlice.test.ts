import { describe, expect, it } from 'vitest';
import reducer, {
  startStream,
  stopStream,
  updateStreamPayload,
  setStreamError,
  resetStream,
} from '../../src/redux/slices/streamSlice';

const initialState = reducer(undefined, { type: '@@INIT' });

describe('streamSlice reducer', () => {
  it('startStream marks streaming active, clears any error, and records the job opening', () => {
    const withError = reducer(initialState, setStreamError('boom'));
    const state = reducer(withError, startStream({ jobOpeningId: 'job-1' }));

    expect(state.isStreaming).toBe(true);
    expect(state.streamError).toBeNull();
    expect(state.jobOpeningId).toBe('job-1');
  });

  it('stopStream only flips isStreaming, leaving other fields untouched', () => {
    const started = reducer(initialState, startStream({ jobOpeningId: 'job-1' }));
    const state = reducer(started, stopStream());

    expect(state.isStreaming).toBe(false);
    expect(state.jobOpeningId).toBe('job-1');
  });

  describe('updateStreamPayload', () => {
    it('records the payload and derives lastEvent from eventName', () => {
      const state = reducer(
        initialState,
        updateStreamPayload({ eventName: 'JOB_DESCRIPTION_READY' })
      );

      expect(state.lastEvent).toBe('JOB_DESCRIPTION_READY');
      expect(state.lastPayload).toEqual({ eventName: 'JOB_DESCRIPTION_READY' });
    });

    it('sets lastEvent to null when eventName is absent', () => {
      const state = reducer(initialState, updateStreamPayload({}));
      expect(state.lastEvent).toBeNull();
    });

    it('extracts a numeric jobId into jobOpeningId', () => {
      const state = reducer(initialState, updateStreamPayload({ jobId: 42 }));
      expect(state.jobOpeningId).toBe(42);
    });

    it('ignores a non-numeric jobId', () => {
      const state = reducer(
        initialState,
        updateStreamPayload({ jobId: '42' as unknown as number })
      );
      expect(state.jobOpeningId).toBeNull();
    });

    it('extracts the first interviewRoundId from a non-empty numeric array', () => {
      const state = reducer(initialState, updateStreamPayload({ interviewRoundIds: [7, 8, 9] }));
      expect(state.interviewRoundId).toBe(7);
    });

    it('leaves interviewRoundId untouched for an empty array', () => {
      const state = reducer(initialState, updateStreamPayload({ interviewRoundIds: [] }));
      expect(state.interviewRoundId).toBeNull();
    });

    it('leaves interviewRoundId untouched when the first entry is not a number', () => {
      const state = reducer(
        initialState,
        updateStreamPayload({ interviewRoundIds: ['not-a-number'] as unknown as number[] })
      );
      expect(state.interviewRoundId).toBeNull();
    });
  });

  it('setStreamError records the message and stops streaming', () => {
    const started = reducer(initialState, startStream({ jobOpeningId: 'job-1' }));
    const state = reducer(started, setStreamError('connection lost'));

    expect(state.isStreaming).toBe(false);
    expect(state.streamError).toBe('connection lost');
  });

  it('resetStream restores the initial state', () => {
    const busy = reducer(initialState, startStream({ jobOpeningId: 'job-1' }));
    expect(reducer(busy, resetStream())).toEqual(initialState);
  });
});
