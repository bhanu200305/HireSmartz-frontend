import candidateApi from '../candidateApi';

// "Assign New Job" — considers an existing candidate for ANOTHER job opening.
//
// NOT IMPLEMENTED IN candidate-service YET. A candidate row has exactly one
// `job_opening_id`, so this needs a new endpoint (see the proposal the
// frontend was built against, below). Until it ships, calling this returns
// a 404/405 and AssignJobModal surfaces the server's message in a toast.
//
// Proposed contract:
//   POST /candidates/{candidate_id}/assign-job
//   body     { job_opening_id: string }
//   201      CandidateView of the NEW candidacy (same person, other job)
//   409      already assigned to that job / job closed or unpublished
export type AssignCandidateToJobArgs = {
  candidateId: string;
  jobOpeningId: string;
};

const assignJobApi = candidateApi.injectEndpoints({
  endpoints: (build) => ({
    assignCandidateToJob: build.mutation<unknown, AssignCandidateToJobArgs>({
      query: ({ candidateId, jobOpeningId }) => ({
        url: `/candidates/${candidateId}/assign-job`,
        method: 'POST',
        body: { job_opening_id: jobOpeningId },
      }),
      invalidatesTags: (_result, _error, { candidateId }) => [
        { type: 'Candidate', id: candidateId },
        'CandidateList',
        'CandidateStats',
      ],
    }),
  }),
  overrideExisting: false,
});

export const { useAssignCandidateToJobMutation } = assignJobApi;
