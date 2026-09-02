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

export type ResumeReviewResultView = {
  candidate_id: string;
  rating: number | null;
  comment: string | null;
  reviewed_by: string;
  reviewed_at: string;
};

/** `CandidateInterviewScoreView` — AI + recruiter score for one round, side
 * by side. `recruiter_score`/`recruiter_score_reason` are `null` until a
 * recruiter records one.
 */
export type CandidateInterviewScoreView = {
  score_id: string;
  round_id: string;
  round_name: string | null;
  ai_score: number | null;
  ai_score_reason: string | null;
  recruiter_score: number | null;
  recruiter_score_reason: string | null;
  scored_by: string | null;
  scored_at: string | null;
};

export type RecordRecruiterRoundScoreRequest = {
  /** 1–5, required (unlike the resume review's optional rating). */
  recruiterScore: number;
  reason: string;
};

export type RecruiterRoundScoreResultView = {
  score_id: string;
  ai_score: number | null;
  recruiter_score: number;
  recruiter_score_reason: string;
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
  }),
  overrideExisting: false,
});

export const {
  useRecordResumeReviewMutation,
  useDeleteResumeReviewMutation,
  useListCandidateInterviewScoresQuery,
  useRecordRecruiterRoundScoreMutation,
  useDeleteRecruiterRoundScoreMutation,
  useLazyGetCandidateResumeDownloadQuery,
} = extendedApi;
