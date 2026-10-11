import { useMemo, useState, useEffect, useRef } from 'react';
import { Button, showToast } from '../../shared';
import { Tooltip } from 'antd';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/provider/store';
import {
  useGetInterviewRoundsByJobIdQuery,
  useSaveInterviewSequenceMutation,
} from '../../../api/job-service/JobOpening/GetInterviewRound';

import { Loader } from '../../shared/ui/loader';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import { SortableInterviewRounds } from './sortableInterviewRounds';
import { asJobId } from '../../../api/job-service/jobId';
import { toInterviewRoundRequest } from '../../../api/job-service/interviewSequenceHelpers';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';
import { useIsEditingDraft } from '../../../hooks/useIsEditingDraft';
import { useNavigationBlocker } from '../../../hooks/useNavigationBlocker';
import useJobOpeningDropdown from '../../../hooks/useJobOpeningDropdown';
import {
  NO_QUESTION_ROUND_MESSAGE,
  hasQuestionRound,
  placeIntakeAfterResume,
  roundTypeIdsOfKind,
} from '../intakeRoundPlacement';
import { useDeleteDraftJobMutation } from '../../../api/job-service/JobOpening/AddJobOpening';
import {
  DraftInterviewRound,
  InterviewRoundsDraft,
  hasSameSettings,
  roundsSignature,
} from './interviewRoundsDraft';

import JobActionFooter from '../AddJobDescription/JobActionFooter';

