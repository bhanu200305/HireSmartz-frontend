import candidateApi from '../candidateApi';

// Resume Review & Scoring — API_CONTRACT.md's "Resume Review & Scoring"
// section. Two independent, parallel "opinion" layers on top of the AI
// score (`CandidateView.resume_score`), which neither ever overwrites
// (FRONTEND_INTEGRATION_DETAILS.md §4.7). Both DELETE routes are
// author-only — `403 NOT_AUTHOR` if you didn't create the review/score;
// hide the delete affordance client-side for a non-author too, don't rely
// on the 403 alone to communicate that.

export type RecordResumeReviewRequest = {
  /** 1–5, optional */
  rating?: number;
  comment?: string;
};

/** Matches `candidate_dto.ResumeReviewResultView` field-for-field (verified
 * 2026-09-02) — NOT `rating`/`comment`/`reviewed_by`/`reviewed_at`, which
 * this type used to claim and which don't exist on the real response.
 * Unused by `ResumeReviewModal.tsx` today (it re-reads the saved review off
 * the refetched `CandidateView` instead), but kept accurate regardless.
 */
export type ResumeReviewResultView = {
  candidate_id: string;
  resume_rating: number | null;
  resume_reviewed_at: string | null;
};

/** `CandidateInterviewScoreView` — AI + recruiter score for one round, side
 * by side. `recruiter_score`/`recruiter_score_reason` are `null` until a
 * recruiter records one.
 *
 * Matches `candidate_dto.CandidateInterviewScoreView` field-for-field
 * (verified 2026-09-02 against the real Pydantic model — this type used to
 * claim `score_id`/`round_id`/`round_name`/`ai_score`/`ai_score_reason`/
 * `scored_by`/`scored_at`, none of which exist on the real response; every
 * consumer read `undefined` for the AI score, and "Score this round" sent
 * `undefined` as the score id, silently failing every time). There is no
 * `round_name` on this response at all — resolve it client-side via
 * `candidate_interview_round_id` against `CandidateInterviewRoundView.id`
 * (NOT `.round_id` — see interviewRounds.ts's own note on that same mix-up).
 */
export type CandidateInterviewScoreView = {
  id: string;
  candidate_id: string;
  interview_booking_id: string;
  score: number;
  scoring_reason: string | null;
  interview_round_status: boolean | null;
  live_face_match_status: string | null;
  live_face_match_score: number | null;
  recruiter_score: number | null;
  recruiter_score_reason: string | null;
  recruiter_scored_by: string | null;
  /** Per-category breakdown behind `score` (0-10 each), e.g.
   * `[{ key: "communication", score: 7 }, ...]`. `null` on rows scored
   * before this field existed on the wire (candidate-service 2026-09-14);
   * `[]` when ai-service computed no sections for that round. */
  section_scores: { key: string; score: number }[] | null;
  /** Which `CandidateInterviewRoundView.id` this score belongs to. Nullable:
   * interview-service can score a booking that was never planned, and
   * scores recorded before the round-link column existed have no round to
   * point at. */
  candidate_interview_round_id: string | null;
  created_at: string | null;
};

export type RecordRecruiterRoundScoreRequest = {
  /** 1–5, required (unlike the resume review's optional rating). */
  recruiterScore: number;
  reason: string;
};

/** Matches `candidate_dto.RecruiterRoundScoreResultView` — deliberately a
 * DIFFERENT shape from `CandidateInterviewScoreView` above (`score_id`/
 * `ai_score` here, `id`/`score` there) — that's the real backend's own
 * inconsistency between the two response models, not a typo introduced
 * here; kept as-is rather than "corrected" into a shape the server doesn't
 * actually send. */
export type RecruiterRoundScoreResultView = {
  score_id: string;
  candidate_id: string;
  ai_score: number;
  recruiter_score: number;
};

/** Cache no longer than `expires_in_seconds` — this is a short-lived presigned URL, not a stable link. */
export type ResumeDownloadView = {
  download_url: string;
  expires_in_seconds: number;
};

const extendedApi = candidateApi.injectEndpoints({
  endpoints: (build) => ({
    recordResumeReview: build.mutation<
      ResumeReviewResultView,
      { candidateId: string; body: RecordResumeReviewRequest }
    >({
      query: ({ candidateId, body }) => ({
        url: `/candidates/${candidateId}/resume-review`,
        method: 'POST',
        body: { rating: body.rating, comment: body.comment },
      }),
      invalidatesTags: (_result, _error, { candidateId }) => [
        { type: 'Candidate', id: candidateId },
        { type: 'CandidateResumeReview', id: candidateId },
      ],
    }),

    deleteResumeReview: build.mutation<null, string>({
      query: (candidateId) => ({
        url: `/candidates/${candidateId}/resume-review`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, candidateId) => [
        { type: 'Candidate', id: candidateId },
        { type: 'CandidateResumeReview', id: candidateId },
      ],
    }),

    listCandidateInterviewScores: build.query<CandidateInterviewScoreView[], string>({
      query: (candidateId) => `/candidates/${candidateId}/interview-scores`,
      providesTags: (_result, _error, candidateId) => [
        { type: 'CandidateInterviewScores', id: candidateId },
      ],
    }),

    recordRecruiterRoundScore: build.mutation<
      RecruiterRoundScoreResultView,
      { candidateId: string; scoreId: string; body: RecordRecruiterRoundScoreRequest }
    >({
      query: ({ candidateId, scoreId, body }) => ({
        url: `/candidates/${candidateId}/interview-scores/${scoreId}/recruiter-score`,
        method: 'POST',
        body: { recruiter_score: body.recruiterScore, reason: body.reason },
      }),
      invalidatesTags: (_result, _error, { candidateId }) => [
        { type: 'CandidateInterviewScores', id: candidateId },
      ],
    }),

    deleteRecruiterRoundScore: build.mutation<null, { candidateId: string; scoreId: string }>({
      query: ({ candidateId, scoreId }) => ({
        url: `/candidates/${candidateId}/interview-scores/${scoreId}/recruiter-score`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { candidateId }) => [
        { type: 'CandidateInterviewScores', id: candidateId },
      ],
    }),

    getCandidateResumeDownload: build.query<ResumeDownloadView, string>({
      query: (candidateId) => `/candidates/${candidateId}/resume`,
    }),

    // Recruiter/HM-triggered "Request Resume" — added 2026-09-14. Backend
    // (candidate-service, NOT YET BUILT — see the interview-service handoff)
    // is expected to mint and email a fresh resume-upload link on demand,
    // the same email `CandidateResumeUploadRequested` already sends
    // automatically today after a completed Intake Call. This is the
    // explicit, recruiter-driven counterpart: once candidate-service stops
    // auto-sending on every completed AUDIO booking (including reschedule
    // re-attempts — the reported double-send bug), this button becomes the
    // only way to (re-)request a resume. `POST /candidates/{id}/
    // request-resume-upload`, no request body, `null` on success — mirrors
    // `deleteResumeReview`'s shape immediately above.
    requestResumeUpload: build.mutation<null, string>({
      query: (candidateId) => ({
        url: `/candidates/${candidateId}/request-resume-upload`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, candidateId) => [{ type: 'Candidate', id: candidateId }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useRecordResumeReviewMutation,
  useDeleteResumeReviewMutation,
  useListCandidateInterviewScoresQuery,
  useRecordRecruiterRoundScoreMutation,
  useDeleteRecruiterRoundScoreMutation,
  useGetCandidateResumeDownloadQuery,
  useLazyGetCandidateResumeDownloadQuery,
  useRequestResumeUploadMutation,
} = extendedApi;
