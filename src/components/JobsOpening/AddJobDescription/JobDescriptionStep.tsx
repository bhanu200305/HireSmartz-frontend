import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tooltip } from 'antd';
import JobDescriptionPanel, { type JobDescriptionPanelHandle } from './JobDescriptionPanel';
import { Button, showToast } from '../../shared';
import { RootState } from '../../../redux/provider/store';
import { setIsFormCompleted } from '../../../redux/slices/jobOpeningSlice';
import { asJobId } from '../../../api/job-service/jobId';
import { getFullURL } from '../../../shared/utils/methods';
import { useDeleteDraftJobMutation } from '../../../api/job-service/JobOpening/AddJobOpening';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import JobActionFooter from './JobActionFooter';

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
  const [deleteDraftJob, { isLoading: isCancelling }] = useDeleteDraftJobMutation();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const panelRef = useRef<JobDescriptionPanelHandle>(null);

  const handleConfirmCancel = async () => {
    if (resolvedJobId) {
      try {
        await deleteDraftJob(resolvedJobId).unwrap();
      } catch (error) {
        showToast({
          message: getJobErrorMessage(error, 'Failed to remove job opening'),
          type: 'error',
        });
        setShowCancelConfirm(false);
        return;
      }
    }
    setShowCancelConfirm(false);
    navigate('/jobs');
  };

  // Same "advance to Scoring Criteria" behavior jobdetails.tsx's
  // `handleContinueToScoring` had — reachable any time on this step (it's
  // only ever reached after Job Details is saved), not gated on the AI
  // description having finished generating.
  const handleContinueToScoring = async () => {
    const committed = await panelRef.current?.commitPendingEdit();
    if (committed === false) return;
    dispatch(setIsFormCompleted(true));
    const fullUrl = getFullURL('/scoring-criteria', true);
    const safeUrl =
      typeof fullUrl === 'string' && fullUrl.startsWith('/') ? fullUrl : '/scoring-criteria';
    navigate(safeUrl, { viewTransition: true });
  };

  const handleSaveDraft = async () => {
    const committed = await panelRef.current?.commitPendingEdit();
    if (committed === false) return;
    showToast({ message: 'Job saved as draft successfully', type: 'success' });
    navigate('/jobs');
  };

  return (
    <>
      <JobDescriptionPanel ref={panelRef} aiJobDescriptionId={resolvedJobId} />
      <JobActionFooter>
        <Tooltip title="Save progress and come back later.">
          <Button
            type="button"
            className="bg-primary hover:bg-brand-700 text-white rounded-full px-5 py-2 text-sm font-semibold shadow-sm transition-colors flex items-center justify-center"
            onClick={handleSaveDraft}
          >
            Save As Draft
          </Button>
        </Tooltip>
        <Tooltip title="Delete this job opening and everything in it.">
          <Button
            type="button"
            className="border border-neutral-300 bg-white text-neutral-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50/50 rounded-full px-5 py-2 text-sm font-medium transition-colors flex items-center justify-center"
            onClick={() => setShowCancelConfirm(true)}
          >
            Cancel
          </Button>
        </Tooltip>
        <Tooltip title="Save this page and continue.">
          <Button
            type="button"
            className="bg-primary hover:bg-primary-hover text-white rounded-full px-5 py-2 text-sm font-semibold shadow-xs hover:shadow transition-all flex items-center justify-center"
            onClick={handleContinueToScoring}
          >
            Save & Next
          </Button>
        </Tooltip>
      </JobActionFooter>
      {showCancelConfirm && (
        <ConfirmationModal
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={handleConfirmCancel}
          title="Cancel this job opening? Everything added so far will be permanently deleted."
          confirmText="Cancel Job"
          isLoading={isCancelling}
        />
      )}
    </>
  );
};

export default JobDescriptionStep;
