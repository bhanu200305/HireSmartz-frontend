import { useEffect, useRef, useState } from 'react';

// Same event set MainLayout's own inactivity timer uses — real user input
// only, deliberately excluding anything a background fetch/poll could ever
// trigger. That distinction is the entire point of this hook: a background
// poll succeeding must never look like "the user is still here."
const ACTIVITY_EVENTS = [
  'mousemove',
  'keydown',
  'wheel',
  'scroll',
  'touchstart',
  'click',
  'mousedown',
  'keypress',
  'input',
] as const;

/**
 * True once `timeoutMs` has passed with no real user interaction.
 *
 * Exists for consumers that need to REACT to idleness (e.g. pausing
 * background polling) rather than just performing one action when it's
 * reached (MainLayout's own inactivity-logout timer already does that
 * locally and is left alone here — this hook doesn't replace it).
 *
 * WHY THIS MATTERS FOR BACKGROUND POLLING SPECIFICALLY: a poll that keeps
 * running in an abandoned-but-open tab makes authenticated requests on a
 * timer, which (once the short-lived access token expires) forces a token
 * refresh purely to keep the poll alive — and that refresh is itself an
 * authenticated hit to auth-service, which is exactly the kind of ambient
 * traffic that can make an idle session's server-side "last activity" look
 * fresh long after the person left. Consumers should pause polling while
 * this returns true, so the only thing that can look like activity is
 * activity.
 */
export const useIdleTimeout = (timeoutMs: number): boolean => {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const resetTimer = () => {
      setIsIdle(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setIsIdle(true), timeoutMs);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') resetTimer();
    };

    resetTimer();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer));
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', resetTimer);
    window.addEventListener('pageshow', resetTimer);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', resetTimer);
      window.removeEventListener('pageshow', resetTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeoutMs]);

  return isIdle;
};

export default useIdleTimeout;
