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
        <div className="bg-white p-0 rounded-2xl shadow-xl w-[420px] max-w-[92vw] relative overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
            <h2 className="text-base font-bold text-neutral-900 font-display">
              Create New Job Description
            </h2>
            <button
              className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              onClick={handleClose}
            >
              <MdClose size={20} />
            </button>
          </div>
          <div className="px-6 pt-5 pb-6">
            <p className="text-center text-sm text-neutral-600 mb-6">
              Do you want to create a new Job Description?
            </p>

            <div className="flex justify-between gap-3">
              <button
                onClick={() => handleSubmit(false)}
                className="bg-white border border-neutral-200 text-neutral-700 w-full py-2 rounded-3xl transition hover:bg-neutral-50 cursor-pointer"
              >
                No
              </button>
              <button
                onClick={() => handleSubmit(true)}
                className="bg-primary text-white w-full py-2 rounded-3xl transition cursor-pointer"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConfirmNewJDModal;
