import { describe, it, expect } from 'vitest';
import {
  parseOpenCalendar,
  withoutOpenCalendar,
} from '../../src/pages/InterviewsPage/openCalendarParam';

const ID = '2e4b02e6-9350-47d7-ad3d-fe8dee9b085d';

describe('openCalendar deep link', () => {
  it('reads a booking id', () => {
    expect(parseOpenCalendar(`?openCalendar=${ID}`)).toEqual({ requested: true, bookingId: ID });
  });

  it('opens the calendar without focusing when the value is not a booking id', () => {
    expect(parseOpenCalendar('?openCalendar=1')).toEqual({ requested: true, bookingId: null });
    expect(parseOpenCalendar('?openCalendar=')).toEqual({ requested: true, bookingId: null });
  });

  it('does nothing when the parameter is absent', () => {
    expect(parseOpenCalendar('')).toEqual({ requested: false, bookingId: null });
    expect(parseOpenCalendar('?tab=details')).toEqual({ requested: false, bookingId: null });
  });

  it('removes only openCalendar from the query string', () => {
    expect(withoutOpenCalendar(`?openCalendar=${ID}`)).toBe('');
    expect(withoutOpenCalendar(`?a=1&openCalendar=${ID}&b=2`)).toBe('?a=1&b=2');
  });
});