const EditDetailedInterviewRounds = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRoundId, setSelectedRoundId] = useState<string | number | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const reduxJobOpeningId = useSelector((state: RootState) => state.EditJobSlice.jobOpeningId);
  const jobOpeningId = asJobId(reduxJobOpeningId) || asJobId(id);
  const isDraft = useIsEditingDraft(jobOpeningId) === true;
  const location = useLocation();
  const [deleteDraftJob, { isLoading: isCancelling }] = useDeleteDraftJobMutation();
  const [saveInterviewSequence, { isLoading: isSaving }] = useSaveInterviewSequenceMutation();
  const { data, isLoading, refetch } = useGetInterviewRoundsByJobIdQuery(jobOpeningId, {
    skip: !jobOpeningId,
  });
  // Saved snapshot is the query data; null draft means "no local edits".
  const [draftRounds, setDraftRounds] = useState<DraftInterviewRound[] | null>(null);
  const rounds: DraftInterviewRound[] = draftRounds ?? data ?? [];
  const isDirty = roundsSignature(rounds) !== roundsSignature(data ?? []);
  const tempIdRef = useRef(0);
  const allowLeaveRef = useRef(false);
  const interviewBasePath = `/jobs/edit/${id}/interview`;
  const { isBlocked, confirmNavigation, cancelNavigation } = useNavigationBlocker(
    true,
    isDirty,
    (pathname) => allowLeaveRef.current || pathname.startsWith(interviewBasePath)
  );
  // Round-type ids for the anchor rounds (Resume, and the optional Intake
  // Call) — same pinning rule InterviewSetup (create flow) applies.
  const { jobOpeningDropdown: roundTypes } = useJobOpeningDropdown('ROUNDS', 'view');
  const anchorRoundTypeIds = useMemo(
    () =>
      new Set(
        roundTypes
          .filter(
            (round) => round.special_kind === 'resume' || round.special_kind === 'intake_call'
          )
          .map((round) => String(round.id))
      ),
    [roundTypes]
  );
  const intakeRoundTypeIds = useMemo(
    () => roundTypeIdsOfKind(roundTypes, 'intake_call'),
    [roundTypes]
  );
  const variantLabelOverrides = useMemo(
    () => Object.assign({}, ...roundTypes.map((round) => round.variant_labels ?? {})),
    [roundTypes]
  );
  useEffect(() => {
    if (location.state?.refresh && jobOpeningId) {
      refetch();
    }
  }, [location, jobOpeningId, refetch]);

  const resumeTypeIds = useMemo(() => roundTypeIdsOfKind(roundTypes, 'resume'), [roundTypes]);

  const handleRoundsReorder = (reorderedRounds: any[]) => {
    setDraftRounds(reorderedRounds as DraftInterviewRound[]);
  };

  const draftContext: InterviewRoundsDraft = {
    rounds,
    addRound: (round, options) => {
      // Re-adding a removed saved round restores it, so an undo matches the snapshot.
      const restored = (data ?? []).find(
        (saved) =>
          !rounds.some((r) => !r.isNew && String(r.id) === String(saved.id)) &&
          hasSameSettings(saved, round)
      );
      tempIdRef.current += 1;
      const added: DraftInterviewRound = restored ?? {
        ...round,
        id: `new-${tempIdRef.current}`,
        jobId: jobOpeningId,
        sequence: rounds.length + 1,
        uniqueRoundIdentifier: '',
        isNew: true,
      };
      const next = options?.afterResume
        ? placeIntakeAfterResume(rounds, added, (r) => resumeTypeIds.has(String(r.round?.id)))
        : [...rounds, added];
      setDraftRounds(next.map((r, index) => ({ ...r, sequence: index + 1 })));
    },
    updateRound: (roundId, patch) => {
      setDraftRounds(
        rounds.map((r) => (String(r.id) === String(roundId) ? { ...r, ...patch } : r))
      );
    },
  };

  const saveRounds = async () => {
    if (!jobOpeningId) return false;
    if (rounds.length === 0) {
      showToast({ message: 'Add at least one interview round.', type: 'error' });
      return false;
    }
    try {
      await saveInterviewSequence({
        jobOpeningId,
        rounds: rounds.map((round, index) =>
          toInterviewRoundRequest({ ...round, sequence: index + 1 }, { isNew: round.isNew })
        ),
      }).unwrap();
      // Snapshot now follows the refetched server data.
      setDraftRounds(null);
      return true;
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, 'Something went wrong while saving the interview rounds.'),
        type: 'error',
      });
      return false;
    }
  };

  const handleNext = async () => {
    if (isSaving) return;
    if (!hasQuestionRound(rounds, roundTypes)) {
      showToast({ message: NO_QUESTION_ROUND_MESSAGE, type: 'error' });
      return;
    }
    if (isDirty) {
      if (!(await saveRounds())) return;
      showToast({ message: 'Interview rounds saved successfully', type: 'success' });
    }
    allowLeaveRef.current = true;
    navigate(`/jobs/edit/${id}/editAiQuestions`);
  };

  const handleEdit = (round: any) => {
    navigate(`edit-interview-round/${round.id}`, {
      state: {
        roundId: round.id,
        round: round.round?.id,
        roundName: round.round?.name,
        roundType: round.roundType,
        sequence: round.sequence,
        description: round.description,
        // So the form opens with the saved duration / format (e.g. 30 min,
        // Soundwave) instead of blank.
        duration: round.duration,
        variant: round.variant,
      },
    });
  };

  const confirmDelete = () => {
    if (selectedRoundId === null) return;
    setDraftRounds(
      rounds
        .filter((round) => String(round.id) !== String(selectedRoundId))
        .map((round, index) => ({ ...round, sequence: index + 1 }))
    );
    setShowDeleteModal(false);
    setSelectedRoundId(null);
  };

  const handleConfirmCancel = async () => {
    if (jobOpeningId) {
      try {
        await deleteDraftJob(jobOpeningId).unwrap();
      } catch (error) {
        showToast({
          message: getJobErrorMessage(error, 'Failed to remove job opening'),
          type: 'error',
        });
        setShowCancelConfirm(false);
        return;
      }
    }
    setShowCancelConfirm(false);
    allowLeaveRef.current = true;
    navigate('/jobs');
  };

  // Intentional "leave as draft" exit, same as every other step.
  const handleSaveDraft = async () => {
    if (isSaving) return;
    if (isDirty && !(await saveRounds())) return;
    showToast({ message: 'Job saved as draft successfully', type: 'success' });
    allowLeaveRef.current = true;
    navigate('/jobs');
  };

  const nextLabel = isDirty ? 'Save & Next' : 'Next';

  return (
    <div className="relative">
      {(isLoading || isSaving) && <Loader />}

      {data && (
        <SortableInterviewRounds
          rounds={rounds}
          onRoundsReorder={handleRoundsReorder}
          onEdit={handleEdit}
          onDelete={(roundId) => {
            setSelectedRoundId(roundId);
            setShowDeleteModal(true);
          }}
          anchorRoundTypeIds={anchorRoundTypeIds}
          removableAnchorRoundTypeIds={intakeRoundTypeIds}
          variantLabelOverrides={variantLabelOverrides}
          roundTypes={roundTypes}
        />
      )}
      <JobActionFooter>
        {isDraft && (
          <Tooltip title="Delete this job opening and everything in it.">
            <Button
              className="border border-neutral-300 bg-white text-neutral-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50/50 rounded-full px-5 py-2 text-sm font-medium transition-colors flex items-center justify-center"
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel
            </Button>
          </Tooltip>
        )}
        {isDraft && (
          <Tooltip title="Save progress and come back later.">
            <Button
              className="bg-primary hover:bg-brand-700 text-white rounded-full px-5 py-2 text-sm font-semibold shadow-sm transition-colors flex items-center justify-center"
              onClick={handleSaveDraft}
              disabled={isSaving}
            >
              Save As Draft
            </Button>
          </Tooltip>
        )}
        <Tooltip title={isDirty ? 'Save this page and continue.' : 'Continue to the next step.'}>
          <Button
            className="bg-primary hover:bg-primary-hover text-white rounded-full px-5 py-2 text-sm font-semibold shadow-xs hover:shadow transition-all flex items-center justify-center"
            onClick={handleNext}
            disabled={isSaving}
            aria-busy={isSaving}
          >
            <span aria-live="polite" aria-atomic="true">
              {isSaving ? 'Saving…' : nextLabel}
            </span>
          </Button>
        </Tooltip>
      </JobActionFooter>
      {showCancelConfirm && (
        <ConfirmationModal
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={handleConfirmCancel}
          title="Cancel this job opening? Everything added so far will be permanently deleted."
          confirmText="Cancel Job"
          isLoading={isCancelling}
        />
      )}
      {showDeleteModal && (
        <ConfirmationModal
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedRoundId(null);
          }}
          title="Are you sure you want to delete?"
          onConfirm={confirmDelete}
          confirmText="Delete"
        />
      )}
      {isBlocked && (
        <ConfirmationModal
          onClose={cancelNavigation}
          onConfirm={confirmNavigation}
          title="You have unsaved changes. Are you sure you want to leave?"
          confirmText="Leave Page"
        />
      )}
      <Outlet context={draftContext} />
    </div>
  );
};

export default EditDetailedInterviewRounds;
