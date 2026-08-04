import { useNavigate, useParams } from 'react-router-dom';
import { MdClose } from 'react-icons/md';
import { useUpdateJobOpeningMutation } from '../../../api/job-service/JobOpening/UpdateJobOpening';
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
  const handleSubmit = async (generateAiJd: boolean) => {
    const jobOpeningId = Number(id);
    const selectedLocationId = Number(details.officeLocation?.[0]);
    const locationId = Number.isFinite(selectedLocationId) ? selectedLocationId : undefined;

    const processedPayload = {
      jobProfileCode: details.jobProfileCode || '',
      jobTitle: details.jobTitle || [],
      department: details.department || [],
      locationId,
      jobType: details.jobType || [],
      isMultilingual: details.isMultilingual || false,
      useCultureIntro: Boolean(details.useCultureIntro),
      shift:
        details.shiftStart && details.shiftEnd
          ? `${details.shiftStart} - ${details.shiftEnd}`
          : null,
      openings: details.openings ?? null,
      minSalary: details.minSalary ? Number(details.minSalary) : null,
      maxSalary: details.maxSalary ? Number(details.maxSalary) : null,
      minExperience: details.minExperience ?? null,
      maxExperience: details.maxExperience ?? null,
      openDate: details.openDate || '',
      hiringManagers: details.hiringManagers || [],
      recruiters: details.recruiters || [],
      mandatorySkills: description.mandatorySkills || [],
      optionalSkills: description.optionalSkills || [],
      educationPreference: description.educationPreference || [],
      communicationSkills: '',
      otherRequirements: description.otherRequirements || '',
      responsibilities: description.responsibilities || '',
      exemptionStatus: details.exemptionStatus ?? null,
      referralBonus:
        details.referralBonus === null ||
        details.referralBonus === undefined ||
        details.referralBonus === ''
          ? ''
          : details.referralBonus,
      generateAiJd,
      isDraft: false,
    };
    updateJobOpening({
      body: processedPayload as any,
      jobOpeningId,
    })
      .unwrap()
      .then((res) => {
        if (res?.success) {
          showToast({
            message: get(res, 'message', 'Job opening has been updated successfully'),
            type: 'success',
          });
          dispatch(setEditJobOpeningId(res.data.jobOpeningId));
          dispatch(
            updateEditAiJobDescription({
              id: res.data.aiJobDescriptionId,
              jobOpeningId: res.data.jobOpeningId || 0,
            })
          );
          dispatch(setIsChanged(false));
          navigate(`/jobs/edit/${id}/AiJobDescription/${res.data.aiJobDescriptionId}`);
        } else {
          showToast({
            message: get(res, 'message', 'Failed to update job opening. Please try again.'),
            type: 'error',
          });
        }
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
