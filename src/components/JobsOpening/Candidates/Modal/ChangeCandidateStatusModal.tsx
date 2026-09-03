import { useEffect, useMemo, useState } from 'react';
import TextArea from 'antd/es/input/TextArea';
import { Button, showToast } from '../../../shared';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { Loader } from '../../../shared/ui/loader';
import { useListCandidateStatusesQuery } from '../../../../api/candidate-service/Master/master';
import { useBulkChangeCandidateStatusMutation } from '../../../../api/candidate-service/Candidates/status';
import { useAdvanceCandidateMutation } from '../../../../api/candidate-service/Candidates/interviewRounds';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';
import type { CandidateView } from '../../../../api/candidate-service/Candidates/CandidateLifecycle';

// New — replaces `CandidateStatus.tsx`'s usage inside `CandidatesListing.tsx`
// only (that component is still used by `CandidateDetails.tsx` /
// `InterviewSummary/InterviewRounds.tsx`, out of scope this phase — kept
// untouched, this is a separate file). The real backend's status model is
// deliberately much simpler than the legacy one it replaces: ANY
// `master_candidate_status` code is accepted with no transition-legality
// check, and there is no manual interview-invite side effect to orchestrate
// here at all — interview-service books the next round automatically once
// `candidate.round.ready` fires server-side after `POST /advance`
// (PROJECT_UNDERSTANDING.md §5/§10). This modal does exactly two things:
//
// - "Advance": `POST /candidates/{id}/advance` per candidate (no bulk
//   advance endpoint exists — looped, each reported independently, same
//   spirit as bulk messaging's per-row `skipped_reason`).
// - "Reject" / "Select": `POST /candidates/bulk-status` (or the single-
//   candidate status route for one candidate), all-or-nothing, using the
//   real `rejected`/`selected` codes resolved from master data rather than
//   hardcoded (FRONTEND_INTEGRATION_DETAILS.md §4.6).

export type ChangeCandidateStatusMode = 'advance' | 'reject' | 'select';

type ChangeCandidateStatusModalProps = {
  open: boolean;
  onClose: () => void;
  mode: ChangeCandidateStatusMode;
  candidates: CandidateView[];
  onSuccess: () => void;
};

const MODE_LABEL: Record<ChangeCandidateStatusMode, string> = {
  advance: 'Advance',
  reject: 'Reject',
  select: 'Mark Selected',
};

// PROJECT_UNDERSTANDING.md §4's documented seeded `master_candidate_status`
// codes — matched against whatever `GET /master/candidate-statuses`
// actually returns rather than trusted blindly, since that endpoint is the
// real source of truth and can grow.
const REJECT_CODE = 'rejected';
const SELECT_CODE = 'selected';

const candidateDisplayName = (c: CandidateView) =>
  `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Candidate';

const ChangeCandidateStatusModal = ({
  open,
  onClose,
  mode,
  candidates,
  onSuccess,
}: ChangeCandidateStatusModalProps) => {
  const [reason, setReason] = useState('');
  const [results, setResults] = useState<{ name: string; ok: boolean; detail: string }[] | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: statuses = [] } = useListCandidateStatusesQuery();
  const [bulkChangeStatus] = useBulkChangeCandidateStatusMutation();
  const [advanceCandidate] = useAdvanceCandidateMutation();

  useEffect(() => {
    if (open) {
      setReason('');
      setResults(null);
    }
  }, [open, mode]);

  const targetStatus = useMemo(() => {
    if (mode === 'reject') return statuses.find((s) => s.code === REJECT_CODE);
    if (mode === 'select') return statuses.find((s) => s.code === SELECT_CODE);
    return undefined;
  }, [mode, statuses]);

  const handleConfirm = async () => {
    if (candidates.length === 0) return;
    setIsSubmitting(true);

    if (mode === 'advance') {
      const settled = await Promise.allSettled(
        candidates.map((c) => advanceCandidate(c.id).unwrap())
      );
      setResults(
        settled.map((r, i) => {
          const name = candidateDisplayName(candidates[i]);
          if (r.status === 'fulfilled') {
            const detail = r.value.next_round
              ? `Advanced to ${r.value.next_round.round_name ?? 'next round'}`
              : 'Completed final round — moved to Selected';
            return { name, ok: true, detail };
          }
          return {
            name,
            ok: false,
            detail: getCandidateErrorMessage(r.reason, 'Could not advance'),
          };
        })
      );
      onSuccess();
      setIsSubmitting(false);
      return;
    }

    if (!targetStatus) {
      showToast({
        message: `Could not resolve the "${mode}" status from master data — try again shortly.`,
        type: 'error',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await bulkChangeStatus({
        candidateIds: candidates.map((c) => c.id),
        statusCode: targetStatus.code,
        reason: reason.trim() || undefined,
      }).unwrap();
      showToast({
        message: `${candidates.length} candidate${candidates.length === 1 ? '' : 's'} updated.`,
        type: 'success',
      });
      onSuccess();
      onClose();
    } catch (e) {
      // Bulk status is all-or-nothing — a failure here means NONE of the
      // selected candidates were updated, unlike advance/messaging's
      // per-item results (API_CONTRACT.md's own "all-or-nothing" note).
      showToast({ message: getCandidateErrorMessage(e, 'Could not update status'), type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title={MODE_LABEL[mode]}
      subtitle={`${candidates.length} candidate${candidates.length === 1 ? '' : 's'} selected`}
      modalProps={{ width: 560 }}
    >
      {results ? (
        <div className="flex flex-col gap-4">
          <div className="flex max-h-[min(320px,55vh)] flex-col gap-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
            {results.map((r, i) => (
              <div key={i} className="flex items-start justify-between gap-3 text-sm">
                <span className="font-medium text-gray-900">{r.name}</span>
                <span className={`text-right shrink-0 ${r.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {r.detail}
                </span>
              </div>
            ))}
          </div>
          <Button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-white"
          >
            DONE
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            {mode === 'advance'
              ? "This completes each candidate's current round. If a next round exists, interview-service schedules it automatically — nothing to configure here."
              : `This will set ${candidates.length === 1 ? 'this candidate' : 'these candidates'} to "${MODE_LABEL[mode]}".`}
          </p>
          {mode !== 'advance' && (
            <div>
              <label htmlFor="status-change-reason" className="mb-1 block text-sm text-gray-800">
                Reason (optional)
              </label>
              <TextArea
                id="status-change-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Recorded in the candidate's status history"
                rows={3}
                className="resize-y rounded-lg text-sm"
              />
            </div>
          )}
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isSubmitting || candidates.length === 0}
            className="w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-50"
          >
            {isSubmitting ? <Loader /> : `CONFIRM ${MODE_LABEL[mode].toUpperCase()}`}
          </Button>
        </div>
      )}
    </AntdCommonModal>
  );
};

export default ChangeCandidateStatusModal;
