import { describe, expect, it } from 'vitest';
import {
  INVITE_NOT_SENT_MESSAGE,
  INVITE_SENT_MESSAGE,
  advanceInviteToast,
  wasInviteSent,
} from '../../../../src/components/JobsOpening/Candidates/Modal/inviteOutcome';
import { PHONE_NUMBER_ISSUE_MESSAGES } from '../../../../src/components/JobsOpening/Candidates/phoneNumberIssue';
import { PHONE_VALIDATION_MESSAGE } from '../../../../src/shared/utils/validation/phoneValidation';

describe('wasInviteSent', () => {
  const rounds = [
    { id: 'r2', invite_sent_at: '2026-10-12T10:00:00Z' },
    { id: 'r3', invite_sent_at: null },
  ];

  it('reads whether the round really has an invite on record', () => {
    expect(wasInviteSent(rounds, 'r2')).toBe(true);
    expect(wasInviteSent(rounds, 'r3')).toBe(false);
  });

  it('does not guess when the round is not in the list', () => {
    expect(wasInviteSent(rounds, 'nope')).toBeNull();
    expect(wasInviteSent(undefined, 'r2')).toBeNull();
  });
});

describe('advanceInviteToast', () => {
  it('says the invite was sent only when it was', () => {
    expect(advanceInviteToast(true)).toEqual({ message: INVITE_SENT_MESSAGE, type: 'success' });
  });

  it('warns, and never claims a send, when the invite was left out', () => {
    const toast = advanceInviteToast(false);
    expect(toast).toEqual({ message: INVITE_NOT_SENT_MESSAGE, type: 'warning' });
    expect(toast.message).not.toMatch(/has been sent/i);
  });

  it('claims nothing about the invite when it could not be checked', () => {
    const toast = advanceInviteToast(null);
    expect(toast.message).toBe('Candidate advanced to the next round.');
    expect(toast.message).not.toMatch(/invit/i);
  });
});

describe('phone wording', () => {
  it('no longer tells people to count digits', () => {
    expect(PHONE_VALIDATION_MESSAGE).toBe(
      'Enter a valid phone number for the selected country, including the country code.'
    );
    expect(PHONE_NUMBER_ISSUE_MESSAGES.invalid_for_country).toBe(
      "This phone number isn't valid for its country code."
    );
    expect(PHONE_VALIDATION_MESSAGE).not.toMatch(/digit/i);
    expect(PHONE_NUMBER_ISSUE_MESSAGES.invalid_for_country).not.toMatch(/digit/i);
  });
});
