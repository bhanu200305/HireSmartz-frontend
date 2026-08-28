import { useNavigate, useParams } from 'react-router-dom';
import { MdClose } from 'react-icons/md';
import { useUpdateJobOpeningMutation } from '../../../api/job-service/JobOpening/UpdateJobOpening';
import { buildSaveJobDetailsPayload } from '../../../api/job-service/buildSaveJobDetailsPayload';
import { asJobId } from '../../../api/job-service/jobId';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';
import { RootState } from '../../../redux/provider/store';

import { showToast } from '../../shared';
import { get } from 'lodash-es';

import {
  setEditJobOpeningId,
  updateEditAiJobDescription,
  setIsChanged,
} from '../../../redux/slices/editJobOpeningSlice';
import { Loader } from '../../shared/ui/loader';

const ConfirmNewJDModal = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams<{ id: string }>();

  const [updateJobOpening, { isLoading }] = useUpdateJobOpeningMutation();

  const { details, description } = useSelector(
    (state: RootState) => ({
      details: state.EditJobSlice.details,
      description: state.EditJobSlice.description,
    }),
    shallowEqual
  );
  const handleSubmit = async (_generateAiJd: boolean) => {
    const jobOpeningId = asJobId(id);
    const body = buildSaveJobDetailsPayload({
      data: {
        ...details,
        ...description,
        useCultureIntro: Boolean(details.useCultureIntro),
      },
    });
    updateJobOpening({
      body,
      jobOpeningId,
    })
      .unwrap()
      .then((res) => {
        const savedId = res.org_job_opening_id || jobOpeningId;
        showToast({
          message: 'Job opening has been updated successfully',
          type: 'success',
        });
        dispatch(setEditJobOpeningId(savedId));
        dispatch(
          updateEditAiJobDescription({
            id: savedId,
            jobOpeningId: savedId,
          })
        );
        dispatch(setIsChanged(false));
        navigate(`/jobs/edit/${id}/AiJobDescription/${savedId}`);
      })
      .catch((err) => {
        showToast({
          message: get(err, 'data.message', 'Something went wrong while updating job opening.'),
          type: 'error',
        });
      });
  };
  const handleClose = () => {
    navigate(-1);
  };

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
        {isLoading && <Loader />}
        <div className="bg-[#FAFAFA] p-6 rounded-lg shadow-lg w-[500px] relative">
          <h2 className="text-lg font-semibold text-center mb-6">Create New Job Description</h2>
          <p className="text-center text-base mb-6">Do you want to create a new Job Description?</p>

          <div className="flex justify-between gap-4">
            <button
              onClick={() => handleSubmit(false)}
              className="bg-white border border-[var(--border)] text-primary w-full py-2 rounded-3xl transition cursor-pointer"
            >
              NO
            </button>
            <button
              onClick={() => handleSubmit(true)}
              className="bg-primary text-white w-full py-2 rounded-3xl transition cursor-pointer"
            >
              YES
            </button>
          </div>

          <button
            className="absolute top-4 right-4 text-primary cursor-pointer"
            onClick={handleClose}
          >
            <MdClose size={20} />
          </button>
        </div>
      </div>
    </>
  );
};

export default ConfirmNewJDModal;
