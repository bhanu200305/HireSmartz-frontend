import { useState, useEffect } from 'react';
import { Button, showToast } from '../../shared';
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

const EditDetailedInterviewRounds = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRoundId, setSelectedRoundId] = useState<string | number | null>(null);
  const reduxJobOpeningId = useSelector((state: RootState) => state.EditJobSlice.jobOpeningId);
  const jobOpeningId = asJobId(reduxJobOpeningId) || asJobId(id);
  const location = useLocation();
  const [deleteInterviewRound, { isLoading: isDeleting }] = useDeleteInterviewRoundMutation();
  const [reorderInterviewRounds, { isLoading: isReordering }] = useReorderInterviewRoundsMutation();
  const { data, isLoading, refetch } = useGetInterviewRoundsByJobIdQuery(jobOpeningId, {
    skip: !jobOpeningId,
  });
  const isEditMode = location.pathname.includes('/edit/');
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
          isEditMode={isEditMode}
        />
      )}
      <div className="mt-6 flex justify-center">
        <Button
          className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2"
          onClick={() => {
            // dispatch(resetEditJobState())
            navigate(`/jobs/edit/${id}/editAiQuestions`);
          }}
        >
          SAVE & NEXT
        </Button>
      </div>
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
  );
};

export default EditDetailedInterviewRounds;
