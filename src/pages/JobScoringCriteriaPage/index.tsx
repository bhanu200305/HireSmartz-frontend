import { useParams, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/provider/store';
import JobScoringCriteriaTab from '../../components/JobsOpening/JobScoringCriteriaTab';

const JobScoringCriteriaPage = () => {
  const { id } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  const isViewMode = pathname.includes('/jobs/view/');
  const isEditMode = pathname.includes('/jobs/edit/');

  // For view/edit flows, jobId comes from URL param
  // For create flow, jobId comes from Redux (set after job is created)
  const jobOpeningIdFromRedux = useSelector((state: RootState) => state.JobSlice.jobOpeningId);
  const editJobOpeningIdFromRedux = useSelector(
    (state: RootState) => state.EditJobSlice.jobOpeningId
  );

  let jobId: number;
  if (isViewMode || isEditMode) {
    jobId = Number(id);
  } else {
    jobId = editJobOpeningIdFromRedux || jobOpeningIdFromRedux;
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
