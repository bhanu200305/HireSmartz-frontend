import candidateApi from '../candidateApi';

// Master Data — API_CONTRACT.md's "Master Data" section
// (`/api/v1/master`). Fetch these rather than hardcoding status/source
// codes client-side — `master_candidate_status` in particular is the
// source of truth and can grow (FRONTEND_INTEGRATION_DETAILS.md §4.6).
// Reference list of the 11 seeded codes today, funnel order
// (PROJECT_UNDERSTANDING.md §4):
//   applied → resume_under_review → resume_rejected (terminal)
//                                  → shortlisted → interview_scheduled
//                                  → interview_in_progress → interview_rejected (terminal)
//                                                           → advanced (loops to next round)
//                                                           → selected (terminal)
//   → rejected (terminal, general) / withdrawn (terminal, voluntary)
// Don't reintroduce this as a hardcoded enum — always read from this endpoint.

export type CandidateStatusView = {
  code: string;
  label: string;
};

export type ApplicationSourceView = {
  code: string;
  label: string;
};

const extendedApi = candidateApi.injectEndpoints({
  endpoints: (build) => ({
    listCandidateStatuses: build.query<CandidateStatusView[], void>({
      query: () => '/master/candidate-statuses',
      providesTags: ['MasterCandidateStatuses'],
    }),
    listApplicationSources: build.query<ApplicationSourceView[], void>({
      query: () => '/master/application-sources',
      providesTags: ['MasterApplicationSources'],
    }),
  }),
  overrideExisting: false,
});

export const { useListCandidateStatusesQuery, useListApplicationSourcesQuery } = extendedApi;
