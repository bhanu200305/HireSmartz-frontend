import JobDetailsLayout from '../../../layouts/JobDetailsLayout';
import { Button, showToast } from '../../shared';
import { HiOutlinePlus } from 'react-icons/hi';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '../../../layouts/MainLayout';
import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../redux/provider/store';
import { useGetInterviewRoundsByJobIdQuery } from '../../../api/job-service/JobOpening/GetInterviewRound';
import { useDeleteInterviewRoundMutation } from '../../../api/job-service/JobOpening/DeleteInterviewRounds';
import { get } from 'lodash-es';
import { Loader } from '../../shared/ui/loader';

import { useReorderInterviewRoundsMutation } from '../../../api/job-service/JobOpening/EditInterviewRound';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import { SortableInterviewRounds } from '../EditJobOpening/sortableInterviewRounds';

const InterviewSetup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const jobOpeningId = useSelector((state: RootState) => state.JobSlice.jobOpeningId);
  const location = useLocation();
  const [deleteInterviewRound, { isLoading: isDeleting }] = useDeleteInterviewRoundMutation();
  const { data, isLoading, refetch } = useGetInterviewRoundsByJobIdQuery(jobOpeningId);
  const [reorderInterviewRounds, { isLoading: isReordering }] = useReorderInterviewRoundsMutation();
  useEffect(() => {
    if (location.state?.refresh && jobOpeningId) {
      refetch();
    }
  }, [location, jobOpeningId]);
  const handleEdit = (round: any) => {
    navigate(`edit-interview-round/${round.id}`, {
      state: {
        roundId: round.id,
        round: round.round?.id,
        roundName: round.round?.name,
        roundType: round.roundType,
        sequence: round.sequence,
        description: round.description,
      },
    });
  };

  const handleRoundsReorder = async (reorderedRounds: any) => {
    try {
      const payload = reorderedRounds.map((round: any) => ({
        id: round.id,
        jobId: jobOpeningId,
        round: round.round?.id || null,
        roundType: round.roundType || 'MANUAL',
        sequence: round.sequence,
        description: round.description || '',
      }));

      const result = await reorderInterviewRounds(payload).unwrap();

      if (result?.status === 'OK') {
        showToast({
          message: get(result, 'message', 'Interview rounds reordered successfully!'),
          type: 'success',
        });
        refetch();
      } else {
        showToast({
          message: get(result, 'message', 'Failed to reorder interview rounds.'),
          type: 'error',
        });
      }
    } catch (err) {
      console.error('Error reordering rounds:', err);
      showToast({
        message: get(
          err,
          'data.message',
          'Something went wrong while reordering the interview rounds.'
        ),
        type: 'error',
      });
    }
  };
  const confirmDelete = () => {
    if (selectedRoundId === null || isDeleting) return;

    deleteInterviewRound(selectedRoundId)
      .unwrap()
      .then((res) => {
        if (res?.status === 'OK') {
          showToast({
            message: get(res, 'message', 'Interview round has been deleted successfully'),
            type: 'success',
          });
          refetch();
        } else {
          showToast({
            message: get(res, 'message', 'Failed to delete interview round.'),
            type: 'error',
          });
        }
      })
      .catch((err) => {
        showToast({
          message: get(
            err,
            'data.message',
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
                onClick={() => navigate('add-new-round')}
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
