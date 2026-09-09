import { useEffect, useMemo, useState } from 'react';
import TextArea from 'antd/es/input/TextArea';
import { Button, showToast } from '../../../shared';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { Loader } from '../../../shared/ui/loader';
import { useListCandidateStatusesQuery } from '../../../../api/candidate-service/Master/master';
import {
  useBulkChangeCandidateStatusMutation,
  BULK_STATUS_FAILURE_LABELS,
} from '../../../../api/candidate-service/Candidates/status';
import {
  useBulkAdvanceCandidatesMutation,
  BULK_ADVANCE_FAILURE_LABELS,
} from '../../../../api/candidate-service/Candidates/interviewRounds';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';
import type { CandidateView } from '../../../../api/candidate-service/Candidates/CandidateLifecycle';

// New — replaces `CandidateStatus.tsx`'s usage inside `CandidatesListing.tsx`
// only (that component is still used by `CandidateDetails.tsx` /
// `InterviewSummary/InterviewRounds.tsx`, out of scope this phase — kept
// untouched, this is a separate file). The real backend's status model is
// deliberately much simpler than the legacy one it replaces: ANY
// `master_candidate_status` code is accepted with no transition-legality
// check. This modal does exactly two things:
//
// - "Advance": `POST /candidates/bulk-advance` — one request, partial-apply
//   (each candidate advances in its own server-side transaction, so one
//   failure never undoes another's; each reported independently in
//   `results[]`, same spirit as bulk messaging's per-row `skipped_reason`).
//   Was a per-candidate loop over `POST /candidates/{id}/advance` until the
//   bulk endpoint landed (candidate-service, 2026-09-08). ADVANCE ONLY EVER
//   completes the current round and makes the next one due — it does NOT
//   tell interview-service to schedule it. That's a SEPARATE, explicit
//   "Send Invite" action (`POST /candidates/{id}/send-invite`,
//   send_round_invite.py's own docstring: "advance/skip alone do not do
//   this"), and today it only exists single-candidate, in
//   `PipelineBoard.tsx`'s Pipeline tab — there is no bulk-send-invite
//   endpoint, so it can't be offered from here. (Earlier revisions of this
//   comment/the confirm copy below claimed advance auto-schedules the next
//   round — that stopped being true once send-invite became a required,
//   separate step; corrected 2026-09-07, flagged by a teammate reviewing
//   this file.)
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
  const [results, setResults] = useState<
    { name: string; ok: boolean; detail: string; needsInvite: boolean }[] | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: statuses = [] } = useListCandidateStatusesQuery();
  const [bulkChangeStatus] = useBulkChangeCandidateStatusMutation();
  const [bulkAdvanceCandidates] = useBulkAdvanceCandidatesMutation();

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
      try {
        const { results: itemResults } = await bulkAdvanceCandidates(
          candidates.map((c) => c.id)
        ).unwrap();
        const byId = new Map(itemResults.map((r) => [r.candidate_id, r]));
        setResults(
          candidates.map((c) => {
            const name = candidateDisplayName(c);
            const item = byId.get(c.id);
            if (!item || item.outcome === 'failed') {
              const slug = item?.failure_reason ?? '';
              return {
                name,
                ok: false,
                detail: BULK_ADVANCE_FAILURE_LABELS[slug] ?? 'Could not advance',
                needsInvite: false,
              };
            }
            if (item.outcome === 'unchanged') {
              // Idempotent no-op — the candidate had already finished every
              // round before this call. Not a failure.
              return {
                name,
                ok: true,
                detail: 'No change — already past the final round',
                needsInvite: false,
              };
            }
            // outcome === 'advanced'. A real next round (`next_round_id` set)
            // still needs a separate Send Invite; `null` means that was the
            // last round and the candidate is now Selected.
            return {
              name,
              ok: true,
              detail: item.next_round_id
                ? 'Advanced to next round'
                : 'Completed final round — moved to Selected',
              needsInvite: item.next_round_id !== null,
            };
          })
        );
        onSuccess();
      } catch (e) {
        // Unlike the per-item outcomes above, a 422 (request shape) or 502
        // (job-service unreachable) fails the whole call.
        showToast({
          message: getCandidateErrorMessage(e, 'Could not advance candidates'),
          type: 'error',
        });
      } finally {
        setIsSubmitting(false);
      }
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
      const { results: itemResults } = await bulkChangeStatus({
        candidateIds: candidates.map((c) => c.id),
        statusCode: targetStatus.code,
        reason: reason.trim() || undefined,
      }).unwrap();
      const byId = new Map(itemResults.map((r) => [r.candidate_id, r]));
      setResults(
        candidates.map((c) => {
          const name = candidateDisplayName(c);
          const item = byId.get(c.id);
          if (!item || item.outcome === 'failed') {
            const slug = item?.failure_reason ?? '';
            return {
              name,
              ok: false,
              detail: BULK_STATUS_FAILURE_LABELS[slug] ?? 'Could not update status',
              needsInvite: false,
            };
          }
          return {
            name,
            ok: true,
            detail:
              item.outcome === 'unchanged'
                ? 'No change — already at this status'
                : `Set to "${MODE_LABEL[mode]}"`,
            needsInvite: false,
          };
        })
      );
      onSuccess();
    } catch (e) {
      // Only a bad status_code / `withdrawn` (422) or job-service down mid-batch
      // (502) fails the whole call now — per-candidate problems are in
      // `results[].failure_reason` above (API_CONTRACT.md: bulk-status is
      // partial-apply as of 2026-09-08).
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
                  {r.needsInvite && (
                    <span className="ml-1 text-amber-600" title="Send Invite still needed">
                      · invite not sent
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
          {results.some((r) => r.needsInvite) && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Advancing does not send the interview invite. There is no bulk send-invite yet — open
              each candidate&apos;s Pipeline tab and click <strong>Send Invite</strong> for their
              next round.
            </p>
          )}
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
              ? "This completes each candidate's current round and makes their next one due. It does NOT send the interview invite — that's a separate step, per candidate, from their Pipeline tab."
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
