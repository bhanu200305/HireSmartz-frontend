import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Checkbox, Rate } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { Button, showToast } from '../../../shared';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { Loader } from '../../../shared/ui/loader';
import {
  interviewRoundsEndpoints,
  useAdvanceCandidateMutation,
} from '../../../../api/candidate-service/Candidates/interviewRounds';
import {
  scoringEndpoints,
  useRecordRecruiterRoundFeedbackMutation,
  useRecordRecruiterRoundScoreMutation,
  useRecordResumeReviewMutation,
} from '../../../../api/candidate-service/Candidates/scoring';
import type { CandidateView } from '../../../../api/candidate-service/Candidates/CandidateLifecycle';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';
import { RATING_TO_RECOMMENDATION } from '../../../../shared/utils/ratingRecommendation';
import { candidateDisplayName, resolveDisplayStatus } from '../candidateDisplay';
import { findRoundScore } from '../roundPipeline';
import { roundLabel } from '../roundDisplay';
import {
  isIdentityVerificationRound,
  isIntakeCallRound,
  isResumeStageRound,
  isRoundConcluded,
  isStaleResumeRound,
  orderRoundsForFlow,
  resolveCurrentRound,
} from '../roundProgress';

// Bulk Advance from the candidate list. One rating + feedback is given here
// and applied to every selected candidate's current round, then each one is
// advanced exactly as the single Advance popup does it (feedback saved first,
// then one advance call guarded by `expected_round_id`). Candidates that can't
// be advanced right now (interview not finished, last round, resume not in
// yet, already selected/rejected) are left alone and listed with the reason.

const FEEDBACK_MAX = 1000;

type Outcome = {
  id: string;
  name: string;
  status: 'advanced' | 'skipped' | 'failed';
  note: string;
};

type BulkAdvanceModalProps = {
  open: boolean;
  onClose: () => void;
  candidates: CandidateView[];
  /** Called once the run is over and the recruiter closes the summary. */
  onDone: () => void;
};

