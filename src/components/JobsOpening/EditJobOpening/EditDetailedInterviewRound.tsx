import { useMemo, useState, useEffect } from 'react';
import { Button, showToast } from '../../shared';
import { Tooltip } from 'antd';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/provider/store';
import { useGetInterviewRoundsByJobIdQuery } from '../../../api/job-service/JobOpening/GetInterviewRound';
import { useDeleteInterviewRoundMutation } from '../../../api/job-service/JobOpening/DeleteInterviewRounds';

import { Loader } from '../../shared/ui/loader';
import { useReorderInterviewRoundsMutation } from '../../../api/job-service/JobOpening/EditInterviewRound';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import { SortableInterviewRounds } from './sortableInterviewRounds';
import { asJobId } from '../../../api/job-service/jobId';
import { toInterviewSequencePayload } from '../../../api/job-service/interviewSequenceHelpers';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';
import { useIsEditingDraft } from '../../../hooks/useIsEditingDraft';
import useJobOpeningDropdown from '../../../hooks/useJobOpeningDropdown';
import {
  NO_QUESTION_ROUND_MESSAGE,
  hasQuestionRound,
  roundTypeIdsOfKind,
} from '../intakeRoundPlacement';
import { useDeleteDraftJobMutation } from '../../../api/job-service/JobOpening/AddJobOpening';

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
  const [deleteInterviewRound, { isLoading: isDeleting }] = useDeleteInterviewRoundMutation();
  const [deleteDraftJob, { isLoading: isCancelling }] = useDeleteDraftJobMutation();
  const [reorderInterviewRounds, { isLoading: isReordering }] = useReorderInterviewRoundsMutation();
  const { data, isLoading, refetch } = useGetInterviewRoundsByJobIdQuery(jobOpeningId, {
    skip: !jobOpeningId,
  });
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

  const handleRoundsReorder = async (reorderedRounds: any[]) => {
    if (!jobOpeningId) return;
    try {
      await reorderInterviewRounds({
        jobOpeningId,
        rounds: toInterviewSequencePayload(reorderedRounds),
      }).unwrap();
      showToast({
        message: 'Interview rounds reordered successfully!',
        type: 'success',
      });
      refetch();
    } catch (err) {
      showToast({
        message: getJobErrorMessage(
          err,
          'Something went wrong while reordering the interview rounds.'
        ),
        type: 'error',
      });
    }
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
    if (selectedRoundId === null || isDeleting || !jobOpeningId) return;

    const remaining = (data ?? []).filter((round) => String(round.id) !== String(selectedRoundId));
    deleteInterviewRound({
      jobOpeningId,
      rounds: toInterviewSequencePayload(remaining),
    })
      .unwrap()
      .then((res) => {
        showToast({
          message: res?.message || 'Interview round has been deleted successfully',
          type: 'success',
        });
        refetch();
      })
      .catch((err) => {
        showToast({
          message: getJobErrorMessage(
            err,
            'Something went wrong while deleting the interview round.'
          ),
          type: 'error',
        });
      })
      .finally(() => {
        setShowDeleteModal(false);
        setSelectedRoundId(null);
      });
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
    navigate('/jobs');
  };

  // Intentional "leave as draft" exit, same as every other step.
  const handleSaveDraft = () => {
    showToast({ message: 'Job saved as draft successfully', type: 'success' });
    navigate('/jobs');
  };

  return (
    <div className="relative">
      {(isLoading || isDeleting || isReordering) && <Loader />}

      {data && (
        <SortableInterviewRounds
          rounds={data}
          onRoundsReorder={handleRoundsReorder}
          onEdit={handleEdit}
          onDelete={(roundId) => {
            setSelectedRoundId(roundId);
            setShowDeleteModal(true);
          }}
          anchorRoundTypeIds={anchorRoundTypeIds}
          removableAnchorRoundTypeIds={intakeRoundTypeIds}
          variantLabelOverrides={variantLabelOverrides}
        />
      )}
      <div className="mt-6 flex justify-center gap-6">
        {isDraft && (
          <Tooltip title="Save progress and come back later.">
            <Button
              className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2"
              onClick={handleSaveDraft}
            >
              Save As Draft
            </Button>
          </Tooltip>
        )}
        {isDraft && (
          <Tooltip title="Delete this job opening and everything in it.">
            <Button
              className="text-white bg-gray-400 hover:bg-gray-500 rounded-3xl px-8 py-2 flex items-center space-x-2"
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel
            </Button>
          </Tooltip>
        )}
        <Tooltip title="Save this page and continue.">
          <Button
            className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2"
            onClick={() => {
              if (!hasQuestionRound(data ?? [], roundTypes)) {
                showToast({ message: NO_QUESTION_ROUND_MESSAGE, type: 'error' });
                return;
              }
              navigate(`/jobs/edit/${id}/editAiQuestions`);
            }}
          >
            Save & Next
          </Button>
        </Tooltip>
      </div>
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
          isLoading={isDeleting}
        />
      )}
      <Outlet />
    </div>
  );
};

export default EditDetailedInterviewRounds;
