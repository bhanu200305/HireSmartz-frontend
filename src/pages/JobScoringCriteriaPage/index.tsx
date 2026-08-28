import { useParams, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/provider/store';
import JobScoringCriteriaTab from '../../components/JobsOpening/JobScoringCriteriaTab';
import { asJobId } from '../../api/job-service/jobId';

const JobScoringCriteriaPage = () => {
  const { id } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  const isViewMode = pathname.includes('/jobs/view/');
  const isEditMode = pathname.includes('/jobs/edit/');

  const jobOpeningIdFromRedux = useSelector((state: RootState) => state.JobSlice.jobOpeningId);
  const editJobOpeningIdFromRedux = useSelector(
    (state: RootState) => state.EditJobSlice.jobOpeningId
  );

  let jobId = '';
  if (isViewMode || isEditMode) {
    jobId = asJobId(id);
  } else {
    jobId = asJobId(editJobOpeningIdFromRedux) || asJobId(jobOpeningIdFromRedux);
  }

  if (!jobId) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Job not found. Please complete the previous steps first.
      </div>
    );
  }

  return <JobScoringCriteriaTab jobId={jobId} isViewMode={isViewMode} />;
};

export default JobScoringCriteriaPage;
