import { useEffect, useState } from 'react';
import { Checkbox } from 'antd';
import { Button, showToast } from '../../../shared';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { Loader } from '../../../shared/ui/loader';
import {
  useListEligibleInterviewersQuery,
  useSetPanelInterviewersMutation,
} from '../../../../api/candidate-service/Candidates/interviewRounds';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';

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
// rule RoundArtifactsModal.tsx already documents for the same reason.
//
// The backend only refuses this on the resume stage, an already-finished
// round, or an already-booked one (409) — PipelineBoard.tsx gates the
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
};

const PanelInterviewersModal = ({
  open,
  onClose,
  candidateId,
  roundId,
  roundName,
  currentInterviewerIds,
}: PanelInterviewersModalProps) => {
  const {
    data: interviewers,
    isLoading,
    error,
  } = useListEligibleInterviewersQuery(candidateId, {
    skip: !open,
  });
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
            {interviewers.map((interviewer) => (
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
                  className="min-w-0 cursor-pointer"
                >
                  <div className="truncate text-sm font-medium text-gray-900">
                    {interviewer.display_name}
                  </div>
                  <div className="truncate text-xs text-gray-500">{interviewer.email}</div>
                </label>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving || isLoading}
          className="w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-50"
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
