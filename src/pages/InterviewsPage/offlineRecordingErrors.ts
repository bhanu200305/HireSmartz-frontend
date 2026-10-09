import dayjs from 'dayjs';
import type { InterviewApiError } from '../../api/interview-service/client';

// `POST /bookings/{id}/recording/upload` for an in-person panel round has two
// distinct refusals. The upload button already hides itself when either
// applies, so these only show when the screen was stale (clock skew, a round
// moved meanwhile, a direct API call):
//   425 OFFLINE_RECORDING_NOT_YET_DUE  - the round has not started (details.starts_at)
//   422 OFFLINE_RECORDING_NOT_ELIGIBLE - not an in-person panel round

export const OFFLINE_RECORDING_NOT_YET_DUE = 'OFFLINE_RECORDING_NOT_YET_DUE';
export const OFFLINE_RECORDING_NOT_ELIGIBLE = 'OFFLINE_RECORDING_NOT_ELIGIBLE';

const startsAtOf = (details: unknown): string | null => {
  const value = (details as { starts_at?: unknown } | null | undefined)?.starts_at;
  return typeof value === 'string' && dayjs(value).isValid() ? value : null;
};

/** The message to show for a failed recording upload. */
export const offlineRecordingUploadErrorMessage = (
  err: Pick<InterviewApiError, 'status' | 'code' | 'message' | 'details'> | undefined
): string => {
  if (err?.code === OFFLINE_RECORDING_NOT_YET_DUE || err?.status === 425) {
    const startsAt = startsAtOf(err?.details);
    return startsAt
      ? `This round has not started yet. You can upload the recording after ${dayjs(startsAt).format('MMM D, YYYY [at] h:mm A')}.`
      : 'This round has not started yet.';
  }
  if (err?.code === OFFLINE_RECORDING_NOT_ELIGIBLE) {
    return 'A recording can only be uploaded for an in-person panel round.';
  }
  return err?.message || 'Could not upload the recording.';
};

/** Whether the round has started, so a recording can be uploaded. */
export const hasRoundStarted = (startTime: string | null | undefined, nowMs: number): boolean => {
  if (!startTime || !dayjs(startTime).isValid()) return false;
  return nowMs >= dayjs(startTime).valueOf();
};
