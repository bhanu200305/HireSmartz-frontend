import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, showToast } from '../../../shared';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';
import { useListCandidateInterviewRoundsQuery } from '../../../../api/candidate-service/Candidates/interviewRounds';
import { bucketForStatus, resolveCurrentRound } from '../roundProgress';
import {
  useBulkCreateBookingsMutation,
  type CreateBookingRequest,
  type InterviewType,
} from '../../../../api/interview-service/client';
import type { CandidateView } from '../../../../api/candidate-service/Candidates/CandidateLifecycle';
import { candidateDisplayName } from '../candidateDisplay';

// interview-service's `POST /bookings/bulk` — one booking per selected
// candidate, for whichever interview round they're currently on. Mirrors
// CandidateDetails.tsx's single "Create booking" button (same round-name →
// interview_type inference, same `immediate: false`), just batched: each
// item is independent server-side, so a partial failure still books the
// rest. A candidate whose current round is already booked, already
// concluded, or not yet a real interview round is skipped with a reason
// rather than sent.

type BulkScheduleInterviewsModalProps = {
  open: boolean;
  onClose: () => void;
  candidates: CandidateView[];
  jobId: string | null;
  onScheduled?: () => void;
};

/** Same inference CandidateDetails.tsx uses for its per-round booking. */
const interviewTypeForRound = (roundName: string): InterviewType => {
  const name = roundName.toLowerCase();
  if (name.includes('panel')) return 'panel';
  if (name.includes('video')) return 'ai_video';
  return 'audio_screening';
};

type RowState =
  | { kind: 'loading' }
  | { kind: 'ready'; label: string; item: CreateBookingRequest }
  | { kind: 'blocked'; reason: string };

const CandidateRoundRow = ({
  candidate,
  jobId,
  onResolve,
}: {
  candidate: CandidateView;
  jobId: string;
  onResolve: (candidateId: string, state: RowState) => void;
}) => {
  const { data: rounds, isLoading, isError } = useListCandidateInterviewRoundsQuery(candidate.id);

  const state = useMemo<RowState>(() => {
    if (isLoading) return { kind: 'loading' };
    if (isError || !rounds) return { kind: 'blocked', reason: 'Could not load rounds' };

    const current = resolveCurrentRound(rounds);
    if (!current || current.stage_type !== 'interview' || !current.round_id)
      return { kind: 'blocked', reason: 'No interview round is due' };
    if (current.interview_booking_id)
      return { kind: 'blocked', reason: 'Round already has a booking' };
    if (bucketForStatus(current.status) !== 'pending')
      return { kind: 'blocked', reason: `Round is ${current.status.replace(/_/g, ' ')}` };

    return {
      kind: 'ready',
      label: `Round ${current.sequence} · ${current.round_name}`,
      item: {
        candidate_id: candidate.id,
        job_id: jobId,
        round_id: current.round_id,
        sequence_no: current.sequence,
        interview_type: interviewTypeForRound(current.round_name),
        interviewer_id: null,
        immediate: false,
        // Without this, interview-service has no way to report this
        // booking's status/score back to the right round — it silently
        // never updates, even once the call completes.
        candidate_interview_round_id: current.id,
      },
    };
  }, [rounds, isLoading, isError, candidate.id, jobId]);

  useEffect(() => {
    onResolve(candidate.id, state);
  }, [state, candidate.id, onResolve]);

  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="font-medium text-gray-900">{candidateDisplayName(candidate)}</span>
      {state.kind === 'loading' ? (
        <span className="shrink-0 text-gray-400">Checking…</span>
      ) : state.kind === 'ready' ? (
        <span className="shrink-0 text-right text-gray-600">{state.label}</span>
      ) : (
        <span className="shrink-0 text-right text-amber-600">{state.reason}</span>
      )}
    </div>
  );
};

