import { useEffect, useState } from 'react';
import { Checkbox, Rate } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { Button, showToast } from '../../../shared';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { Loader } from '../../../shared/ui/loader';
import {
  useAdvanceCandidateMutation,
  useSendRoundInviteMutation,
  type CandidateInterviewRoundView,
} from '../../../../api/candidate-service/Candidates/interviewRounds';
import {
  useRecordRecruiterRoundScoreMutation,
  useRecordResumeReviewMutation,
} from '../../../../api/candidate-service/Candidates/scoring';
import type { CandidateView } from '../../../../api/candidate-service/Candidates/CandidateLifecycle';
import {
  getCandidateErrorMessage,
  getCandidateErrorStatusCode,
} from '../../../../shared/utils/auth/candidateError.helpers';
import { roundLabel } from '../roundDisplay';

// Single-candidate Advance popup (candidate details page). Replaces the old
// "Confirm Advance" step for this screen only; the bulk action in the listing
// keeps using ChangeCandidateStatusModal.
//
// Flow on Confirm:
//   1. If the round being completed has no recruiter feedback on file yet, the
//      feedback typed here is saved first (resume stage -> resume review
//      comment; interview round -> recruiter round score + reason). Advance
//      is blocked until it is filled.
//   2. `POST /candidates/{id}/advance`.
//   3. If "Send interview invite" is ticked, `POST /candidates/{id}/send-invite`
//      for the round that just became due, so the candidate is invited in the
//      same step. Unticked, the recruiter sends it later from the Interview
//      Scheduling tab (Invite button).

const FEEDBACK_MAX = 1000;

/** What the round being completed still needs before it can be advanced. */
export type AdvanceFeedbackRequirement =
  | { kind: 'resume' }
  | { kind: 'round'; scoreId: string }
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
  onSuccess: () => void;
};

const AdvanceCandidateModal = ({
  open,
  onClose,
  candidate,
  fromRound,
  toRound,
  feedbackRequirement,
  canAutoInvite,
  onSuccess,
}: AdvanceCandidateModalProps) => {
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [sendInvite, setSendInvite] = useState(true);
  const [needsOverride, setNeedsOverride] = useState(false);
  // Feedback already saved by an earlier attempt of this same Confirm (the
  // advance itself failed afterwards): never saved twice.
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [advanceCandidate] = useAdvanceCandidateMutation();
  const [sendRoundInvite] = useSendRoundInviteMutation();
  const [recordResumeReview] = useRecordResumeReviewMutation();
  const [recordRoundScore] = useRecordRecruiterRoundScoreMutation();

  useEffect(() => {
    if (open) {
      setFeedback('');
      setRating(0);
      setSendInvite(true);
      setNeedsOverride(false);
      setFeedbackSaved(false);
      setIsSubmitting(false);
    }
  }, [open]);

  const needsFeedback = feedbackRequirement !== null && !feedbackSaved;
  const needsRating = needsFeedback && feedbackRequirement?.kind === 'round';
  const isValid = !needsFeedback || (feedback.trim().length > 0 && (!needsRating || rating > 0));

  const fromLabel = fromRound ? roundLabel(fromRound) : 'the current round';
  const toLabel = toRound ? roundLabel(toRound) : null;
  const candidateName =
    `${candidate.first_name ?? ''} ${candidate.last_name ?? ''}`.trim() || 'this candidate';

  const saveFeedback = async () => {
    if (!needsFeedback || !feedbackRequirement) return;
    if (feedbackRequirement.kind === 'resume') {
      await recordResumeReview({
        candidateId: candidate.id,
        body: {
          rating: candidate.resume_rating || undefined,
          comment: feedback.trim(),
        },
      }).unwrap();
    } else {
      await recordRoundScore({
        candidateId: candidate.id,
        scoreId: feedbackRequirement.scoreId,
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
          overridePendingInterviewerFeedback: needsOverride,
        }).unwrap();
      } catch (e) {
        const message = getCandidateErrorMessage(e, '');
        if (
          getCandidateErrorStatusCode(e) === 409 &&
          /interviewer'?s? feedback|override_pending_interviewer_feedback/i.test(message)
        ) {
          // The interviewer hasn't submitted yet: ask once, then the same
          // button sends the override.
          setNeedsOverride(true);
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
      } else if (sendInvite && canAutoInvite) {
        try {
          await sendRoundInvite(candidate.id).unwrap();
          showToast({
            message:
              'Interview scheduling invitation email has been sent to the candidate. If SMS notifications are enabled, an SMS will also be sent.',
            type: 'success',
          });
        } catch (e) {
          showToast({
            message: `Candidate advanced, but the invite could not be sent (${getCandidateErrorMessage(e, 'unknown error')}). Use Invite in the Interview Scheduling tab.`,
            type: 'info',
          });
        }
      } else {
        showToast({ message: 'Candidate advanced to the next round.', type: 'success' });
      }
      // Stay disabled: the modal closes and the parent keeps Advance locked
      // until the refreshed round list shows the candidate on the next round.
      onSuccess();
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
              Before proceeding, please provide feedback for the <strong>{fromLabel}</strong>.
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

        {toLabel && canAutoInvite && (
          <Checkbox checked={sendInvite} onChange={(e) => setSendInvite(e.target.checked)}>
            Send interview invite over email and SMS for <strong>{toLabel}</strong>
          </Checkbox>
        )}
        {toLabel && !canAutoInvite && (
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            The invite for <strong>{toLabel}</strong> is sent from the Interview Scheduling tab (the
            interviewers are chosen there).
          </p>
        )}

        {needsOverride && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            The interviewer hasn&apos;t submitted feedback for this round yet. You can advance
            anyway.
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
            {isSubmitting ? <Loader /> : needsOverride ? 'ADVANCE ANYWAY' : 'CONFIRM'}
          </Button>
        </div>
      </div>
    </AntdCommonModal>
  );
};

export default AdvanceCandidateModal;
