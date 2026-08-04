import MainLayout from '../../layouts/MainLayout';
import JobDetailsLayout from '../../layouts/JobDetailsLayout';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '../shared';
import { HiOutlinePlus } from 'react-icons/hi';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/provider/store';
import { useGetJobOpeningByIdQuery } from '../../api/job-service/JobOpening/GetJobOpeningById';
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
import { InterviewRoundState } from '../../types';

const getButtonConfig = (
  pathname: string,
  _id: string | undefined,
  handleAddNewRound: () => void,
  _handleAddNewQuestion: () => void
) => {
  if (/\/edit\/.*\/interview/.test(pathname)) {
    return {
      onClick: handleAddNewRound,
      label: 'ADD NEW ROUND',
    };
  }
  return null;
};

interface JobsOpeningProps {
  refetchCandidates?: () => void; // Add prop for refetching candidates
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
  const parsedJobId = Number(id);
  const isEditMode = pathname.includes('/edit/');
  const dispatch = useDispatch();
  const jobOpeningId = useSelector((state: RootState) => state.EditJobSlice.jobOpeningId);

  const { data: jobData } = useGetJobOpeningByIdQuery(
    { jobOpeningId: parsedJobId },
    { skip: !isEditMode || !parsedJobId, refetchOnMountOrArgChange: true }
  );

  useEffect(() => {
    if (isEditMode && jobData && (!jobOpeningId || parsedJobId !== jobOpeningId)) {
      dispatch(setEditJobOpeningId(Number(jobData?.data.id) || 0));
      dispatch(setAtsJobOpeningId(jobData?.data.atsJobOpeningId || ''));
      const shift = jobData?.data.shift || '';
      let [shiftStart, shiftEnd] = shift.split(' - ');
      const timeRegex = /^\d{1,2}:\d{2}$/;
      const timeWithAmPmRegex = /^\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)$/i;
      const isValidTime = (t: string) => timeRegex.test(t) || timeWithAmPmRegex.test(t);

      if (!shiftStart || !isValidTime(shiftStart)) {
        shiftStart = '';
      }
      if (!shiftEnd || !isValidTime(shiftEnd)) {
        shiftEnd = '';
      }

      // Prefer the new `location` field (company location record) over the old
      // `officeLocation` array (which contained city-level IDs that don't match
      // the company-location dropdown options). Using city.id here caused the
      // Location Name dropdown to appear empty on subsequent visits (CRRFRC-2374).
      const newLocationData = jobData?.data?.location;
      const resolvedLocationId = newLocationData?.id ? Number(newLocationData.id) : null;
      const resolvedOfficeLocation: number[] =
        resolvedLocationId !== null && resolvedLocationId > 0
          ? [resolvedLocationId]
          : (jobData?.data.officeLocation
              ?.map((item: any) => {
                const rawId = item?.id ?? item?.city?.id;
                const parsed = Number(rawId);
                return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
              })
              .filter((id: number | null): id is number => id !== null) ?? []);

      const countryName =
        newLocationData?.country || jobData?.data.officeLocation?.[0]?.country?.name || '';
      const stateName =
        newLocationData?.state || jobData?.data.officeLocation?.[0]?.state?.name || '';

      const isDraft = jobData?.data?.isDraft || false;

      const processedData = {
        ...jobData?.data,
        jobTitle: jobData?.data.jobTitle?.map((item: any) => item.id) || [],
        jobType: jobData?.data.jobType?.map((item: any) => item.id) || [],
        department: jobData?.data.department?.map((item: any) => item.id) || [],
        jobProfileCode: jobData?.data.jobProfileCode || '',
        country: countryName,
        state: stateName,
        officeLocation: resolvedOfficeLocation,
        exemptionStatus: jobData?.data.exemptionStatus?.id || null,
        educationPreference:
          jobData?.data.educationPreference?.map((edu: { id: number }) => edu.id) || [],
        mandatorySkills:
          jobData?.data.mandatorySkills?.map((skill: { id: number }) => skill.id) || [],
        optionalSkills:
          jobData?.data.optionalSkills?.map((skill: { id: number }) => skill.id) || [],
        hiringManagers: (Array.isArray(jobData?.data.hiringManagers)
          ? jobData.data.hiringManagers
          : jobData?.data.hiringManager?.id
            ? [jobData.data.hiringManager]
            : []
        )
          .map((item: any) => (typeof item === 'object' ? item?.id : Number(item)))
          .filter(Boolean),
        recruiters: (Array.isArray(jobData?.data.recruiters)
          ? jobData.data.recruiters
          : jobData?.data.recruiter?.id
            ? [jobData.data.recruiter]
            : []
        )
          .map((item: any) => (typeof item === 'object' ? item?.id : Number(item)))
          .filter(Boolean),
        referralBonus:
          jobData?.data.referralBonus != null && !isNaN(Number(jobData.data.referralBonus))
            ? Number(jobData.data.referralBonus)
            : null,
        shiftStart: shiftStart || '',
        shiftEnd: shiftEnd || '',
        isMultilingual: jobData?.data?.isMultilingual || false,
        openings: jobData?.data.openings ? Number(jobData.data.openings) : null,
        minSalary: jobData?.data.minSalary ? String(jobData.data.minSalary) : null,
        maxSalary: jobData?.data.maxSalary ? String(jobData.data.maxSalary) : null,
        minExperience:
          jobData?.data.minExperience != null ? Number(jobData.data.minExperience) : null,
        maxExperience:
          jobData?.data.maxExperience != null ? Number(jobData.data.maxExperience) : null,
      };

      const descriptionData = {
        educationPreference:
          jobData?.data.educationPreference?.map((edu: { id: number }) => edu.id) || [],
        communicationSkills: jobData?.data.communicationSkills || '',
        mandatorySkills:
          jobData?.data.mandatorySkills?.map((skill: { id: number }) => skill.id) || [],
        optionalSkills:
          jobData?.data.optionalSkills?.map((skill: { id: number }) => skill.id) || [],
        otherRequirements: jobData?.data.otherRequirements || '',
      };

      const interviewRounds = (jobData.data.interviewRounds || []).map(
        (round: any): InterviewRoundState => ({
          ...round,
          roundType: round.roundType as 'AI' | 'VIDEO' | 'MANUAL',
        })
      );

      const aiJobDescriptionData = {
        id: jobData?.data.aiJobDescription?.id || 0,
        jobDescription: jobData?.data.aiJobDescription?.jobDescription || '',
        jobOpeningId: jobData?.data.aiJobDescription?.jobOpeningId || 0,
      };

      dispatch(updateEditJobDetails(processedData));
      dispatch(updateEditJobDescription(descriptionData));
      dispatch(updateEditInterviewRounds(interviewRounds));
      dispatch(updateEditAiJobDescription(aiJobDescriptionData));
      dispatch(setIsDraft(isDraft));
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
        <Outlet context={{ refetchCandidates }} /> {/* Pass refetchCandidates to Outlet */}
      </JobDetailsLayout>
    </MainLayout>
  );
};

export default JobsOpening;
