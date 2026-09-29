import { useEffect, useState } from 'react';

/** m:ss for under an hour, h:mm:ss once it reaches an hour — a support
 * grant's default window (72h) spends almost all its life well past
 * "minutes," unlike SessionJoinScreen.tsx's short pre-interview countdown
 * this is otherwise modeled on. */
export const formatCountdown = (remainingMs: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Live "time remaining until `expiresAt`," re-rendering once a second, plus
 * a single `onExpire` firing exactly once when it lapses — same split as
 * InterviewLiveKit.tsx's AI-ended grace countdown (a `setTimeout` owns the
 * one real side effect; a separate `setInterval` only redraws the display),
 * so the actual redirect-out doesn't depend on the display tick's timing.
 *
 * Used for a support-access grant's remaining time (see
 * CustomerDashboard/ViewCustomer's cfp_support read-only mode and
 * MySupportAccessPage) — `expiresAt` is an ISO 8601 string, matching every
 * grant response's own `expires_at` field.
 */
export const useExpiryCountdown = (
  expiresAt: string | null | undefined,
  onExpire?: () => void
): { remainingMs: number; isExpired: boolean; label: string } => {
  const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : null;
  const [, setTick] = useState(0);

  useEffect(() => {
    if (expiresAtMs == null) return undefined;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [expiresAtMs]);

  useEffect(() => {
    if (expiresAtMs == null || !onExpire) return undefined;
    const msLeft = expiresAtMs - Date.now();
    if (msLeft <= 0) {
      onExpire();
      return undefined;
    }
    const timeout = setTimeout(onExpire, msLeft);
    return () => clearTimeout(timeout);
    // Only re-arm this if the deadline itself changes — not on every
    // display tick above, which would otherwise reschedule the same
    // timeout every second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAtMs]);

  if (expiresAtMs == null) {
    return { remainingMs: 0, isExpired: false, label: '' };
  }
  const remainingMs = Math.max(0, expiresAtMs - Date.now());
  return { remainingMs, isExpired: remainingMs <= 0, label: formatCountdown(remainingMs) };
};
