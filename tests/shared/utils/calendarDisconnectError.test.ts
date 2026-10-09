import { describe, it, expect } from 'vitest';
import { calendarDisconnectErrorMessage } from '../../../src/shared/utils/calendarDisconnectError';

const blocked = (details?: unknown) => ({
  status: 409,
  code: 'INTERVIEWER_HAS_ACTIVE_BOOKINGS',
  message: 'x',
  details,
});

describe('calendarDisconnectErrorMessage', () => {
  it('says how many interviews block the disconnect', () => {
    expect(calendarDisconnectErrorMessage(blocked({ booking_ids: ['a', 'b', 'c'] }), 'f')).toBe(
      "You have 3 upcoming interviews assigned, so you can't disconnect your calendar yet. Disconnect after they finish or are reassigned."
    );
  });

  it('uses the singular for one interview', () => {
    expect(calendarDisconnectErrorMessage(blocked({ booking_ids: ['a'] }), 'f')).toContain(
      'You have 1 upcoming interview assigned'
    );
  });

  it('still explains it when details carry no list', () => {
    expect(calendarDisconnectErrorMessage(blocked(undefined), 'f')).toContain(
      'You have upcoming interviews assigned'
    );
  });

  it('falls back to the server message, then the default, for any other error', () => {
    expect(calendarDisconnectErrorMessage({ status: 500, message: 'Server down' }, 'f')).toBe(
      'Server down'
    );
    expect(calendarDisconnectErrorMessage(undefined, 'Failed to disconnect')).toBe(
      'Failed to disconnect'
    );
  });
});
