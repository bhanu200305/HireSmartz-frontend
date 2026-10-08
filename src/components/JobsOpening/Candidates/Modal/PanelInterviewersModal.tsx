import { useEffect, useState } from 'react';
import { Checkbox } from 'antd';
import { Badge, Button, showToast } from '../../../shared';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { Loader } from '../../../shared/ui/loader';
import {
  useListEligibleInterviewersQuery,
  useSetPanelInterviewersMutation,
} from '../../../../api/candidate-service/Candidates/interviewRounds';
import { useGetInterviewersCalendarStatusQuery } from '../../../../api/interview-service/client';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';

// Why a person is in the list — `roles` carries one or both of these raw
// values (added 2026-09-15 once org-service's directory started unioning
// the job's hiring managers into what used to be interviewer-role-only).
const ROLE_LABELS: Record<string, string> = {
  interviewer: 'Interviewer',
  hiring_manager: 'Hiring Manager',
};
const roleLabel = (role: string): string =>
  ROLE_LABELS[role] ?? role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// New — `GET /candidates/{id}/eligible-interviewers` +
// `PUT /candidates/{id}/interview-rounds/{round_id}/interviewers`
// (candidate-service commit 3ab83cb7, 2026-09-04 — added after this
// integration was first wired, so nothing here existed to reuse). A
// recruiter's explicit PANEL round interviewer picker: leaving nothing
// checked and saving is a valid, meaningful choice — it clears any prior
// selection and falls back to interview-service's own auto-composed panel,
// same as never having set anything (set_panel_interviewers.py's own
// docstring). `{round_id}` in the URL is this LOCAL round row's own `id`
// (`CandidateInterviewRoundView.id`), never job-service's `round_id` — same
// rule RoundArtifactsPanel.tsx already documents for the same reason.
//
// The backend only refuses this on the resume stage, an already-finished
// round, or an already-booked one (409) — roundPipeline.ts's canManageRoundInterviewers gates the
// trigger the same way, but the 409 is still the real guard if state
// changed between render and click.

type PanelInterviewersModalProps = {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  /** Must be the LOCAL round row's `id`, not job-service's `round_id`. */
  roundId: string;
  roundName: string;
  /** The round's current `interviewer_ids` — pre-checks the picker. */
  currentInterviewerIds: string[];
  /** The job, for each interviewer's calendar status (green/red tag). */
  jobId?: string;
};

const PanelInterviewersModal = ({
  open,
  onClose,
  candidateId,
  roundId,
  roundName,
  currentInterviewerIds,
  jobId,
}: PanelInterviewersModalProps) => {
  const {
    data: interviewers,
    isLoading,
    error,
  } = useListEligibleInterviewersQuery(candidateId, {
    skip: !open,
  });
  // Same green/red calendar status the Send Invite picker colors its chips
  // by (whole eligible pool for the job), polled while open so a calendar
  // connected elsewhere flips to green without a refresh.
  const { data: calendarStatuses } = useGetInterviewersCalendarStatusQuery(
    { jobId: jobId ?? '' },
    {
      skip: !open || !jobId,
      pollingInterval: open ? 15_000 : 0,
      skipPollingIfUnfocused: true,
      refetchOnFocus: true,
    }
  );
  const calendarConnectedById = new Map(
    (calendarStatuses ?? []).map((s) => [String(s.interviewer_id), s.calendar_connected])
  );
  const [setPanelInterviewers, { isLoading: isSaving }] = useSetPanelInterviewersMutation();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) setSelected(new Set(currentInterviewerIds));
    // Only re-seed when the modal actually opens — not on every parent
    // re-render, so a candidate mid-edit doesn't get their in-progress
    // checkbox state silently reset out from under them.
  }, [open]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    try {
      const result = await setPanelInterviewers({
        candidateId,
        roundId,
        interviewerIds: Array.from(selected),
      }).unwrap();
      showToast({
        message:
          result.interviewer_ids.length > 0
            ? `${result.interviewer_ids.length} interviewer${result.interviewer_ids.length === 1 ? '' : 's'} set for this round.`
            : 'Selection cleared; interview-service will auto-compose the panel.',
        type: 'success',
      });
      onClose();
    } catch (e) {
      showToast({
        message: getCandidateErrorMessage(e, 'Could not save the interviewer selection'),
        type: 'error',
      });
    }
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title="Panel Interviewers"
      subtitle={roundName}
      modalProps={{ width: 480 }}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">
          Pick who sits on this round&apos;s panel. Leave everyone unchecked to let
          interview-service auto-compose the panel instead.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader />
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">
            {getCandidateErrorMessage(error, 'Failed to load eligible interviewers.')}
          </p>
        ) : !interviewers || interviewers.length === 0 ? (
          <p className="text-sm text-gray-500">No eligible interviewers found for this tenant.</p>
        ) : (
          <div className="flex max-h-[min(360px,55vh)] flex-col gap-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
            {interviewers.map((interviewer) => {
              const connected = calendarConnectedById.get(String(interviewer.id));
              return (
                <div
                  key={interviewer.id}
                  className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-gray-50"
                >
                  <Checkbox
                    id={`panel-interviewer-${interviewer.id}`}
                    checked={selected.has(interviewer.id)}
                    onChange={() => toggle(interviewer.id)}
                  />
                  <label
                    htmlFor={`panel-interviewer-${interviewer.id}`}
                    className="min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-gray-900">
                        {interviewer.display_name}
                      </span>
                      {interviewer.roles.map((role) => (
                        <Badge key={role} status="neutral" className="shrink-0">
                          {roleLabel(role)}
                        </Badge>
                      ))}
                      {/* Same colors as the Send Invite picker's chips. */}
                      {connected !== undefined && (
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                            connected
                              ? 'border-green-200 bg-green-50 text-green-700'
                              : 'border-red-200 bg-red-50 text-red-700'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
                            aria-hidden
                          />
                          {connected ? 'Calendar connected' : 'Calendar not connected'}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-gray-500">{interviewer.email}</div>
                  </label>
                </div>
              );
            })}
          </div>
        )}

        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving || isLoading}
          className="w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold text-white disabled:opacity-50"
        >
          {isSaving ? (
            <Loader />
          ) : selected.size > 0 ? (
            `SAVE (${selected.size})`
          ) : (
            'SAVE (CLEAR SELECTION)'
          )}
        </Button>
      </div>
    </AntdCommonModal>
  );
};

export default PanelInterviewersModal;
