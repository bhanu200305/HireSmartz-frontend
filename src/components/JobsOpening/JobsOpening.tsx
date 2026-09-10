import MainLayout from '../../layouts/MainLayout';
import JobDetailsLayout from '../../layouts/JobDetailsLayout';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Button, showToast } from '../shared';
import { HiOutlinePlus } from 'react-icons/hi';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/provider/store';
import { useGetJobOpeningByIdQuery } from '../../api/job-service/JobOpening/GetJobOpeningById';
import { isAssignedToJob } from '../../shared/utils/auth/getAccess';
import {
  setEditJobOpeningId,
  updateEditAiJobDescription,
  updateEditInterviewRounds,
  updateEditJobDescription,
  updateEditJobDetails,
  setAtsJobOpeningId,
  setIsDraft,
  resetEditJobState,
} from '../../redux/slices/editJobOpeningSlice';
import { asJobId } from '../../api/job-service/jobId';
import {
  mapDetailsToJobDetailsState,
  mapInterviewRoundsToState,
} from '../../api/job-service/mapJobOpeningToLegacyView';

const getButtonConfig = (
  pathname: string,
  _id: string | undefined,
  handleAddNewRound: () => void,
  _handleAddNewQuestion: () => void
) => {
  if (/\/edit\/.*\/interview/.test(pathname)) {
    return {
      onClick: handleAddNewRound,
      label: 'Add New Round',
    };
  }
  return null;
};

interface JobsOpeningProps {
  refetchCandidates?: () => void;
}

const JobsOpening = ({ refetchCandidates }: JobsOpeningProps) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { id } = useParams();

  const handleAddNewRound = () => {
    if (/\/edit\/.*\/interview/.test(pathname) && id) {
      navigate(`/jobs/edit/${id}/interview/addNewRound`);
    } else {
      navigate('add-new-round');
    }
  };

  const handleAddNewQuestion = () => {
    if (pathname.includes('editAiQuestions')) {
      navigate(`/jobs/edit/${id}/editAiQuestions/addNewQuestion`);
    } else if (pathname.includes('editVideoQuestions')) {
      navigate(`/jobs/edit/${id}/editVideoQuestions/addNewQuestion`);
    } else if (pathname === '/ai-questions') {
      navigate('/ai-questions?addQuestion=true');
    } else if (pathname === '/video-questions') {
      navigate('/video-questions?addQuestion=true');
    }
  };

  // const handleAddNewCV = () => {
  //   navigate(`/jobs/view/${id}/candidates/upload-cv`)
  // }

  const buttonConfig = getButtonConfig(pathname, id, handleAddNewRound, handleAddNewQuestion);
  const parsedJobId = asJobId(id);
  const isEditMode = pathname.includes('/edit/');
  const dispatch = useDispatch();
  const jobOpeningId = useSelector((state: RootState) => state.EditJobSlice.jobOpeningId);

  const { data: jobData } = useGetJobOpeningByIdQuery(
    { jobOpeningId: parsedJobId },
    { skip: !isEditMode || !parsedJobId, refetchOnMountOrArgChange: true }
  );

  const { role, userId } = useSelector((state: RootState) => (state as any).LoginSlice);

  // Guards every edit tab in one place.
  useEffect(() => {
    if (!isEditMode || !jobData) return;
    const assigned = isAssignedToJob(
      {
        hiringManagerIds: jobData.details.hiring_manager_ids,
        recruiterIds: jobData.details.recruiter_ids,
        createdById: jobData.details.created_by,
      },
      userId,
      role
    );
    if (!assigned) {
      showToast({ message: 'You are not assigned to this job.', type: 'error' });
      navigate('/jobs', { replace: true });
    }
  }, [isEditMode, jobData, userId, role, navigate]);

  useEffect(() => {
    if (isEditMode && jobData && (!jobOpeningId || parsedJobId !== jobOpeningId)) {
      const details = jobData.details;
      dispatch(setEditJobOpeningId(jobData.org_job_opening_id));
      dispatch(setAtsJobOpeningId(''));
      dispatch(updateEditJobDetails(mapDetailsToJobDetailsState(details)));
      dispatch(
        updateEditJobDescription({
          educationPreference: details.education_preference_id
            ? ([details.education_preference_id] as unknown as number[])
            : [],
          mandatorySkills: (details.skills ?? [])
            .filter((s) => String(s.skill_type).toUpperCase() === 'REQUIRED')
            .map((s) => s.skill_id as unknown as number),
          optionalSkills: (details.skills ?? [])
            .filter((s) => String(s.skill_type).toUpperCase() !== 'REQUIRED')
            .map((s) => s.skill_id as unknown as number),
          otherRequirements: details.other_requirements ?? '',
        })
      );
      dispatch(
        updateEditInterviewRounds(
          mapInterviewRoundsToState(jobData.interview_rounds ?? [], jobData.org_job_opening_id)
        )
      );
      dispatch(
        updateEditAiJobDescription({
          id: jobData.org_job_opening_id,
          jobDescription: details.jd ?? '',
          jobOpeningId: jobData.org_job_opening_id,
        })
      );
      dispatch(setIsDraft(jobData.is_draft));
    }
  }, [jobData, parsedJobId, jobOpeningId, dispatch, isEditMode]);

  useEffect(() => {
    if (!isEditMode) return;

    return () => {
      dispatch(resetEditJobState());
    };
  }, [dispatch, isEditMode]);

  // Interviewer page check
  const isInterviewPage = pathname.includes('interviewer-startinterview');

  if (isInterviewPage) {
    // Interviewer page: skip layout, show only child route
    return <Outlet context={{ refetchCandidates }} />;
  }

  return (
    <MainLayout>
      <JobDetailsLayout
        button={
          buttonConfig ? (
            <Button
              className="text-white bg-button rounded-3xl px-4 py-2 flex items-center space-x-2 cursor-pointer"
              onClick={buttonConfig.onClick}
            >
              <HiOutlinePlus className="text-lg" /> <span>{buttonConfig.label}</span>
            </Button>
          ) : null
        }
      >
        <Outlet context={{ refetchCandidates }} />
      </JobDetailsLayout>
    </MainLayout>
  );
};

export default JobsOpening;
