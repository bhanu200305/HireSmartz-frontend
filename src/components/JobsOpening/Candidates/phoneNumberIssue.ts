import { get } from 'lodash-es';
import type { PhoneNumberIssue } from '../../../api/candidate-service/Candidates/CandidateLifecycle';
import type { CandidateInterviewRoundView } from '../../../api/candidate-service/Candidates/interviewRounds';
import { getCandidateErrorStatusCode } from '../../../shared/utils/auth/candidateError.helpers';
import { isAudioScreeningRound, isIntakeCallRound } from './roundProgress';

// candidate-service flags a phone number that came in with no form behind it
// (AI-extracted off a resume, ATS import) and can't actually be dialed —
// `phone_number_issue` on the candidate. It never rejects the candidate;
// it only refuses invites for the two rounds that place a system phone call.

export const PHONE_NUMBER_ISSUE_MESSAGES: Record<PhoneNumberIssue, string> = {
  missing_country_code: "This number has no country code, so it can't be called or texted.",
  invalid_for_country: "This number's digit count doesn't match its country code.",
};

export const phoneNumberIssueMessage = (issue: PhoneNumberIssue | null | undefined) =>
  issue ? (PHONE_NUMBER_ISSUE_MESSAGES[issue] ?? null) : null;

/** Intake Call and Audio Screening are the only rounds that call the
 * candidate; AI Video and Hiring Panel are unaffected by a bad number. */
export const phoneIssueBlocksRoundInvite = (
  issue: PhoneNumberIssue | null | undefined,
  round: CandidateInterviewRoundView | null | undefined
): boolean => Boolean(issue && round && (isIntakeCallRound(round) || isAudioScreeningRound(round)));

export const PHONE_BLOCKED_INVITE_MESSAGE =
  "This round calls the candidate, but their phone number can't be called. Fix it with Edit Candidate, then send the invite.";

/** 422 `PHONE_NUMBER_UNUSABLE_FOR_ROUND` from Send Invite. Matched on the
 * code wherever the envelope carries it, with a 422 + phone-number message
 * as the fallback, since candidate-service's domain errors don't reliably
 * put a code in the body. */
export const isPhoneNumberUnusableError = (error: unknown): boolean => {
  const code = get(error, 'data.error_code') ?? get(error, 'data.data.error_code');
  if (code === 'PHONE_NUMBER_UNUSABLE_FOR_ROUND') return true;
  const message = String(get(error, 'data.message') ?? '');
  return getCandidateErrorStatusCode(error) === 422 && /phone[\s_]number/i.test(message);
};
