import { useGetJobOpeningByIdQuery } from '../api/job-service/JobOpening/GetJobOpeningById';
import { asJobId } from '../api/job-service/jobId';

/** Whether the job is still a draft, read from the server: true, false, or
 * undefined while it loads. Saved Redux state can be stale on a direct visit. */
export const useIsEditingDraft = (jobId?: string | null): boolean | undefined => {
  const { data } = useGetJobOpeningByIdQuery(
    { jobOpeningId: asJobId(jobId ?? '') },
    { skip: !jobId }
  );
  return data ? data.is_draft === true : undefined;
};
