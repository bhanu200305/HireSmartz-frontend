import { useEffect, useState } from 'react';
import { Rate } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { Button, showToast } from '../../../shared';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { useRecordResumeReviewMutation } from '../../../../api/candidate-service/Candidates/scoring';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';

// New — `POST /candidates/{id}/resume-review` (API_CONTRACT.md's "Resume
// Review & Scoring"). A recruiter's own take on the resume, beside the AI
// score — never overwrites `CandidateView.resume_score`. Both fields
// optional, unlike the round-score modal's required pair.
//
// 5 stars, saved as-is (1-5) — the recruiter's Human score is out of 5
// (2026-09-29, product decision); the backend field accepts 0-5, same
// scale as the AI score.

type ResumeReviewModalProps = {
  open: boolean;
  onClose: () => void;
  /** Called right after a successful save, on top of `recordResumeReview`'s
   * own `Candidate` tag invalidation — explicit, rather than trusting that
   * invalidation alone reaches every subscriber in time, the same
   * belt-and-suspenders posture `CompanyProfileTab.tsx` already uses for
   * its own save. Lets the button behind this modal (ADD REVIEW -> EDIT
   * REVIEW) flip the moment the modal closes instead of only whenever the
   * background refetch happens to land. */
  onSaved?: () => void;
  candidateId: string;
  currentRating: number | null;
  currentComment: string | null;
};

const ResumeReviewModal = ({
  open,
  onClose,
  onSaved,
  candidateId,
  currentRating,
  currentComment,
}: ResumeReviewModalProps) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [recordReview, { isLoading }] = useRecordResumeReviewMutation();

  useEffect(() => {
    if (open) {
      setRating(currentRating ?? 0);
      setComment(currentComment ?? '');
    }
  }, [open, currentRating, currentComment]);

  const handleSave = async () => {
    try {
      await recordReview({
        candidateId,
        body: { rating: rating || undefined, comment: comment.trim() || undefined },
      }).unwrap();
      showToast({ message: 'Resume scoring saved.', type: 'success' });
      onSaved?.();
      onClose();
    } catch (e) {
      showToast({ message: getCandidateErrorMessage(e, 'Could not save scoring'), type: 'error' });
    }
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title="Resume Scoring"
      modalProps={{ width: 480 }}
    >
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-1 text-sm text-gray-800">Score</div>
          <Rate count={5} value={rating} onChange={setRating} />
        </div>
        <div>
          <label htmlFor="resume-review-comment" className="mb-1 block text-sm text-gray-800">
            Comment
          </label>
          <TextArea
            id="resume-review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Your own take on this resume"
            rows={4}
            className="resize-y rounded-lg text-sm"
          />
        </div>
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={isLoading}
          className="w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold text-white disabled:opacity-50"
        >
          {isLoading ? 'SAVING…' : 'SAVE SCORING'}
        </Button>
      </div>
    </AntdCommonModal>
  );
};

export default ResumeReviewModal;
