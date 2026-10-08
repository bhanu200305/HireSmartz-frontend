import { describe, it, expect } from 'vitest';
import {
  hasRoundStarted,
  offlineRecordingUploadErrorMessage,
} from '../../src/pages/InterviewsPage/offlineRecordingErrors';

describe('offlineRecordingUploadErrorMessage', () => {
  it('says the round has not started, with when it does, for 425 NOT_YET_DUE', () => {
    const message = offlineRecordingUploadErrorMessage({
      status: 425,
      code: 'OFFLINE_RECORDING_NOT_YET_DUE',
      message: 'Too early',
      details: { starts_at: '2026-10-09T15:00:00+00:00' },
    });
    expect(message).toMatch(
      /^This round has not started yet\. You can upload the recording after /
    );
    expect(message).toContain('2026');
  });

  it('still says the round has not started when starts_at is missing', () => {
    expect(
      offlineRecordingUploadErrorMessage({
        status: 425,
        code: 'OFFLINE_RECORDING_NOT_YET_DUE',
        message: 'Too early',
      })
    ).toBe('This round has not started yet.');
  });

  it('says it must be an in-person panel round for 422 NOT_ELIGIBLE', () => {
    expect(
      offlineRecordingUploadErrorMessage({
        status: 422,
        code: 'OFFLINE_RECORDING_NOT_ELIGIBLE',
        message: 'Not eligible',
      })
    ).toBe('A recording can only be uploaded for an in-person panel round.');
  });

  it('keeps the two messages different from each other and from the generic one', () => {
    const early = offlineRecordingUploadErrorMessage({ status: 425, message: 'x' });
    const notEligible = offlineRecordingUploadErrorMessage({
      status: 422,
      code: 'OFFLINE_RECORDING_NOT_ELIGIBLE',
      message: 'x',
    });
    const other = offlineRecordingUploadErrorMessage({ status: 500, message: 'Server error' });
    expect(new Set([early, notEligible, other]).size).toBe(3);
  });

  it('falls back to the server message, then a generic one, for anything else', () => {
    expect(
      offlineRecordingUploadErrorMessage({
        status: 422,
        code: 'VALIDATION_ERROR',
        message: 'Bad file',
      })
    ).toBe('Bad file');
    expect(offlineRecordingUploadErrorMessage(undefined)).toBe('Could not upload the recording.');
  });
});

describe('hasRoundStarted', () => {
  const start = '2026-10-09T15:00:00+00:00';
  const startMs = new Date(start).getTime();

  it('is false before the start time and true from it onward', () => {
    expect(hasRoundStarted(start, startMs - 1)).toBe(false);
    expect(hasRoundStarted(start, startMs)).toBe(true);
    expect(hasRoundStarted(start, startMs + 60_000)).toBe(true);
  });

  it('is false without a usable start time', () => {
    expect(hasRoundStarted(null, startMs)).toBe(false);
    expect(hasRoundStarted(undefined, startMs)).toBe(false);
    expect(hasRoundStarted('not a date', startMs)).toBe(false);
  });
});