const BulkAdvanceModal = ({ open, onClose, candidates, onDone }: BulkAdvanceModalProps) => {
  const dispatch = useDispatch<any>();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [sendInvite, setSendInvite] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);

  const [advanceCandidate] = useAdvanceCandidateMutation();
  const [recordResumeReview] = useRecordResumeReviewMutation();
  const [recordRoundScore] = useRecordRecruiterRoundScoreMutation();
  const [recordRoundFeedback] = useRecordRecruiterRoundFeedbackMutation();

  useEffect(() => {
    if (open) {
      setRating(0);
      setFeedback('');
      setSendInvite(true);
      setIsRunning(false);
      setProgress(0);
      setOutcomes(null);
    }
  }, [open]);

  const isValid = rating > 0 && feedback.trim().length > 0;

  const advanceOne = async (candidate: CandidateView): Promise<Omit<Outcome, 'id' | 'name'>> => {
    if (resolveDisplayStatus(candidate) !== 'in_process') {
      return { status: 'skipped', note: 'Already selected, rejected or withdrawn.' };
    }
    const rawRounds = await dispatch(
      interviewRoundsEndpoints.listCandidateInterviewRounds.initiate(candidate.id, {
        forceRefetch: true,
      })
    ).unwrap();
    const rounds = orderRoundsForFlow(rawRounds).filter((r) => !isStaleResumeRound(r));
    const current = resolveCurrentRound(rounds);
    if (!current) return { status: 'skipped', note: 'No round left to advance.' };
    const currentIndex = rounds.findIndex((r) => r.id === current.id);
    const next = rounds[currentIndex + 1] ?? null;
    if (!next) return { status: 'skipped', note: 'Last round: mark as selected or reject.' };
    if (isResumeStageRound(current) && !candidate.resume_s3_key) {
      return { status: 'skipped', note: 'Waiting for the candidate to upload a resume.' };
    }
    if (current.stage_type === 'interview' && !isRoundConcluded(current)) {
      return { status: 'skipped', note: `${roundLabel(current)} has not finished yet.` };
    }

    const comment = feedback.trim();
    if (isResumeStageRound(current)) {
      await recordResumeReview({ candidateId: candidate.id, body: { rating, comment } }).unwrap();
    } else {
      const scores = await dispatch(
        scoringEndpoints.listCandidateInterviewScores.initiate(candidate.id, {
          forceRefetch: true,
        })
      ).unwrap();
      const score = findRoundScore(scores, current);
      if (score) {
        await recordRoundScore({
          candidateId: candidate.id,
          scoreId: score.id,
          body: { recruiterScore: rating, reason: comment },
        }).unwrap();
      } else {
        await recordRoundFeedback({
          candidateId: candidate.id,
          candidateInterviewRoundId: current.id,
          body: { recruiterScore: rating, reason: comment },
        }).unwrap();
      }
    }

    const canAutoInvite =
      next.stage_type === 'interview' &&
      next.round_type !== 'PANEL' &&
      !(next.round_type == null && /panel/i.test(next.round_name ?? '')) &&
      !isIdentityVerificationRound(next);
    await advanceCandidate({
      candidateId: candidate.id,
      expectedRoundId: current.id,
      sendInvite: sendInvite && canAutoInvite,
      interviewerFeedback: !isIntakeCallRound(current)
        ? { recommendation: RATING_TO_RECOMMENDATION[rating], notes: comment }
        : null,
    }).unwrap();
    return { status: 'advanced', note: `Moved to ${roundLabel(next)}.` };
  };

  const handleConfirm = async () => {
    if (isRunning || !isValid) return;
    setIsRunning(true);
    const results: Outcome[] = [];
    for (const candidate of candidates) {
      const name = candidateDisplayName(candidate);
      try {
        results.push({ id: candidate.id, name, ...(await advanceOne(candidate)) });
      } catch (e) {
        results.push({
          id: candidate.id,
          name,
          status: 'failed',
          note: getCandidateErrorMessage(e, 'Could not advance this candidate.'),
        });
      }
      setProgress(results.length);
    }
    setOutcomes(results);
    setIsRunning(false);
    const advanced = results.filter((r) => r.status === 'advanced').length;
    showToast({
      message: `${advanced} of ${results.length} candidates advanced.`,
      type: advanced > 0 ? 'success' : 'warning',
    });
  };

  const handleClose = () => {
    if (isRunning) return;
    if (outcomes) onDone();
    onClose();
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={isRunning ? undefined : handleClose}
      title="Advance Candidates"
      modalProps={{ width: 560 }}
    >
      {outcomes ? (
        <div className="flex flex-col gap-4">
          <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto text-sm">
            {outcomes.map((o) => (
              <li key={o.id} className="rounded-lg border border-gray-200 px-3 py-2">
                <span className="font-semibold">{o.name}</span>
                <span
                  className={
                    o.status === 'advanced'
                      ? ' text-green-700'
                      : o.status === 'failed'
                        ? ' text-red-600'
                        : ' text-gray-500'
                  }
                >
                  {' · '}
                  {o.status === 'advanced'
                    ? 'Advanced'
                    : o.status === 'failed'
                      ? 'Failed'
                      : 'Not advanced'}
                </span>
                <p className="text-xs text-gray-600">{o.note}</p>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            onClick={handleClose}
            className="rounded-full bg-primary py-2.5 text-center text-sm font-semibold text-white"
          >
            DONE
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-center text-sm text-gray-700">
            You are advancing <strong>{candidates.length}</strong> candidate
            {candidates.length === 1 ? '' : 's'} to the next round. The rating and feedback below
            are recorded for each candidate&apos;s current round. Candidates who can&apos;t be
            advanced yet are left as they are.
          </p>
          <div className="flex flex-col gap-2">
            <label htmlFor="bulk-advance-feedback" className="text-sm text-gray-800">
              <strong>
                Feedback <span className="required-asterisk">*</span>
              </strong>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-800">
                Rating <span className="required-asterisk">*</span>
              </span>
              <Rate value={rating} onChange={setRating} />
            </div>
            <TextArea
              id="bulk-advance-feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Add feedback here..."
              rows={5}
              maxLength={FEEDBACK_MAX}
              className="resize-y rounded-lg text-sm"
            />
            <p className="text-right text-xs text-gray-500">
              {feedback.length}/{FEEDBACK_MAX} characters
            </p>
          </div>
          <Checkbox checked={sendInvite} onChange={(e) => setSendInvite(e.target.checked)}>
            Send the next round&apos;s interview invite over email and SMS where possible
          </Checkbox>
          {isRunning && (
            <p className="text-center text-xs text-gray-500">
              Advancing {progress} of {candidates.length}...
            </p>
          )}
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={handleClose}
              disabled={isRunning}
              className="flex-1 rounded-full border border-gray-200 py-2.5 text-center text-sm font-semibold text-gray-600 disabled:opacity-50"
            >
              CANCEL
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={isRunning || !isValid}
              className="flex-1 rounded-full bg-primary py-2.5 text-center text-sm font-semibold text-white disabled:opacity-50"
            >
              {isRunning ? <Loader /> : 'CONFIRM'}
            </Button>
          </div>
        </div>
      )}
    </AntdCommonModal>
  );
};

export default BulkAdvanceModal;
