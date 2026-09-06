import candidateApi from '../candidateApi';

// Candidate lifecycle + bulk intake — API_CONTRACT.md's "Candidate
// Lifecycle" and "Bulk Intake" sections (`/api/v1/candidates`, JWT
// required, CANDIDATE_READ/CANDIDATE_WRITE). Replaces the legacy
// `Candidates.ts` in this same folder (numeric ids, `/candidate/*` routes
// riding the shared pre-microservices `api` client) — nothing in that file
// exists on the real backend.
//
// Named `CandidateLifecycle.ts`, not `candidates.ts` — Windows/macOS
// default filesystems are case-insensitive, and `candidates.ts` collides
// with the legacy `Candidates.ts` sitting in this same folder (confirmed
// the hard way: an earlier attempt at that filename silently clobbered
// Candidates.ts's on-disk content via the OS's case folding, restored from
// git). Do not reintroduce a same-named-but-different-case file here.

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** `CandidateView` — assembled from API_CONTRACT.md + FRONTEND_INTEGRATION_DETAILS.md
 * §4.4/PROJECT_UNDERSTANDING.md §4's domain-model table (not the literal
 * Pydantic schema — verify field-by-field against a real response before
 * shipping). This is what both `GET /candidates/{id}` and every item in
 * `GET /candidates`'s `PaginatedCandidates.items` return.
 */
export type CandidateView = {
  id: string;
  organization_id: string;
  job_opening_id: string;
  first_name: string | null;
  last_name: string | null;
  email_id: string | null;
  contact_no: string | null;
  qualification: string | null;
  address: string | null;
  applied_date: string;
  source: string | null;
  /** Which of the job's locations this candidate applied under, if it has more than one; `null` otherwise. */
  applied_job_location_id: string | null;

  /** Funnel position — `null` until the first explicit status transition. */
  status_code: string | null;
  status_label: string | null;

  /** ai-service's verdict on the resume vs. the job — never edited by a recruiter. */
  resume_score: number | null;
  scoring_reason: string | null;
  resume_s3_key: string | null;

  /** ai-service's verdict on the Intake Call consistency check (resume vs. what the candidate said on the call). */
  consistency_score: number | null;
  consistency_score_reason: string | null;

  /** The recruiter's own take on the resume, beside the AI score — never replacing it. */
  resume_rating: number | null;
  resume_review_comment: string | null;
  resume_reviewed_by: string | null;
  resume_reviewed_at: string | null;

  /** Referral fields, present on every apply path. */
  is_referal: boolean;
  referred_by: string | null;
  referal_code: string | null;
  referal_note: string | null;

  /** ID.me identity-verification state — see PROJECT_UNDERSTANDING.md §7. */
  verification_status: 'not_started' | 'in_progress' | 'completed' | 'rejected' | null;
  verification_started_at: string | null;
  verified_at: string | null;
};

export type PaginatedCandidates = {
  items: CandidateView[];
  limit: number;
  offset: number;
  total: number;
};

export type ListCandidatesArgs = {
  /** The only required param — there is no "all candidates across every job" list route. */
  jobOpeningId: string;
  search?: string;
  statusCode?: string;
  source?: string;
  appliedFrom?: string;
  appliedTo?: string;
  roundId?: string;
  sortBy?: 'applied_date' | 'resume_score' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};

export type ResumeUploadView = {
  /** Pass this straight into `ApplyRequest.resume_s3_key` — the only field of `POST /candidates` that must come from this call first. */
  resume_s3_key: string;
};

export type UploadCandidateResumeArgs = {
  organizationId: string;
  jobOpeningId: string;
  file: File;
};

export type ApplyRequest = {
  organizationId: string;
  jobOpeningId: string;
  /** From `POST /candidates/resume`'s `ResumeUploadView.resume_s3_key` — required. */
  resumeS3Key: string;
  firstName?: string;
  lastName?: string;
  emailId?: string;
  contactNo?: string;
  qualification?: string;
  address?: string;
  appliedJobLocationId?: string;
  isReferal?: boolean;
  referredBy?: string;
  referalCode?: string;
  referalNote?: string;
};

/** `call_placed` is `false` if this job has no Intake Call round configured,
 * no phone number was given, or interview-service couldn't be reached — the
 * candidate still exists either way. Shared by `POST /candidates` (a call is
 * attempted right after the candidate is created, when a phone number was
 * given) and `POST /candidates/instant-call` (no resume — a call is
 * attempted immediately). */
export type ApplyResultView = { id: string; call_placed: boolean };

export type StartInstantIntakeCallArgs = {
  organizationId: string;
  jobOpeningId: string;
  firstName?: string;
  lastName?: string;
  emailId?: string;
  /** Required — interview-service needs a real phone number to place the call. */
  contactNo: string;
  appliedJobLocationId?: string;
};

/** `UpdateCandidateRequest` — every field optional (partial update); real
 * editable fields inferred from `CandidateView`'s own writable columns.
 * Verify against a real 422 response before assuming a field is rejected.
 */
export type UpdateCandidateRequest = Partial<{
  first_name: string;
  last_name: string;
  email_id: string;
  contact_no: string;
  qualification: string;
  address: string;
  applied_job_location_id: string;
  is_referal: boolean;
  referred_by: string;
  referal_code: string;
  referal_note: string;
}>;

export type UpdateCandidateResultView = { id: string };

export type BulkUploadResumesArgs = {
  organizationId: string;
  jobOpeningId: string;
  /** Up to 30 files — `422 TOO_MANY_RESUMES` past that. */
  files: File[];
};

export type RejectedFileView = { filename: string; reason: string };

export type BulkUploadResumesResultView = {
  batch_id: string;
  total_files: number;
  valid_files: number;
  invalid_files: RejectedFileView[];
};

