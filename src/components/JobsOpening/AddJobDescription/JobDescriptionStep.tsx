import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import JobDescriptionPanel from './JobDescriptionPanel';
import { Button } from '../../shared';
import { RootState } from '../../../redux/provider/store';
import { setIsFormCompleted } from '../../../redux/slices/jobOpeningSlice';
import { asJobId } from '../../../api/job-service/jobId';
import { getFullURL } from '../../../shared/utils/methods';

/**
 * Create wizard, step 2 of 5 — "AI Job Description", now its own tab
 * (previously the right-hand half of jobdetails.tsx's merged split-screen
 * step; see JobDetailsLayout.tsx's `baseSteps`). Rendered as a child of the
 * `JobsOpening` route wrapper (`/job-description`), same as its
 * `AiQuestionsSetup`/`ScoringCriteria` siblings — that wrapper already
 * supplies `MainLayout`/`JobDetailsLayout`, so this component doesn't wrap
 * itself again.
 *
 * `JobDescriptionPanel` itself is unchanged and fully self-sufficient off
 * just the job id — every generate/refine/regenerate/edit behavior is
 * identical to before, just on its own page instead of a side panel.
 */
const JobDescriptionStep = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobOpeningId = useSelector((state: RootState) => state.JobSlice.jobOpeningId);
  const jobIdFromUrl = asJobId(searchParams.get('jobOpeningId'));
  const resolvedJobId = asJobId(jobOpeningId) || jobIdFromUrl;

  // Same "advance to Scoring Criteria" behavior jobdetails.tsx's
  // `handleContinueToScoring` had — reachable any time on this step (it's
  // only ever reached after Job Details is saved), not gated on the AI
  // description having finished generating.
  const handleContinueToScoring = () => {
    dispatch(setIsFormCompleted(true));
    const fullUrl = getFullURL('/scoring-criteria', true);
    const safeUrl =
      typeof fullUrl === 'string' && fullUrl.startsWith('/') ? fullUrl : '/scoring-criteria';
    navigate(safeUrl, { viewTransition: true });
  };

  return (
    <>
      <JobDescriptionPanel aiJobDescriptionId={resolvedJobId} />
      <div className="flex items-center justify-center mt-6 gap-6">
        <Button
          type="button"
          className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2 cursor-pointer"
          onClick={handleContinueToScoring}
        >
          NEXT: SCORING CRITERIA →
        </Button>
      </div>
    </>
  );
};

export default JobDescriptionStep;
