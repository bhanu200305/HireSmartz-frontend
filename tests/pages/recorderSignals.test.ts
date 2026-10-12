import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  endRecording,
  readRecorderParams,
  resetRecorderSignals,
  startRecording,
} from '../../src/pages/RecorderPage/recorderSignals';

describe('readRecorderParams', () => {
  it('reads what LiveKit adds to the URL', () => {
    expect(readRecorderParams('?url=wss%3A%2F%2Flk.example.com&token=abc&layout=grid')).toEqual({
      serverUrl: 'wss://lk.example.com',
      token: 'abc',
      layout: 'grid',
    });
  });

  it('has nothing to join without them, and defaults the layout', () => {
    expect(readRecorderParams('')).toEqual({ serverUrl: null, token: null, layout: 'grid' });
  });
});

describe('recording signals', () => {
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetRecorderSignals();
    log = vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => log.mockRestore());

  it('logs START_RECORDING once, however often it is asked', () => {
    startRecording();
    startRecording();
    expect(log.mock.calls).toEqual([['START_RECORDING']]);
  });

  it('logs END_RECORDING once, and only after a start', () => {
    endRecording();
    expect(log).not.toHaveBeenCalled();
    startRecording();
    endRecording();
    endRecording();
    expect(log.mock.calls).toEqual([['START_RECORDING'], ['END_RECORDING']]);
  });

  it('does not start again once it has ended', () => {
    startRecording();
    endRecording();
    startRecording();
    expect(log.mock.calls).toEqual([['START_RECORDING'], ['END_RECORDING']]);
  });
});
