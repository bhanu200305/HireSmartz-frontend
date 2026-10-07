import { useEffect, useState } from 'react';
import { Checkbox, Rate } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { Button, showToast } from '../../../shared';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { Loader } from '../../../shared/ui/loader';
import {
  useAdvanceCandidateMutation,
  type CandidateInterviewRoundView,
} from '../../../../api/candidate-service/Candidates/interviewRounds';
import {
  useRecordRecruiterRoundScoreMutation,
  useRecordRecruiterRoundFeedbackMutation,
  useRecordResumeReviewMutation,
} from '../../../../api/candidate-service/Candidates/scoring';
import type { CandidateView } from '../../../../api/candidate-service/Candidates/CandidateLifecycle';
import {
  getCandidateErrorMessage,
  getCandidateErrorStatusCode,
} from '../../../../shared/utils/auth/candidateError.helpers';
import { roundLabel } from '../roundDisplay';
import { phoneIssueBlocksRoundInvite, phoneNumberIssueMessage } from '../phoneNumberIssue';
import { RATING_TO_RECOMMENDATION } from '../../../../shared/utils/ratingRecommendation';

// Single-candidate Advance popup (candidate details page). Replaces the old
// "Confirm Advance" step for this screen only; the bulk action in the listing
// keeps using ChangeCandidateStatusModal.
//
// Flow on Confirm:
//   1. If the round being completed has no recruiter feedback on file yet, the
//      feedback typed here is saved first (resume stage -> resume review
//      comment; interview round -> recruiter round score + reason). Advance
//      is blocked until it is filled.
//   2. `POST /candidates/{id}/advance` in ONE call: `expected_round_id` (stale
//      screen guard), `send_invite` (ticked box: the next round is announced to
//      interview-service in the same transaction), and, for an interview round,
//      the body `interviewer_feedback` ({recommendation, notes}; the
//      recommendation is derived from the stars), which the
//      backend requires before it closes an interview round (409
//      INTERVIEWER_FEEDBACK_PENDING otherwise). Unticked, the round stays due
//      and the recruiter sends the invite from the Interview Scheduling tab.

const FEEDBACK_MAX = 1000;

/** What the round being completed still needs before it can be advanced. */
export type AdvanceFeedbackRequirement =
  | { kind: 'resume'; rating: number; comment: string }
  | {
      kind: 'round';
      /** The round's score record, when it has one: the star rating is saved as
       * the recruiter's score on it. Null: no score yet, so no stars to give. */
      scoreId: string | null;
      rating: number;
      comment: string;
      /** Interview rounds only: the interviewer's verdict sent with Advance. */
      withRecommendation: boolean;
    }
  | null;

type AdvanceCandidateModalProps = {
  open: boolean;
  onClose: () => void;
  candidate: CandidateView;
  /** The candidate's current round (the one Advance completes). */
  fromRound: CandidateInterviewRoundView | null;
  /** The round that becomes due next; null when this is the last round. */
  toRound: CandidateInterviewRoundView | null;
  feedbackRequirement: AdvanceFeedbackRequirement;
  /** Whether the next round can be invited automatically along with Advance. */
  canAutoInvite: boolean;
  /** A Hiring Panel `toRound`'s already-picked interviewers (empty otherwise). */
  panelInterviewerNames?: string[];
  /** `nextRound` is the round the candidate is now on (null: none, or stale);
   * `inviteSent` is whether the next round was invited with this advance. */
  onSuccess: (nextRound: CandidateInterviewRoundView | null, inviteSent?: boolean) => void;
};

