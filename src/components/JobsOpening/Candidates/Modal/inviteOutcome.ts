// Whether an invite really went out when a candidate was advanced.
//
// Advance with "send invite" announces the next round's invite in the same call, but the
// server quietly leaves it out when it can't be sent (a phone-call round for a candidate
// whose number is unusable): the advance still succeeds, and nothing in the advance
// response says the invite was skipped. What does tell the truth is the round itself, which
// only has an `invite_sent_at` once the invite was actually published, so that is what is
// read, rather than assuming it went out.

type RoundWithInvite = { id: string; invite_sent_at?: string | null };

/** `true`/`false` from the refreshed round list; `null` when the round isn't there to tell. */
export const wasInviteSent = (
  rounds: RoundWithInvite[] | undefined,
  roundId: string
): boolean | null => {
  const round = rounds?.find((r) => r.id === roundId);
  return round ? Boolean(round.invite_sent_at) : null;
};

export const INVITE_SENT_MESSAGE =
  'Interview scheduling invitation email has been sent to the candidate. If SMS notifications are enabled, an SMS will also be sent.';

export const INVITE_NOT_SENT_MESSAGE =
  'Candidate advanced to the next round, but no invitation was sent. Check that the candidate has a valid phone number or email on file.';

/** What to tell the recruiter once the advance (with invite) went through. */
export const advanceInviteToast = (
  inviteSent: boolean | null
): { message: string; type: 'success' | 'warning' } =>
  inviteSent === true
    ? { message: INVITE_SENT_MESSAGE, type: 'success' }
    : inviteSent === false
      ? { message: INVITE_NOT_SENT_MESSAGE, type: 'warning' }
      : // Couldn't check: say only what is known.
        { message: 'Candidate advanced to the next round.', type: 'success' };