export type ResumeBatchItemView = {
  filename: string;
  status: string;
  candidate_id: string | null;
  error_message: string | null;
};

export type ResumeBatchProgressView = {
  batch_id: string;
  job_opening_id: string;
  status: string;
  total_files: number;
  valid_files: number;
  parsed_files: number;
  items: ResumeBatchItemView[];
};

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

const extendedApi = candidateApi.injectEndpoints({
  endpoints: (build) => ({
    // POST /candidates/resume — step 1 of recruiter manual entry
    // (FRONTEND_INTEGRATION_DETAILS.md §4.1). Not a presigned-URL flow — the
    // file goes through this API server directly.
    uploadCandidateResume: build.mutation<ResumeUploadView, UploadCandidateResumeArgs>({
      query: ({ organizationId, jobOpeningId, file }) => {
        const body = new FormData();
        body.append('organization_id', organizationId);
        body.append('job_opening_id', jobOpeningId);
        body.append('file', file);
        return { url: '/candidates/resume', method: 'POST', body };
      },
    }),

    // POST /candidates — step 2, always requires `resume_s3_key` from step 1.
    createCandidate: build.mutation<ApplyResultView, ApplyRequest>({
      query: ({
        organizationId,
        jobOpeningId,
        resumeS3Key,
        firstName,
        lastName,
        emailId,
        contactNo,
        qualification,
        address,
        appliedJobLocationId,
        isReferal,
        referredBy,
        referalCode,
        referalNote,
      }) => ({
        url: '/candidates',
        method: 'POST',
        body: {
          organization_id: organizationId,
          job_opening_id: jobOpeningId,
          resume_s3_key: resumeS3Key,
          first_name: firstName,
          last_name: lastName,
          email_id: emailId,
          contact_no: contactNo,
          qualification,
          address,
          applied_job_location_id: appliedJobLocationId,
          is_referal: isReferal,
          referred_by: referredBy,
          referal_code: referalCode,
          referal_note: referalNote,
        },
      }),
      invalidatesTags: ['CandidateList'],
    }),

    // POST /candidates/instant-call — Add Candidate's "Intake Call" option:
    // no resume yet, places the call immediately (same idea as the careers
    // page's "Talk to Us Now" path, but authenticated — no captcha).
    startInstantIntakeCall: build.mutation<ApplyResultView, StartInstantIntakeCallArgs>({
      query: ({
        organizationId,
        jobOpeningId,
        firstName,
        lastName,
        emailId,
        contactNo,
        appliedJobLocationId,
      }) => ({
        url: '/candidates/instant-call',
        method: 'POST',
        body: {
          organization_id: organizationId,
          job_opening_id: jobOpeningId,
          first_name: firstName,
          last_name: lastName,
          email_id: emailId,
          contact_no: contactNo,
          applied_job_location_id: appliedJobLocationId,
        },
      }),
      invalidatesTags: ['CandidateList'],
    }),

    getCandidate: build.query<CandidateView, string>({
      query: (candidateId) => `/candidates/${candidateId}`,
      providesTags: (_result, _error, candidateId) => [{ type: 'Candidate', id: candidateId }],
    }),

    // GET /candidates — job_opening_id is required; there is no
    // cross-job "all candidates" route (FRONTEND_INTEGRATION_DETAILS.md §4.3).
    listCandidates: build.query<PaginatedCandidates, ListCandidatesArgs>({
      query: ({
        jobOpeningId,
        search,
        statusCode,
        source,
        appliedFrom,
        appliedTo,
        roundId,
        sortBy,
        sortOrder,
        limit,
        offset,
      }) => ({
        url: '/candidates',
        params: {
          job_opening_id: jobOpeningId,
          search,
          status_code: statusCode,
          source,
          applied_from: appliedFrom,
          applied_to: appliedTo,
          round_id: roundId,
          sort_by: sortBy,
          sort_order: sortOrder,
          limit,
          offset,
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((c) => ({ type: 'Candidate' as const, id: c.id })),
              'CandidateList',
            ]
          : ['CandidateList'],
    }),

    updateCandidate: build.mutation<
      UpdateCandidateResultView,
      { candidateId: string; body: UpdateCandidateRequest }
    >({
      query: ({ candidateId, body }) => ({
        url: `/candidates/${candidateId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { candidateId }) => [
        { type: 'Candidate', id: candidateId },
        'CandidateList',
      ],
    }),

    // POST /candidates/bulk-resume — up to 30 files; files failing
    // validation land in `invalid_files` rather than failing the whole
    // batch. Poll `getBatchProgress` while ai-service parses each accepted
    // resume (FRONTEND_INTEGRATION_DETAILS.md §4.2).
    bulkUploadResumes: build.mutation<BulkUploadResumesResultView, BulkUploadResumesArgs>({
      query: ({ organizationId, jobOpeningId, files }) => {
        const body = new FormData();
        body.append('organization_id', organizationId);
        body.append('job_opening_id', jobOpeningId);
        files.forEach((file) => body.append('files', file));
        return { url: '/candidates/bulk-resume', method: 'POST', body };
      },
      invalidatesTags: ['CandidateList'],
    }),

    getBatchProgress: build.query<ResumeBatchProgressView, string>({
      query: (batchId) => `/candidates/batches/${batchId}`,
      providesTags: (_result, _error, batchId) => [{ type: 'CandidateBatch', id: batchId }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useUploadCandidateResumeMutation,
  useCreateCandidateMutation,
  useStartInstantIntakeCallMutation,
  useGetCandidateQuery,
  useListCandidatesQuery,
  useLazyListCandidatesQuery,
  useUpdateCandidateMutation,
  useBulkUploadResumesMutation,
  useGetBatchProgressQuery,
} = extendedApi;