const AdvanceCandidateModal = ({
  open,
  onClose,
  candidate,
  fromRound,
  toRound,
  feedbackRequirement,
  canAutoInvite,
  panelInterviewerNames = [],
  onSuccess,
}: AdvanceCandidateModalProps) => {
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [sendInvite, setSendInvite] = useState(true);
  // Feedback already saved by an earlier attempt of this same Confirm (the
  // advance itself failed afterwards): never saved twice.
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [advanceCandidate] = useAdvanceCandidateMutation();
  const [recordResumeReview] = useRecordResumeReviewMutation();
  const [recordRoundScore] = useRecordRecruiterRoundScoreMutation();
  const [recordRoundFeedback] = useRecordRecruiterRoundFeedbackMutation();

  useEffect(() => {
    if (open) {
      // Prefilled with whatever is already on file; only the gap is asked for.
      setFeedback(feedbackRequirement?.comment ?? '');
      setRating(feedbackRequirement?.rating ?? 0);
      setSendInvite(true);
      setFeedbackSaved(false);
      setIsSubmitting(false);
    }
    // Reset only when the dialog opens, not when the prefill data refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // The recommendation goes out with the advance itself, so it is asked for
  // until the advance succeeds; the rest is saved once, before it.
  const withRecommendation =
    feedbackRequirement?.kind === 'round' && feedbackRequirement.withRecommendation;
  const needsFeedback = feedbackRequirement !== null;
  // Every round is rated: the resume review, a round's existing score record,
  // or the recruiter-feedback endpoint for a round with no score record yet
  // all take a 1-5 score with the written feedback.
  const needsRating = feedbackRequirement !== null && !feedbackSaved;
  const isValid = !needsFeedback || (feedback.trim().length > 0 && (!needsRating || rating > 0));

  // candidate-service silently skips the Advance-time invite for an Intake
  // Call / Audio Screening round when the phone number is flagged, so the
  // box is shown disabled here instead of promising an invite that won't go.
  const isPhoneBlocked = phoneIssueBlocksRoundInvite(candidate.phone_number_issue, toRound);
  const willSendInvite = sendInvite && canAutoInvite && !isPhoneBlocked;
  // A Hiring Panel round reaches here invitable only once its interviewers
  // are picked; their names are shown under the checkbox.
  const isPanelInvite = panelInterviewerNames.length > 0;

  const fromLabel = fromRound ? roundLabel(fromRound) : 'the current round';
  const toLabel = toRound ? roundLabel(toRound) : null;
  const candidateName =
    `${candidate.first_name ?? ''} ${candidate.last_name ?? ''}`.trim() || 'this candidate';

  const saveFeedback = async () => {
    if (!feedbackRequirement || feedbackSaved) return;
    if (feedbackRequirement.kind === 'resume') {
      await recordResumeReview({
        candidateId: candidate.id,
        body: {
          rating,
          comment: feedback.trim(),
        },
      }).unwrap();
    } else if (feedbackRequirement.scoreId !== null) {
      await recordRoundScore({
        candidateId: candidate.id,
        scoreId: feedbackRequirement.scoreId,
        body: { recruiterScore: rating, reason: feedback.trim() },
      }).unwrap();
    } else {
      // No score record yet (e.g. an Intake Call whose consistency check
      // hasn't come back): record the feedback on the round itself.
      if (!fromRound) throw new Error('No current round to record feedback on');
      await recordRoundFeedback({
        candidateId: candidate.id,
        candidateInterviewRoundId: fromRound.id,
        body: { recruiterScore: rating, reason: feedback.trim() },
      }).unwrap();
    }
    setFeedbackSaved(true);
  };

  const handleConfirm = async () => {
    // Guard against a double click: the button is disabled while submitting,
    // this covers the render gap before that takes effect.
    if (isSubmitting || !isValid) return;
    setIsSubmitting(true);
    try {
      try {
        await saveFeedback();
      } catch (e) {
        showToast({
          message: getCandidateErrorMessage(e, 'Could not save feedback'),
          type: 'error',
        });
        setIsSubmitting(false);
        return;
      }

      let result;
      try {
        result = await advanceCandidate({
          candidateId: candidate.id,
          // A stale screen (someone else already advanced this candidate)
          // gets a 409 instead of silently advancing the NEXT round.
          expectedRoundId: fromRound?.id ?? null,
          // Announced in the same call, so the advance and the invite can't
          // end up half done.
          sendInvite: willSendInvite,
          interviewerFeedback:
            // The interviewer verdict the backend needs comes from the stars,
            // the same mapping the in-call Quick Feedback uses.
            withRecommendation && rating > 0
              ? { recommendation: RATING_TO_RECOMMENDATION[rating], notes: feedback.trim() }
              : null,
        }).unwrap();
      } catch (e) {
        const message = getCandidateErrorMessage(e, '');
        if (
          getCandidateErrorStatusCode(e) === 409 &&
          /interviewer'?s? feedback|override_pending_interviewer_feedback/i.test(message)
        ) {
          // Feedback is required at every step: no "advance anyway". The
          // recommendation above is what satisfies this, so it only shows up
          // if the form was bypassed.
          showToast({
            message: "This round can't be advanced until its interviewer's feedback is recorded.",
            type: 'error',
          });
        } else if (getCandidateErrorStatusCode(e) === 409) {
          showToast({
            message:
              'This candidate has already been advanced. The page has been refreshed with the latest round.',
            type: 'info',
          });
          onSuccess(null);
          return;
        } else {
          showToast({
            message: message || 'Could not advance this candidate',
            type: 'error',
          });
        }
        setIsSubmitting(false);
        return;
      }

      if (!result.next_round) {
        showToast({
          message: 'Final round completed: the candidate has been moved to Selected.',
          type: 'success',
        });
      } else if (willSendInvite && isPanelInvite) {
        showToast({
          message:
            'Panel invitation created. The candidate will be emailed once every selected interviewer has connected their calendar.',
          type: 'success',
        });
      } else if (willSendInvite) {
        showToast({
          message:
            'Interview scheduling invitation email has been sent to the candidate. If SMS notifications are enabled, an SMS will also be sent.',
          type: 'success',
        });
      } else {
        showToast({ message: 'Candidate advanced to the next round.', type: 'success' });
      }
      // Stay disabled: the modal closes and the parent keeps Advance locked
      // until the refreshed round list shows the candidate on the next round.
      onSuccess(result.next_round ?? null, willSendInvite);
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      title="Advance Candidate"
      modalProps={{ width: 560 }}
    >
      <div className="flex flex-col gap-4">
        <p className="text-center text-sm text-gray-700">
          You are advancing candidate <strong>{candidateName}</strong> from{' '}
          <strong>{fromLabel}</strong>
          {toLabel ? (
            <>
              {' '}
              to <strong>{toLabel}</strong>.
            </>
          ) : (
            <>
              . This is the final round, so the candidate will be moved to <strong>Selected</strong>
              .
            </>
          )}
          <br />
          Are you sure you want to proceed?
        </p>

        {needsFeedback && (
          <div className="flex flex-col gap-2">
            <label htmlFor="advance-feedback" className="text-sm text-gray-800">
              <strong>
                Feedback <span className="required-asterisk">*</span>:
              </strong>{' '}
              Before proceeding, please {needsRating ? 'rate and ' : ''}
              provide feedback for the <strong>{fromLabel}</strong>.
            </label>
            {needsRating && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-800">
                  Rating <span className="required-asterisk">*</span>
                </span>
                <Rate value={rating} onChange={setRating} />
              </div>
            )}
            <TextArea
              id="advance-feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Add feedback here..."
              rows={6}
              maxLength={FEEDBACK_MAX}
              className="resize-y rounded-lg text-sm"
            />
            <p className="text-right text-xs text-gray-500">
              {feedback.length}/{FEEDBACK_MAX} characters
            </p>
          </div>
        )}

        {toLabel && canAutoInvite && !isPhoneBlocked && (
          <div className="flex flex-col gap-2">
            <Checkbox checked={sendInvite} onChange={(e) => setSendInvite(e.target.checked)}>
              Send interview invite over email and SMS for <strong>{toLabel}</strong>
            </Checkbox>
            {isPanelInvite && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                <span className="font-semibold text-gray-700">
                  {panelInterviewerNames.length === 1 ? 'Interviewer' : 'Interviewers'}:
                </span>{' '}
                {panelInterviewerNames.join(', ')}
                <p className="mt-1">
                  The candidate is emailed once every interviewer has connected their calendar.
                </p>
              </div>
            )}
          </div>
        )}
        {toLabel && canAutoInvite && isPhoneBlocked && (
          <div className="flex flex-col gap-2">
            <Checkbox checked={false} disabled>
              Send interview invite over email and SMS for <strong>{toLabel}</strong>
            </Checkbox>
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {phoneNumberIssueMessage(candidate.phone_number_issue)} {toLabel} calls the candidate,
              so no invite will be sent. Fix the number with Edit Candidate, then invite from the
              Interview Scheduling tab.
            </p>
          </div>
        )}
        {toLabel && !canAutoInvite && (
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            {toRound?.round_type === 'PANEL' ? (
              // No interviewers picked yet: the recruiter picks the panel,
              // then invites from the round's card.
              "Invite the panel from the round's card once interviewers are selected."
            ) : (
              <>
                The invite for <strong>{toLabel}</strong> is sent from the Interview Scheduling tab.
              </>
            )}
          </p>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-full border border-gray-200 py-2.5 text-center text-sm font-semibold text-gray-600 disabled:opacity-50"
          >
            CANCEL
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isSubmitting || !isValid}
            className="flex-1 rounded-full bg-primary py-2.5 text-center text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSubmitting ? <Loader /> : 'CONFIRM'}
          </Button>
        </div>
      </div>
    </AntdCommonModal>
  );
};

export default AdvanceCandidateModal;