const BulkScheduleInterviewsModal = ({
  open,
  onClose,
  candidates,
  jobId,
  onScheduled,
}: BulkScheduleInterviewsModalProps) => {
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [results, setResults] = useState<{ name: string; ok: boolean; reason: string | null }[]>(
    []
  );
  const [bulkCreate, { isLoading: isCreating }] = useBulkCreateBookingsMutation();

  useEffect(() => {
    if (open) {
      setRowStates({});
      setResults([]);
    }
  }, [open]);

  const handleResolve = useCallback((candidateId: string, state: RowState) => {
    setRowStates((prev) =>
      prev[candidateId] === state ? prev : { ...prev, [candidateId]: state }
    );
  }, []);

  const readyItems = useMemo(
    () =>
      candidates
        .map((c) => rowStates[c.id])
        .filter((s): s is Extract<RowState, { kind: 'ready' }> => s?.kind === 'ready')
        .map((s) => s.item),
    [candidates, rowStates]
  );

  const stillChecking = candidates.some(
    (c) => !rowStates[c.id] || rowStates[c.id].kind === 'loading'
  );

  const handleSchedule = async () => {
    if (!jobId || readyItems.length === 0) return;
    try {
      const res = await bulkCreate({ items: readyItems }).unwrap();
      setResults(
        res.results.map((r) => {
          const item = readyItems[r.index];
          const candidate = item && candidates.find((c) => c.id === item.candidate_id);
          return {
            name: candidate ? candidateDisplayName(candidate) : 'Candidate',
            ok: r.success,
            reason: r.error,
          };
        })
      );
      const okCount = res.results.filter((r) => r.success).length;
      showToast({
        message:
          okCount === res.results.length
            ? `Booking created for ${okCount} candidate${okCount === 1 ? '' : 's'}.`
            : `${okCount} of ${res.results.length} bookings created; see details below.`,
        type: okCount > 0 ? 'success' : 'warning',
      });
      if (okCount > 0) onScheduled?.();
    } catch (e) {
      showToast({
        message: getCandidateErrorMessage(e, 'Could not create bookings'),
        type: 'error',
      });
    }
  };

  const skippedCount = candidates.length - readyItems.length;

  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title="Schedule interviews"
      subtitle={`${candidates.length} candidate${candidates.length === 1 ? '' : 's'} selected`}
      modalProps={{ width: 560 }}
    >
      {results.length === 0 ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            One booking is created per candidate for the round they&apos;re currently on. The
            candidate then picks a time from the booking link.
          </p>

          {jobId && (
            <div className="flex max-h-[min(320px,50vh)] flex-col gap-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
              {candidates.map((candidate) => (
                <CandidateRoundRow
                  key={candidate.id}
                  candidate={candidate}
                  jobId={jobId}
                  onResolve={handleResolve}
                />
              ))}
            </div>
          )}

          <div className="text-xs text-gray-500">
            {stillChecking
              ? 'Checking each candidate’s current round…'
              : `${readyItems.length} ready to schedule${
                  skippedCount > 0 ? `, ${skippedCount} skipped` : ''
                }.`}
          </div>

          <Button
            type="button"
            onClick={() => void handleSchedule()}
            disabled={!jobId || isCreating || stillChecking || readyItems.length === 0}
            className="w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-50"
          >
            {isCreating
              ? 'SCHEDULING…'
              : `SCHEDULE ${readyItems.length} INTERVIEW${readyItems.length === 1 ? '' : 'S'}`}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex max-h-[min(320px,55vh)] flex-col gap-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
            {results.map((r, i) => (
              <div key={i} className="flex items-start justify-between gap-3 text-sm">
                <span className="font-medium text-gray-900">{r.name}</span>
                {r.ok ? (
                  <span className="shrink-0 text-green-600">Booked</span>
                ) : (
                  <span className="shrink-0 text-right text-red-500">
                    Failed{r.reason ? `: ${r.reason}` : ''}
                  </span>
                )}
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
      )}
    </AntdCommonModal>
  );
};

export default BulkScheduleInterviewsModal;
