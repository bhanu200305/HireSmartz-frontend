import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setEditAiJdPassedJobId } from '../../../redux/slices/jobOpeningSlice';
import { Tooltip } from 'antd';
import { Button, showToast } from '../../shared';
import JobDescriptionPanel, {
  type JobDescriptionPanelHandle,
} from '../AddJobDescription/JobDescriptionPanel';
import { asJobId } from '../../../api/job-service/jobId';
import { useDeleteDraftJobMutation } from '../../../api/job-service/JobOpening/AddJobOpening';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';
import { useIsEditingDraft } from '../../../hooks/useIsEditingDraft';
import { useGetJobDescriptionByIdQuery } from '../../../api/job-service/JobOpening/ViewJobDescriptionById';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import JobActionFooter from '../AddJobDescription/JobActionFooter';

/**
 * Edit wizard's "AI Job Description" tab — now the exact same panel the
 * create wizard uses (JobDescriptionStep.tsx), not a separate legacy
 * implementation. The previous version here called a deprecated numeric
 * `aiJobDescriptionID` param and, for REFINE/REGENERATE, `POST
 * .../jd/regenerate` — the AI-Prompt-path-only endpoint, which 400s for
 * Manual/Upload-JD jobs (see JobDescriptionPanel's own `handleGenerate`
 * comment) — every job editable through this UI today. `JobDescriptionPanel`
 * already calls the correct `/jd/enhance` endpoint and is fully
 * self-sufficient off just the job id, so this tab reuses it as-is rather
 * than maintaining a second, drifted copy.
 *
 * The old "Sync Job Description With ATS" checkbox is dropped — the
 * create-wizard equivalent (jobdetails.tsx) already has this same checkbox
 * disabled (`{false && ...}`), so keeping it live only here was an
 * inconsistency, not a maintained feature.
 */
const EditAiJobDescription = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams<{ id: string }>();
  const jobOpeningId = asJobId(id);
  const isDraft = useIsEditingDraft(id) === true;
  const [deleteDraftJob, { isLoading: isCancelling }] = useDeleteDraftJobMutation();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const panelRef = useRef<JobDescriptionPanelHandle>(null);
  const { refetch: refetchJd } = useGetJobDescriptionByIdQuery(
    { jobOpeningId },
    { skip: !jobOpeningId }
  );

  const handleContinueToScoring = async () => {
    const committed = await panelRef.current?.commitPendingEdit();
    if (committed === false) return;
    // Scoring stays locked without a job description, so say why instead of bouncing back.
    const latest = await refetchJd()
      .unwrap()
      .catch(() => null);
    if (latest && !latest.jobDescription?.trim()) {
      showToast({
        message: 'Add or generate the job description before continuing.',
        type: 'error',
      });
      return;
    }
    dispatch(setEditAiJdPassedJobId(id ?? null));
    navigate(`/jobs/edit/${id}/scoring-criteria`);
  };

  const handleSaveDraft = async () => {
    const committed = await panelRef.current?.commitPendingEdit();
    if (committed === false) return;
    showToast({ message: 'Job saved as draft successfully', type: 'success' });
    navigate('/jobs');
  };

  const handleConfirmCancel = async () => {
    if (jobOpeningId) {
      try {
        await deleteDraftJob(jobOpeningId).unwrap();
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

  return (
    <>
      <JobDescriptionPanel ref={panelRef} aiJobDescriptionId={jobOpeningId} />
      <JobActionFooter>
        {isDraft && (
          <Tooltip title="Delete this job opening and everything in it.">
            <Button
              type="button"
              className="border border-neutral-300 bg-white text-neutral-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50/50 rounded-full px-5 py-2 text-sm font-medium transition-colors flex items-center justify-center"
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel
            </Button>
          </Tooltip>
        )}
        {isDraft && (
          <Tooltip title="Save progress and come back later.">
            <Button
              type="button"
              className="bg-primary hover:bg-brand-700 text-white rounded-full px-5 py-2 text-sm font-semibold shadow-sm transition-colors flex items-center justify-center"
              onClick={handleSaveDraft}
            >
              Save As Draft
            </Button>
          </Tooltip>
        )}
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

export default EditAiJobDescription;
