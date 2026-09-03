import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../shared';
import JobDescriptionPanel from '../AddJobDescription/JobDescriptionPanel';
import { asJobId } from '../../../api/job-service/jobId';

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
  const { id } = useParams<{ id: string }>();
  const jobOpeningId = asJobId(id);

  const handleContinueToScoring = () => {
    navigate(`/jobs/edit/${id}/scoring-criteria`);
  };

  return (
    <>
      <JobDescriptionPanel aiJobDescriptionId={jobOpeningId} isEditFlow />
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

export default EditAiJobDescription;
