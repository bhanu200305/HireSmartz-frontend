// `DELETE /calendar/disconnect` (interview-service) refuses with 409
// INTERVIEWER_HAS_ACTIVE_BOOKINGS while the interviewer still has upcoming
// interviews assigned; `details` lists those bookings. The message names how
// many, so the person knows why and what to do, instead of a generic failure.

export const INTERVIEWER_HAS_ACTIVE_BOOKINGS = 'INTERVIEWER_HAS_ACTIVE_BOOKINGS';

type ErrorLike =
  | { status?: number; code?: string; message?: string; details?: unknown }
  | undefined;

/** How many bookings the error lists, when `details` says (several shapes accepted). */
const countBookings = (details: unknown): number | null => {
  if (!details || typeof details !== 'object') return null;
  const d = details as Record<string, unknown>;
  for (const key of ['booking_ids', 'bookings', 'active_booking_ids']) {
    if (Array.isArray(d[key])) return (d[key] as unknown[]).length;
  }
  for (const key of ['count', 'booking_count']) {
    if (typeof d[key] === 'number') return d[key] as number;
  }
  return null;
};

export const calendarDisconnectErrorMessage = (err: ErrorLike, fallback: string): string => {
  if (err?.code === INTERVIEWER_HAS_ACTIVE_BOOKINGS) {
    const count = countBookings(err.details);
    const what =
      count === null
        ? 'upcoming interviews'
        : count === 1
          ? '1 upcoming interview'
          : `${count} upcoming interviews`;
    return `You have ${what} assigned, so you can't disconnect your calendar yet. Disconnect after they finish or are reassigned.`;
  }
  return err?.message || fallback;
};
