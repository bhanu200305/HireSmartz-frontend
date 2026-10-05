import { useEffect, useMemo, useState } from 'react';
import { Checkbox, Select } from 'antd';
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
  useAdvanceCandidateMutation,
  useBulkAdvanceCandidatesMutation,
  BULK_ADVANCE_FAILURE_LABELS,
  type AdvanceInterviewerFeedback,
  type CandidateInterviewRoundView,
  type InterviewerRecommendation,
} from '../../../../api/candidate-service/Candidates/interviewRounds';
import {
  getCandidateErrorMessage,
  getCandidateErrorStatusCode,
} from '../../../../shared/utils/auth/candidateError.helpers';
import type { CandidateView } from '../../../../api/candidate-service/Candidates/CandidateLifecycle';
import { isIntakeCallRound } from '../roundProgress';
import { roundLabel } from '../roundDisplay';

// New — replaces `CandidateStatus.tsx`'s usage inside `CandidatesListing.tsx`
// only (that component is still used by `CandidateDetails.tsx` /
// `InterviewSummary/InterviewRounds.tsx`, out of scope this phase — kept
// untouched, this is a separate file). The real backend's status model is
// deliberately much simpler than the legacy one it replaces: ANY
// `master_candidate_status` code is accepted with no transition-legality
// check. This modal does exactly two things:
//
// - "Advance", ONE candidate (2026-10-05): `POST /candidates/{id}/advance`,
//   which can also send the next round's invite (`send_invite`), carry the
//   interviewer's verdict on the round being completed
//   (`interviewer_feedback`, body), and refuse a stale screen
//   (`expected_round_id` -> 409 ROUND_ALREADY_ADVANCED). The notes below
//   about advance never sending the invite describe the bulk path only.
// - "Advance", several candidates: `POST /candidates/bulk-advance` — one request, partial-apply
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
//   the Assessment tab's per-round actions — there is no bulk-send-invite
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
  /** The single candidate's current round as the caller's screen shows it —
   * sent as `expected_round_id`, and decides whether interviewer feedback
   * is offered. Omit when unknown (e.g. the list view). */
  currentRound?: CandidateInterviewRoundView | null;
};

const RECOMMENDATION_OPTIONS: { value: InterviewerRecommendation; label: string }[] = [
  { value: 'strong_yes', label: 'Strong Yes' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'strong_no', label: 'Strong No' },
];

// candidate-service's error body has no machine code, so the two 409s the
// single advance can return are told apart by their message.
const isInterviewerFeedbackPending = (e: unknown) =>
  getCandidateErrorStatusCode(e) === 409 &&
  /interviewer'?s? feedback|override_pending_interviewer_feedback/i.test(
    getCandidateErrorMessage(e, '')
  );
const isRoundAlreadyAdvanced = (e: unknown) =>
  getCandidateErrorStatusCode(e) === 409 && !isInterviewerFeedbackPending(e);

// Wording for the dialog itself (title, confirm button, result line).
const MODE_TITLE: Record<ChangeCandidateStatusMode, string> = {
  advance: 'Advance',
  reject: 'Reject Candidate',
  select: 'Mark As Selected',
};
const MODE_CONFIRM: Record<ChangeCandidateStatusMode, string> = {
  advance: 'Confirm Advance',
  reject: 'Reject Candidate',
  select: 'Mark As Selected',
};
const MODE_DONE: Record<ChangeCandidateStatusMode, string> = {
  advance: 'Advanced',
  reject: 'Rejected',
  select: 'Marked as selected',
};

