import JobDetailsLayout from '../../../layouts/JobDetailsLayout';
import { Button, showToast } from '../../shared';
import { Tooltip } from 'antd';
import { HiOutlinePlus } from 'react-icons/hi';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '../../../layouts/MainLayout';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/provider/store';
import { useGetInterviewRoundsByJobIdQuery } from '../../../api/job-service/JobOpening/GetInterviewRound';
import { useDeleteInterviewRoundMutation } from '../../../api/job-service/JobOpening/DeleteInterviewRounds';
import { Loader } from '../../shared/ui/loader';

import { useReorderInterviewRoundsMutation } from '../../../api/job-service/JobOpening/EditInterviewRound';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import { SortableInterviewRounds } from '../EditJobOpening/sortableInterviewRounds';
import { asJobId } from '../../../api/job-service/jobId';
import { toInterviewSequencePayload } from '../../../api/job-service/interviewSequenceHelpers';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';
import useJobOpeningDropdown from '../../../hooks/useJobOpeningDropdown';
import {
  NO_QUESTION_ROUND_MESSAGE,
  hasQuestionRound,
  roundTypeIdsOfKind,
} from '../intakeRoundPlacement';
import { useDeleteDraftJobMutation } from '../../../api/job-service/JobOpening/AddJobOpening';

const InterviewSetup = () => {
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [deleteDraftJob, { isLoading: isCancelling }] = useDeleteDraftJobMutation();
  const [selectedRoundId, setSelectedRoundId] = useState<string | number | null>(null);
  const rawJobOpeningId = useSelector((state: RootState) => state.JobSlice.jobOpeningId);
  const jobOpeningId = asJobId(rawJobOpeningId);
  const location = useLocation();
  const [deleteInterviewRound, { isLoading: isDeleting }] = useDeleteInterviewRoundMutation();
  const { data, isLoading, refetch } = useGetInterviewRoundsByJobIdQuery(jobOpeningId, {
    skip: !jobOpeningId,
  });
  const [reorderInterviewRounds, { isLoading: isReordering }] = useReorderInterviewRoundsMutation();
  // Round-type ids for the anchor rounds (Resume, and the optional Intake
  // Call) — SortableInterviewRounds keeps them leading the sequence.
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
  const handleEdit = (round: any) => {
    navigate(`edit-interview-round/${round.id}`, {
      state: {
        roundId: round.id,
        round: round.roundId || round.round?.id,
        roundName: round.roundName || round.round?.name,
        roundType: round.roundType,
        sequence: round.sequence,
        description: round.description,
        duration: round.duration,
        variant: round.variant,
      },
    });
  };

  const handleRoundsReorder = async (reorderedRounds: any[]) => {
    if (!jobOpeningId) {
      showToast({
        message: 'Please save the job details first before reordering interview rounds.',
        type: 'error',
      });
      return;
    }
    try {
      const result = await reorderInterviewRounds({
        jobOpeningId,
        rounds: toInterviewSequencePayload(reorderedRounds),
      }).unwrap();

      showToast({
        message: result.message || 'Interview rounds reordered successfully!',
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
  const confirmDelete = () => {
    if (selectedRoundId === null || isDeleting) return;
    if (!jobOpeningId) {
      showToast({
        message: 'Please save the job details first before deleting an interview round.',
        type: 'error',
      });
      return;
    }

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
    <>
      <div className="relative">
        <MainLayout>
          {(isLoading || isDeleting || isReordering) && <Loader />}
          <JobDetailsLayout
            button={
              <Button
                className="text-white bg-button rounded-3xl px-4 py-2 flex items-center space-x-2 cursor-pointer"
                onClick={() => {
                  if (!jobOpeningId) {
                    showToast({
                      message:
                        'Please save the job details first before adding an interview round.',
                      type: 'error',
                    });
                    return;
                  }
                  navigate('add-new-round');
                }}
              >
                <HiOutlinePlus className="text-lg" /> <span>Add New Round</span>
              </Button>
            }
          >
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
              <Tooltip title="Save progress and come back later.">
                <Button
                  className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2"
                  onClick={handleSaveDraft}
                >
                  Save As Draft
                </Button>
              </Tooltip>
              <Tooltip title="Delete this job opening and everything in it.">
                <Button
                  className="text-white bg-gray-400 hover:bg-gray-500 rounded-3xl px-8 py-2 flex items-center space-x-2"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  Cancel
                </Button>
              </Tooltip>
              <Tooltip title="Save this page and continue.">
                <Button
                  className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2"
                  onClick={() => {
                    if (!hasQuestionRound(data ?? [], roundTypes)) {
                      showToast({ message: NO_QUESTION_ROUND_MESSAGE, type: 'error' });
                      return;
                    }
                    navigate('/ai-questions', {
                      state: {
                        refresh: true,
                      },
                    });
                  }}
                >
                  Save & Next
                </Button>
              </Tooltip>
            </div>
          </JobDetailsLayout>
        </MainLayout>
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
    </>
  );
};

export default InterviewSetup;
