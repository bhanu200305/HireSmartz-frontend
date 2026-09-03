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

type ResumeReviewModalProps = {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  currentRating: number | null;
  currentComment: string | null;
};

const ResumeReviewModal = ({
  open,
  onClose,
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
      showToast({ message: 'Resume review saved.', type: 'success' });
      onClose();
    } catch (e) {
      showToast({ message: getCandidateErrorMessage(e, 'Could not save review'), type: 'error' });
    }
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title="Resume Review"
      modalProps={{ width: 480 }}
    >
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-1 text-sm text-gray-800">Rating</div>
          <Rate value={rating} onChange={setRating} />
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
          className="w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-50"
        >
          {isLoading ? 'SAVING…' : 'SAVE REVIEW'}
        </Button>
      </div>
    </AntdCommonModal>
  );
};

export default ResumeReviewModal;