// PROJECT_UNDERSTANDING.md §4's documented seeded `master_candidate_status`
// codes — matched against whatever `GET /candidate-master/candidate-statuses`
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
  currentRound,
}: ChangeCandidateStatusModalProps) => {
  const [reason, setReason] = useState('');
  const [sendInvite, setSendInvite] = useState(false);
  const [recommendation, setRecommendation] = useState<InterviewerRecommendation | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [results, setResults] = useState<
    | {
        name: string;
        ok: boolean;
        detail: string;
        needsInvite: boolean;
        /** Set on a failure the recruiter may push through (interviewer feedback pending). */
        overrideCandidateId?: string;
      }[]
    | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: statuses = [] } = useListCandidateStatusesQuery();
  const [bulkChangeStatus] = useBulkChangeCandidateStatusMutation();
  const [bulkAdvanceCandidates] = useBulkAdvanceCandidatesMutation();
  const [advanceCandidate, { isLoading: isOverriding }] = useAdvanceCandidateMutation();

  useEffect(() => {
    if (open) {
      setReason('');
      setResults(null);
      setSendInvite(false);
      setRecommendation(null);
      setFeedbackNotes('');
    }
  }, [open, mode]);

  const targetStatus = useMemo(() => {
    if (mode === 'reject') return statuses.find((s) => s.code === REJECT_CODE);
    if (mode === 'select') return statuses.find((s) => s.code === SELECT_CODE);
    return undefined;
  }, [mode, statuses]);

  const isSingleAdvance = mode === 'advance' && candidates.length === 1;
  // Interviewer feedback only means something for a round an interviewer
  // ran — not the resume stage, and not the Intake Call (which never needs it).
  const offersInterviewerFeedback =
    isSingleAdvance && currentRound?.stage_type === 'interview' && !isIntakeCallRound(currentRound);
  const interviewerFeedback: AdvanceInterviewerFeedback | null =
    offersInterviewerFeedback && recommendation
      ? { recommendation, notes: feedbackNotes.trim() }
      : null;

  const advanceOne = (candidateId: string, overridePendingInterviewerFeedback = false) =>
    advanceCandidate({
      candidateId,
      expectedRoundId: currentRound?.id ?? null,
      sendInvite,
      interviewerFeedback,
      overridePendingInterviewerFeedback,
    }).unwrap();

  const advancedDetail = (hasNextRound: boolean) =>
    hasNextRound
      ? sendInvite
        ? 'Advanced to next round, invite sent'
        : 'Advanced to next round'
      : 'Completed final round, moved to Selected';

  const handleConfirm = async () => {
    if (candidates.length === 0) return;
    // Backend does not enforce this today — `BulkChangeCandidateStatusRequest.
    // reason` / `ChangeCandidateStatusRequest.reason` are both plain
    // `str | None`, no conditional requirement tied to `status_code`, unlike
    // `SkipInterviewRoundRequest.reason` and `RecordRecruiterRoundScoreRequest.
    // reason` in the same file, which ARE mandatory with a comment explaining
    // why. This is the client-side half of "a rejection needs a reason" until
    // that's closed server-side too.
    if (mode === 'reject' && !reason.trim()) {
      showToast({ message: 'Please provide a reason for the rejection.', type: 'error' });
      return;
    }
    setIsSubmitting(true);

    if (isSingleAdvance) {
      const c = candidates[0];
      const name = candidateDisplayName(c);
      try {
        const res = await advanceOne(c.id);
        const hasNextRound = res.next_round !== null;
        setResults([
          {
            name,
            ok: true,
            detail: advancedDetail(hasNextRound),
            needsInvite: hasNextRound && !sendInvite,
          },
        ]);
        onSuccess();
      } catch (e) {
        if (isInterviewerFeedbackPending(e)) {
          // Ask once; "Advance anyway" sends the override.
          setResults([
            {
              name,
              ok: false,
              detail: BULK_ADVANCE_FAILURE_LABELS.interviewer_feedback_pending,
              needsInvite: false,
              overrideCandidateId: c.id,
            },
          ]);
        } else if (isRoundAlreadyAdvanced(e)) {
          // Stale screen: someone already advanced past this round. The
          // mutation's tag invalidation refetches the candidate's rounds.
          setResults([
            {
              name,
              ok: false,
              detail: currentRound
                ? `${roundLabel(currentRound)} was already advanced by someone else. The page has been refreshed; check the current round before trying again.`
                : 'This candidate was already advanced by someone else. The page has been refreshed.',
              needsInvite: false,
            },
          ]);
        } else {
          showToast({
            message: getCandidateErrorMessage(e, 'Could not advance this candidate'),
            type: 'error',
          });
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

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
                // The interviewer's feedback gate can be pushed through per
                // candidate (bulk-advance has no override of its own).
                overrideCandidateId: slug === 'interviewer_feedback_pending' ? c.id : undefined,
              };
            }
            if (item.outcome === 'unchanged') {
              // Idempotent no-op — the candidate had already finished every
              // round before this call. Not a failure.
              return {
                name,
                ok: true,
                detail: 'No change, already past the final round',
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
                : 'Completed final round, moved to Selected',
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
        message: `Could not resolve the "${mode}" status from master data. Try again shortly.`,
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
              item.outcome === 'unchanged' ? 'No change, already at this status' : MODE_DONE[mode],
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

  // "Advance anyway": single advance with override_pending_interviewer_feedback.
  // For a single-candidate advance it keeps that dialog's invite/feedback
  // choices; from the bulk path those are unset.
  const handleAdvanceAnyway = async (index: number, candidateId: string) => {
    try {
      const res = isSingleAdvance
        ? await advanceOne(candidateId, true)
        : await advanceCandidate({
            candidateId,
            overridePendingInterviewerFeedback: true,
          }).unwrap();
      setResults((prev) =>
        prev
          ? prev.map((r, i) =>
              i === index
                ? {
                    ...r,
                    ok: true,
                    overrideCandidateId: undefined,
                    detail: isSingleAdvance
                      ? advancedDetail(res.next_round !== null)
                      : res.next_round
                        ? 'Advanced to next round'
                        : 'Completed final round, moved to Selected',
                    needsInvite: res.next_round !== null && !(isSingleAdvance && sendInvite),
                  }
                : r
            )
          : prev
      );
      onSuccess();
    } catch (e) {
      showToast({
        message: getCandidateErrorMessage(e, 'Could not advance this candidate'),
        type: 'error',
      });
    }
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title={MODE_TITLE[mode]}
      subtitle={
        candidates.length === 1
          ? candidateDisplayName(candidates[0])
          : `${candidates.length} candidates selected`
      }
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
                  {r.overrideCandidateId && (
                    <button
                      type="button"
                      disabled={isOverriding}
                      onClick={() => void handleAdvanceAnyway(i, r.overrideCandidateId as string)}
                      className="ml-2 rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700 cursor-pointer disabled:opacity-50"
                    >
                      {isOverriding ? 'Advancing…' : 'Advance anyway'}
                    </button>
                  )}
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
              The interview invite for the next round wasn&apos;t sent. Open the candidate&apos;s
              Interview Scheduling tab and click <strong>Invite</strong> for their next round.
            </p>
          )}
          <Button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold text-white"
          >
            Done
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {mode === 'reject' ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-semibold">
                {candidates.length === 1
                  ? `You are about to reject ${candidateDisplayName(candidates[0])}.`
                  : `You are about to reject ${candidates.length} candidates.`}
              </p>
              <p className="mt-1">
                This action cannot be undone. {candidates.length === 1 ? 'The candidate' : 'They'}{' '}
                will be removed from the hiring pipeline and will not progress to any further
                rounds.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              {isSingleAdvance
                ? currentRound
                  ? `This completes ${roundLabel(currentRound)} and makes the candidate's next round due.`
                  : "This completes the candidate's current round and makes their next one due."
                : mode === 'advance'
                  ? "This completes each candidate's current round and makes their next one due. It does NOT send the interview invite; that's a separate step, per candidate, from their Interview Scheduling tab."
                  : `You are about to mark ${candidates.length === 1 ? candidateDisplayName(candidates[0]) : `${candidates.length} candidates`} as selected. Any interview rounds still pending will be skipped.`}
            </p>
          )}
          {isSingleAdvance && (
            <Checkbox
              id="advance-send-invite"
              checked={sendInvite}
              onChange={(e) => setSendInvite(e.target.checked)}
              className="text-sm"
            >
              Send the interview invite for the next round
            </Checkbox>
          )}
          {offersInterviewerFeedback && currentRound && (
            <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Interviewer feedback for {roundLabel(currentRound)}{' '}
                  <span className="font-normal text-gray-500">(optional)</span>
                </p>
                <p className="text-xs text-gray-500">
                  Saved only if this round has no interviewer feedback yet.
                </p>
              </div>
              <Select
                id="advance-feedback-recommendation"
                allowClear
                placeholder="Recommendation"
                value={recommendation ?? undefined}
                onChange={(value) => setRecommendation(value ?? null)}
                options={RECOMMENDATION_OPTIONS}
                className="w-full"
              />
              {recommendation && (
                <TextArea
                  id="advance-feedback-notes"
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  placeholder="Notes"
                  rows={3}
                  maxLength={2000}
                  className="resize-y rounded-lg text-sm"
                />
              )}
            </div>
          )}
          {mode !== 'advance' && (
            <div>
              <label htmlFor="status-change-reason" className="mb-1 block text-sm text-gray-800">
                {mode === 'reject' ? 'Reason for Rejection' : 'Reason (Optional)'}{' '}
                {mode === 'reject' && <span className="required-asterisk">*</span>}
              </label>
              <TextArea
                id="status-change-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  mode === 'reject'
                    ? "Explain why this candidate is being rejected. This is saved in the candidate's status history."
                    : "Add a note for the candidate's status history."
                }
                rows={3}
                className="resize-y rounded-lg text-sm"
              />
            </div>
          )}
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={
              isSubmitting || candidates.length === 0 || (mode === 'reject' && !reason.trim())
            }
            className="w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSubmitting ? <Loader /> : MODE_CONFIRM[mode]}
          </Button>
        </div>
      )}
    </AntdCommonModal>
  );
};

export default ChangeCandidateStatusModal;
