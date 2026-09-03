import { useState } from 'react';
import TextArea from 'antd/es/input/TextArea';
import { Button, showToast } from '../../../shared';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { Loader } from '../../../shared/ui/loader';
import { useSkipInterviewRoundMutation } from '../../../../api/candidate-service/Candidates/interviewRounds';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';

// POST /candidates/{id}/skip-round — per-candidate only, never touches
// job-service's shared round plan (skip_interview_round.py's own docstring).
// Backend requires a non-empty reason and refuses the resume stage, an
// already-scored round, or a candidate already in a final status — this
// modal only ever opens for a round PipelineBoard has already confirmed is
// `stage_type === 'interview'` and not yet scored/final, but the backend's
// own 409/422 is still the real guard, not this client-side check.

type SkipRoundModalProps = {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  roundName: string;
  onSuccess: () => void;
};

const SkipRoundModal = ({
  open,
  onClose,
  candidateId,
  roundName,
  onSuccess,
}: SkipRoundModalProps) => {
  const [reason, setReason] = useState('');
  const [skipRound, { isLoading }] = useSkipInterviewRoundMutation();

  const handleConfirm = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      showToast({ message: 'A reason is required to skip a round.', type: 'error' });
      return;
    }
    try {
      const result = await skipRound({ candidateId, reason: trimmed }).unwrap();
      showToast({
        message: result.next_round
          ? `Skipped — ${result.next_round.round_name} is now due.`
          : 'Skipped — that was the candidate’s final round.',
        type: 'success',
      });
      setReason('');
      onSuccess();
      onClose();
    } catch (e) {
      showToast({
        message: getCandidateErrorMessage(e, 'Could not skip this round'),
        type: 'error',
      });
    }
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title="Skip Round"
      subtitle={roundName}
      modalProps={{ width: 480 }}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">
          This moves the candidate straight to the next round in their plan — it never touches
          job-service&apos;s round plan for the job itself, and never affects any other candidate.
        </p>
        <div>
          <label htmlFor="skip-round-reason" className="mb-1 block text-sm text-gray-800">
            Reason <span className="text-red-500">*</span>
          </label>
          <TextArea
            id="skip-round-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this round being skipped?"
            rows={3}
            className="resize-y rounded-lg text-sm"
          />
        </div>
        <Button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={isLoading || !reason.trim()}
          className="w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-50"
        >
          {isLoading ? <Loader /> : 'CONFIRM SKIP'}
        </Button>
      </div>
    </AntdCommonModal>
  );
};

export default SkipRoundModal;
