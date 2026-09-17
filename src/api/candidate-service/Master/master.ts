import candidateApi from '../candidateApi';

// Master Data — API_CONTRACT.md's "Master Data" section
// (`/api/v1/candidate-master` — not the generic `/master`, which collides
// with job-service's own master-catalogue routes behind staging's shared
// API gateway). Fetch these rather than hardcoding status/source
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

/** A row of `master_candidate_status`. Always the FULL set — `withdrawn`
 * included (API_CONTRACT.md "Status & Pipeline"). `is_manually_settable` is
 * `false` only for `withdrawn`: a "set status to…" picker filters on it
 * client-side; a status FILTER or a board's COLUMNS use the full list as-is
 * (`withdrawn` is a valid thing to filter/group by, just not to manually
 * set). `sort_order` is the canonical funnel order from the backend — prefer
 * it over a hardcoded order where available. */
export type CandidateStatusView = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  sort_order: number | null;
  is_manually_settable: boolean;
};

export type ApplicationSourceView = {
  code: string;
  label: string;
};

const extendedApi = candidateApi.injectEndpoints({
  endpoints: (build) => ({
    listCandidateStatuses: build.query<CandidateStatusView[], void>({
      query: () => '/candidate-master/candidate-statuses',
      providesTags: ['MasterCandidateStatuses'],
    }),
    listApplicationSources: build.query<ApplicationSourceView[], void>({
      query: () => '/candidate-master/application-sources',
      providesTags: ['MasterApplicationSources'],
    }),
  }),
  overrideExisting: false,
});

export const { useListCandidateStatusesQuery, useListApplicationSourcesQuery } = extendedApi;
