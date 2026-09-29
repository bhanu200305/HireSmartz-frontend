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

  // `verification_status`/`verification_started_at`/`verified_at` (ID.me
  // identity verification) used to be declared here alongside the two
  // fields below — still removed 2026-09-07, still not projected onto the
  // real `CandidateView` Pydantic model (verified against `candidate_dto.py`
  // directly). If verification becomes recruiter-visible later, it needs to
  // be added to the backend's `CandidateView` first, then here.

  /** Intake Call consistency check — transcript-vs-resume authenticity
   * signal from ai-service (`candidate.intake_call.consistency_checked`),
   * distinct from `resume_score` (resume judged against the job). Re-added
   * 2026-09-08, same day candidate-service actually shipped the missing
   * projection onto `CandidateView` (confirmed directly against
   * `candidate_dto.py` — both columns existed since migration 0015, this
   * was just the read model catching up) — unlike the ID.me fields the
   * removal note above still applies to, this pair is now live on every
   * real response. Nullable either way — neither is set until ai-service
   * actually reports a score, which itself only happens once BOTH the
   * resume is on file and the Intake Call's transcript artifact has landed
   * (`interview_intake_call_artifacts_ready.py` gates the request on
   * exactly that) — same nullability posture as `resume_score`/
   * `scoring_reason`. */
  consistency_score: number | null;
  consistency_score_reason: string | null;

  /** Raw status of whichever round `_current_round.resolve_current_round`
   * (candidate-service) currently resolves to for this candidate — the same
   * vocabulary `roundProgress.ts`'s `bucketForStatus`/`normaliseRoundStatus`
   * already bucket for a live round object (see `RoundSidebarItem.tsx`'s round
   * cards). `null` once there's no outstanding round left to resolve (every
   * round concluded, or none exist yet). */
  current_round_status: string | null;
};

export type PaginatedCandidates = {
  items: CandidateView[];
  limit: number;
  offset: number;
  total: number;
};

export type ListCandidatesArgs = {
  /** OPTIONAL as of 2026-09-08 (was required, API_CONTRACT.md §"Candidate
   * Lifecycle"). Omit for an org-wide search across every job the caller's
   * tenant owns — this is what `SearchCandidateListing.tsx`'s global search
   * wires to. Pass it to scope to one job's pipeline. Tenant boundary is
   * enforced server-side either way. */
  jobOpeningId?: string;
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
  /** Parsed off the uploaded resume (candidate-service, 2026-09-29) so the
   * Add Candidate form can pre-fill them; null when not found. */
  first_name: string | null;
  last_name: string | null;
  email_id: string | null;
  contact_no: string | null;
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
  /** candidate-service's `ApplicationSource` code. `POST /candidates` stores
   * whatever the client sends here (null when omitted, which is why
   * recruiter-added candidates used to show Source "N/A"); the QR/public
   * apply and bulk-resume paths set theirs server-side. */
  source?: 'qr_self_apply' | 'ats_fetch' | 'recruiter_upload';
};

/** `call_placed` is `false` if this job has no Intake Call round configured,
 * no phone number was given, or interview-service couldn't be reached — the
 * candidate still exists either way. Set by `POST /candidates` (a call is
 * attempted right after the candidate is created, when a phone number was
 * given). */
export type ApplyResultView = { id: string; call_placed: boolean };

/** `UpdateCandidateRequest` — every field optional (partial update).
 * Exactly the six fields candidate-service's own `UpdateCandidateRequest`
 * accepts; it is `extra="forbid"`, so any other key 422s the whole save. */
export type UpdateCandidateRequest = Partial<{
  first_name: string;
  last_name: string;
  email_id: string;
  contact_no: string;
  qualification: string;
  address: string;
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
        source,
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
          source,
        },
      }),
      invalidatesTags: ['CandidateList'],
    }),

    getCandidate: build.query<CandidateView, string>({
      query: (candidateId) => `/candidates/${candidateId}`,
      providesTags: (_result, _error, candidateId) => [{ type: 'Candidate', id: candidateId }],
    }),

    // GET /candidates — `job_opening_id` is OPTIONAL now: omit it for an
    // org-wide candidate search, pass it to scope to one job's pipeline
    // (FRONTEND_INTEGRATION_DETAILS.md §4.3). `params` drops `undefined`
    // keys, so omitting `jobOpeningId` simply doesn't send the param.
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
  useGetCandidateQuery,
  useListCandidatesQuery,
  useLazyListCandidatesQuery,
  useUpdateCandidateMutation,
  useBulkUploadResumesMutation,
  useGetBatchProgressQuery,
} = extendedApi;
