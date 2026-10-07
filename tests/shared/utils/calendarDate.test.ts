import { describe, it, expect } from 'vitest';
import { calendarDaysSince, parseCalendarDate } from '../../../src/shared/utils/calendarDate';

describe('parseCalendarDate', () => {
  it('reads the saved UTC-midnight date as the day that was picked', () => {
    expect(parseCalendarDate('2026-10-06T00:00:00.000Z')?.format('YYYY-MM-DD')).toBe('2026-10-06');
    expect(parseCalendarDate('2026-10-06T00:00:00+00:00')?.format('MMM D, YYYY')).toBe(
      'Oct 6, 2026'
    );
  });

  it('reads a date-only value and the form format', () => {
    expect(parseCalendarDate('2026-10-06')?.format('YYYY-MM-DD')).toBe('2026-10-06');
    expect(parseCalendarDate('06-10-2026')?.format('YYYY-MM-DD')).toBe('2026-10-06');
  });

  it('returns null for blank or unreadable input', () => {
    expect(parseCalendarDate('')).toBeNull();
    expect(parseCalendarDate(undefined)).toBeNull();
    expect(parseCalendarDate('soon')).toBeNull();
  });
});

describe('calendarDaysSince', () => {
  const lateOct6Utc = new Date(Date.UTC(2026, 9, 6, 23, 30));
  const earlyOct7Utc = new Date(Date.UTC(2026, 9, 7, 0, 30));

  it('counts today as 0 for a date picked today', () => {
    expect(calendarDaysSince('2026-10-06T00:00:00.000Z', lateOct6Utc)).toBe(0);
  });

  it('counts whole calendar days', () => {
    expect(calendarDaysSince('2026-10-05T00:00:00.000Z', lateOct6Utc)).toBe(1);
    expect(calendarDaysSince('2026-09-29T00:00:00.000Z', lateOct6Utc)).toBe(7);
  });

  it('gives every viewer the same count at the same moment, whatever their timezone', () => {
    // The count only moves when the UTC date does.
    expect(calendarDaysSince('2026-10-06T00:00:00.000Z', earlyOct7Utc)).toBe(1);
  });

  it('is never negative and null for unreadable input', () => {
    expect(calendarDaysSince('2026-10-20T00:00:00.000Z', lateOct6Utc)).toBe(0);
    expect(calendarDaysSince(null)).toBeNull();
    expect(calendarDaysSince('soon')).toBeNull();
  });
});
