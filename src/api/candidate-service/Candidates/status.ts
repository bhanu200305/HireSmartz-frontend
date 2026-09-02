import candidateApi from '../candidateApi';

// Status & Pipeline — API_CONTRACT.md's "Status & Pipeline" section. ANY
// `master_candidate_status` code is accepted on a single change — there is
// no transition-legality check server-side (a candidate can move from
// `selected` back to `applied`); fetch valid codes from
// `Master/master.ts`'s `useListCandidateStatusesQuery` rather than
// hardcoding them, per FRONTEND_INTEGRATION_DETAILS.md §4.6.

export type ChangeCandidateStatusRequest = {
  statusCode: string;
  reason?: string;
};

export type ChangeCandidateStatusResultView = {
  candidate_id: string;
  status_code: string;
};

export type BulkChangeCandidateStatusRequest = {
  /** Max 100 — all-or-nothing: if any id is invalid, the whole call fails, it does not partially apply. */
  candidateIds: string[];
  statusCode: string;
  reason?: string;
};

export type BulkChangeCandidateStatusResultView = {
  status_code: string;
  updated_count: number;
};

/** One row of the append-only funnel transition log — shape inferred from
 * `CandidateStatusHistory` in PROJECT_UNDERSTANDING.md §4; verify against a
 * real response.
 */
export type CandidateStatusHistoryItem = {
  id: string;
  status_code: string;
  status_label: string | null;
  reason: string | null;
  changed_at: string;
  changed_by: string | null;
};

/** Unlike `PaginatedCandidates`, this list response currently omits `total`
 * (FRONTEND_INTEGRATION_DETAILS.md §3) — don't assume it's there.
 */
export type PaginatedCandidateStatusHistory = {
  items: CandidateStatusHistoryItem[];
  limit: number;
  offset: number;
};

const extendedApi = candidateApi.injectEndpoints({
  endpoints: (build) => ({
    changeCandidateStatus: build.mutation<
      ChangeCandidateStatusResultView,
      { candidateId: string; body: ChangeCandidateStatusRequest }
    >({
      query: ({ candidateId, body }) => ({
        url: `/candidates/${candidateId}/status`,
        method: 'POST',
        body: { status_code: body.statusCode, reason: body.reason },
      }),
      invalidatesTags: (_result, _error, { candidateId }) => [
        { type: 'Candidate', id: candidateId },
        { type: 'CandidateStatusHistory', id: candidateId },
        'CandidateList',
      ],
    }),

    bulkChangeCandidateStatus: build.mutation<
      BulkChangeCandidateStatusResultView,
      BulkChangeCandidateStatusRequest
    >({
      query: ({ candidateIds, statusCode, reason }) => ({
        url: '/candidates/bulk-status',
        method: 'POST',
        body: { candidate_ids: candidateIds, status_code: statusCode, reason },
      }),
      invalidatesTags: ['CandidateList'],
    }),

    getCandidateStatusHistory: build.query<
      PaginatedCandidateStatusHistory,
      { candidateId: string; limit?: number; offset?: number }
    >({
      query: ({ candidateId, limit, offset }) => ({
        url: `/candidates/${candidateId}/status-history`,
        params: { limit, offset },
      }),
      providesTags: (_result, _error, { candidateId }) => [
        { type: 'CandidateStatusHistory', id: candidateId },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useChangeCandidateStatusMutation,
  useBulkChangeCandidateStatusMutation,
  useGetCandidateStatusHistoryQuery,
} = extendedApi;
