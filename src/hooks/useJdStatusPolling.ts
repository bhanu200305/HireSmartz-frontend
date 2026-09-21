import { useEffect, useState } from 'react';
import { useGetJdStatusQuery } from '../api/job-service/JobOpening/JdUpload';
import { showToast } from '../components/shared/ui/toast';

const FAST_POLL_MS = 2_000;
const SLOW_POLL_MS = 5_000;
const FAST_WINDOW_MS = 20_000;
const GIVE_UP_MS = 180_000;

interface Options {
  notifyOnTimeout?: boolean;
}

/**
 * Polls GET /jd/status while a JD is being parsed or generated, and stops on
 * READY or FAILED. Polling follows the CURRENT status, not a one-way "done"
 * flag, so a job that goes READY -> GENERATING (regenerate) resumes polling
 * by itself. The status is refetched on mount so a stale cached READY from an
 * earlier step cannot switch polling off before the new run is seen.
 */
export const useJdStatusPolling = (
  jobOpeningId: string | undefined,
  { notifyOnTimeout = false }: Options = {}
) => {
  const [pollMs, setPollMs] = useState(FAST_POLL_MS);
  const [timedOut, setTimedOut] = useState(false);

  const { data } = useGetJdStatusQuery(jobOpeningId ?? '', {
    skip: !jobOpeningId,
    pollingInterval: pollMs,
    refetchOnMountOrArgChange: true,
  });

  const isDone = data?.status === 'READY' || data?.status === 'FAILED';

  useEffect(() => {
    if (!jobOpeningId) return;
    setTimedOut(false);
    if (isDone) {
      setPollMs(0);
      return;
    }
    setPollMs(FAST_POLL_MS);
    const slowTimer = setTimeout(() => setPollMs(SLOW_POLL_MS), FAST_WINDOW_MS);
    const giveUpTimer = setTimeout(() => {
      setPollMs(0);
      setTimedOut(true);
      if (notifyOnTimeout) {
        showToast({
          message: "Still generating - refresh in a moment if it doesn't appear shortly.",
          type: 'warning',
        });
      }
    }, GIVE_UP_MS);
    return () => {
      clearTimeout(slowTimer);
      clearTimeout(giveUpTimer);
    };
  }, [jobOpeningId, isDone, notifyOnTimeout]);

  return { data, timedOut };
};
