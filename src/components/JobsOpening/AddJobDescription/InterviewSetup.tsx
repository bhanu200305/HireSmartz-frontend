import JobDetailsLayout from '../../../layouts/JobDetailsLayout';
import { Button, showToast } from '../../shared';
import { HiOutlinePlus } from 'react-icons/hi';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '../../../layouts/MainLayout';
import { useEffect, useState } from 'react';
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

const InterviewSetup = () => {
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRoundId, setSelectedRoundId] = useState<string | number | null>(null);
  const rawJobOpeningId = useSelector((state: RootState) => state.JobSlice.jobOpeningId);
  const jobOpeningId = asJobId(rawJobOpeningId);
  const location = useLocation();
  const [deleteInterviewRound, { isLoading: isDeleting }] = useDeleteInterviewRoundMutation();
  const { data, isLoading, refetch } = useGetInterviewRoundsByJobIdQuery(jobOpeningId, {
    skip: !jobOpeningId,
  });
  const [reorderInterviewRounds, { isLoading: isReordering }] = useReorderInterviewRoundsMutation();
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
                <HiOutlinePlus className="text-lg" /> <span>ADD NEW ROUND</span>
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
              />
            )}
            <div className="mt-6 flex justify-center">
              <Button
                className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2"
                onClick={() => {
                  navigate('/ai-questions', {
                    state: {
                      refresh: true,
                    },
                  });
                }}
              >
                SAVE & NEXT
              </Button>
            </div>
          </JobDetailsLayout>
        </MainLayout>
        {showDeleteModal && (
          <ConfirmationModal
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedRoundId(null);
            }}
            title="Are you sure you want to delete?"
            onConfirm={confirmDelete}
            confirmText="DELETE"
            isLoading={isDeleting}
          />
        )}
        <Outlet />
      </div>
    </>
  );
};

export default InterviewSetup;
