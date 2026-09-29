import { useEffect, useState } from 'react';
import { Rate } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { Button, showToast } from '../../../shared';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import {
  useRecordRecruiterRoundScoreMutation,
  useDeleteRecruiterRoundScoreMutation,
} from '../../../../api/candidate-service/Candidates/scoring';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';

// New — `POST /candidates/{id}/interview-scores/{score_id}/recruiter-score`.
// Unlike the resume review, both `recruiter_score` and `reason` are
// REQUIRED here (API_CONTRACT.md's "Resume Review & Scoring" section).
// "Remove score" (DELETE, same route) mirrors ResumeReviewModal's own
// remove affordance — only shown once there's actually a score on file to
// remove, same author-only rule as the resume review's delete.
//
// 5 stars, saved as-is (1-5) — the recruiter's Human score is out of 5
// (2026-09-29, product decision); the backend field accepts 0-5, same
// scale as the AI score.

type RecruiterRoundScoreModalProps = {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  scoreId: string;
  roundName: string;
  currentScore: number | null;
  currentReason: string | null;
};

const RecruiterRoundScoreModal = ({
  open,
  onClose,
  candidateId,
  scoreId,
  roundName,
  currentScore,
  currentReason,
}: RecruiterRoundScoreModalProps) => {
  const [score, setScore] = useState(0);
  const [reason, setReason] = useState('');
  const [recordScore, { isLoading }] = useRecordRecruiterRoundScoreMutation();
  const [deleteScore, { isLoading: isDeleting }] = useDeleteRecruiterRoundScoreMutation();

  useEffect(() => {
    if (open) {
      setScore(currentScore ?? 0);
      setReason(currentReason ?? '');
    }
  }, [open, currentScore, currentReason]);

  const isFormValid = score > 0 && reason.trim().length > 0;

  const handleSave = async () => {
    if (!isFormValid) {
      showToast({ message: 'Both a score and a reason are required.', type: 'error' });
      return;
    }
    try {
      await recordScore({
        candidateId,
        scoreId,
        body: { recruiterScore: score, reason: reason.trim() },
      }).unwrap();
      showToast({ message: 'Round score saved.', type: 'success' });
      onClose();
    } catch (e) {
      showToast({ message: getCandidateErrorMessage(e, 'Could not save score'), type: 'error' });
    }
  };

  const handleRemove = async () => {
    try {
      await deleteScore({ candidateId, scoreId }).unwrap();
      showToast({ message: 'Round score removed.', type: 'success' });
      onClose();
    } catch (e) {
      showToast({ message: getCandidateErrorMessage(e, 'Could not remove score'), type: 'error' });
    }
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title="Score this round"
      subtitle={roundName}
      modalProps={{ width: 480 }}
    >
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-1 text-sm text-gray-800">
            Score <span className="required-asterisk">*</span>
          </div>
          <Rate count={5} value={score} onChange={setScore} />
        </div>
        <div>
          <label htmlFor="round-score-reason" className="mb-1 block text-sm text-gray-800">
            Reason <span className="required-asterisk">*</span>
          </label>
          <TextArea
            id="round-score-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why this score"
            rows={4}
            className="resize-y rounded-lg text-sm"
          />
        </div>
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={isLoading || isDeleting || !isFormValid}
          className="w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-50"
        >
          {isLoading ? 'SAVING…' : 'SAVE SCORE'}
        </Button>
        {currentScore !== null && (
          <button
            type="button"
            onClick={() => void handleRemove()}
            disabled={isLoading || isDeleting}
            className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isDeleting ? 'Removing…' : 'Remove score'}
          </button>
        )}
      </div>
    </AntdCommonModal>
  );
};

export default RecruiterRoundScoreModal;
