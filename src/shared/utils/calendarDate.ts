import dayjs, { type Dayjs } from 'dayjs';

/** [year, month 1-12, day] named by a stored ("YYYY-MM-DD..." ) or form ("DD-MM-YYYY") date. */
const ymdOf = (value: string | null | undefined): [number, number, number] | null => {
  if (!value) return null;
  // Parsed by hand so this never depends on dayjs's customParseFormat plugin being loaded.
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  const form = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return form ? [Number(form[3]), Number(form[2]), Number(form[1])] : null;
};

/**
 * The calendar day a stored or form date names, in any timezone. A picked day is saved as UTC
 * midnight ("2026-10-06T00:00:00.000Z"), and `dayjs(iso)` would read that in local time, one day
 * early anywhere west of UTC.
 */
export const parseCalendarDate = (value: string | null | undefined): Dayjs | null => {
  const ymd = ymdOf(value);
  return ymd ? dayjs(new Date(ymd[0], ymd[1] - 1, ymd[2])) : null;
};

/**
 * Whole calendar days from a stored date to today, never negative; null if unreadable. "Today" is
 * the UTC date for every viewer, so everyone sees the same count at the same moment.
 */
export const calendarDaysSince = (
  value: string | null | undefined,
  now: Date = new Date()
): number | null => {
  const ymd = ymdOf(value);
  if (!ymd) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.floor((today - Date.UTC(ymd[0], ymd[1] - 1, ymd[2])) / 86_400_000));
};
