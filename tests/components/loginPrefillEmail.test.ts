import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  clearPendingInvitedEmail,
  resolvePrefillEmail,
  searchWithoutEmail,
} from '../../src/components/Login/prefillEmail';

describe('login email prefill', () => {
  beforeEach(() => clearPendingInvitedEmail());

  it('prefers router state, then the ?email= parameter, then nothing', () => {
    expect(resolvePrefillEmail({ prefillEmail: 'a@x.com' }, '?email=b@x.com')).toBe('a@x.com');
    clearPendingInvitedEmail();
    expect(resolvePrefillEmail(null, '?email=b%40x.com')).toBe('b@x.com');
    clearPendingInvitedEmail();
    expect(resolvePrefillEmail(null, '')).toBe('');
  });

  it('still has the email on a second mount after the address was cleaned', () => {
    resolvePrefillEmail({ prefillEmail: 'a@x.com' }, '?email=a%40x.com');
    expect(resolvePrefillEmail({}, '')).toBe('a@x.com');
  });

  it('forgets it after a short while and when cleared', () => {
    vi.useFakeTimers();
    resolvePrefillEmail(null, '?email=a%40x.com');
    vi.advanceTimersByTime(6000);
    expect(resolvePrefillEmail(null, '')).toBe('');
    vi.useRealTimers();
    resolvePrefillEmail(null, '?email=a%40x.com');
    clearPendingInvitedEmail();
    expect(resolvePrefillEmail(null, '')).toBe('');
  });

  it('removes only the email parameter from the address', () => {
    expect(searchWithoutEmail('?email=a%40x.com')).toBe('');
    expect(searchWithoutEmail('?reason=invalid_session&email=a%40x.com')).toBe(
      '?reason=invalid_session'
    );
  });
});
