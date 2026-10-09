// Deep link into the signed-in user's own interview calendar (the popup the
// header's calendar icon opens), for links in emails:
//
//   /my-calendar?openCalendar=<booking_id>     (any signed-in user)
//   <any signed-in page>?openCalendar=<booking_id>
//
// `openCalendar=<booking_id>` opens the popup, jumps to that interview's day
// and opens its details. Any other value (e.g. `openCalendar=1`) just opens the
// popup. The parameter is removed from the address bar once it has been used.

export const OPEN_CALENDAR_PARAM = 'openCalendar';
export const MY_CALENDAR_PATH = '/my-calendar';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whether the URL asks for the calendar, and which booking to focus (if any). */
export const parseOpenCalendar = (
  search: string
): { requested: boolean; bookingId: string | null } => {
  const value = new URLSearchParams(search).get(OPEN_CALENDAR_PARAM);
  if (value === null) return { requested: false, bookingId: null };
  return { requested: true, bookingId: UUID.test(value.trim()) ? value.trim() : null };
};

/** The same query string without `openCalendar` (other params are kept). */
export const withoutOpenCalendar = (search: string): string => {
  const params = new URLSearchParams(search);
  params.delete(OPEN_CALENDAR_PARAM);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
};
