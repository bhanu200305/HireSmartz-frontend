import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useCreateJobDraftMutation } from '../api/job-service/JobOpening/GetJobOpeningById';
import { extractDraftJobId, extractDraftProfileCode } from '../api/job-service/jobId';
import { resetJobState, setJobOpeningId, updateJobDetails } from '../redux/slices/jobOpeningSlice';

type StartManualJobResult = {
  jobId: string;
  jobProfileCode: string;
};

/**
 * Manual create starts with POST /job-openings/draft so the Job Details
 * screen already has an org_job_opening_id. Save & Generate then only
 * PUTs /job-openings/{id}/details.
 */
export const useStartManualJobOpening = () => {
  const dispatch = useDispatch();
  const [createJobDraft, { isLoading: isStartingManualJob }] = useCreateJobDraftMutation();

  const startManualJobOpening = useCallback(async (): Promise<StartManualJobResult> => {
    dispatch(resetJobState());
    const draft = await createJobDraft().unwrap();
    const jobId = extractDraftJobId(draft);
    if (!jobId) {
      throw new Error('Draft did not return a job id');
    }
    const jobProfileCode = extractDraftProfileCode(draft);
    dispatch(setJobOpeningId(jobId));
    if (jobProfileCode) {
      dispatch(updateJobDetails({ jobProfileCode }));
    }
    return { jobId, jobProfileCode };
  }, [createJobDraft, dispatch]);

  return { startManualJobOpening, isStartingManualJob };
};
