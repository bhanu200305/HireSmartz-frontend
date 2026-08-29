import { jobApi } from '../jobApi';
import type {
  ActiveJobCountResponse,
  AddJobNoteArgs,
  DeleteJobNoteArgs,
  EditJobNoteArgs,
  GenerateJdResponse,
  JdEnhancementResultResponse,
  JobCountsByDepartmentResponse,
  JobCountsByLocationResponse,
  JobDetailsResponse,
  JobListArgs,
  JobListResponse,
  JobNotesResponse,
  JobOpeningDetailResponse,
  PublishValidationResponse,
  SaveJobDetailsArgs,
  SaveScoringCriteriaArgs,
  ScoringCriteriaResponse,
  InterviewSequenceResponse,
  SuggestedSkillsArgs,
  SuggestedSkillsResponse,
  WizardStateResponse,
} from './types';

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    // -- draft / upload / AI-generate entry paths --------------------------
    // createJobDraft and importAtsJob deliberately removed from here — see
    // the collision note below; their real, actively-used definitions are
    // GetJobOpeningById.ts and JobOpeningSync.ts respectively.
    generateJd: build.mutation<GenerateJdResponse, string>({
      query: (prompt_text) => ({
        url: '/job-openings/generate-jd',
        method: 'POST',
        body: { prompt_text },
      }),
      invalidatesTags: ['Jobs'],
    }),

    // -- JD enhance result (read) --------------------------------------------
    // Note: JD status/edit/regenerate/enhance-trigger/review-enhancement all
    // moved to api/job-service/JobOpening/JdUpload.ts (singular directory,
    // the one every active Job Openings screen actually imports from) and
    // were deliberately removed from here — this file previously injected
    // endpoints of the *same name* (getJdStatus, editJd, regenerateJd,
    // enhanceJd, reviewJdEnhancement) with a different arg shape
    // (`{jobId, ...}` here vs `{jobOpeningId, ...}` there) into the same
    // `jobApi`. RTK Query's injectEndpoints keeps whichever definition was
    // registered first and silently drops the other, so which shape actually
    // ran depended on unrelated module import order — reviewJdEnhancement
    // losing that race is what sent `jobOpeningId` through as `jobId`
    // (undefined) and 422'd every "apply the generated description" click.
    // Only getJdEnhancementResult survives here since its name never
    // collided (JdUpload.ts's equivalent is `getJdEnhanceResult`).
    getJdEnhancementResult: build.query<JdEnhancementResultResponse, string>({
      query: (jobId) => `/job-openings/${jobId}/jd/enhance/result`,
      providesTags: (_result, _error, jobId) => [{ type: 'JobJdEnhancement', id: jobId }],
    }),

    // -- job details + skills ------------------------------------------------
    // getJobDetails removed — collided with the real one in AddJobOpening.ts.
    saveJobDetails: build.mutation<JobDetailsResponse, SaveJobDetailsArgs>({
      query: ({ jobId, ...body }) => ({
        url: `/job-openings/${jobId}/details`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { jobId }) => [
        { type: 'JobDetails', id: jobId },
        { type: 'Jobs', id: jobId },
        'Jobs',
      ],
    }),

    // -- notes -----------------------------------------------------------------
    getJobNotes: build.query<JobNotesResponse, string>({
      query: (jobId) => `/job-openings/${jobId}/notes`,
      providesTags: (_result, _error, jobId) => [{ type: 'JobNotes', id: jobId }],
    }),
    addJobNote: build.mutation<JobNotesResponse, AddJobNoteArgs>({
      query: ({ jobId, note_text }) => ({
        url: `/job-openings/${jobId}/notes`,
        method: 'POST',
        body: { note_text },
      }),
      invalidatesTags: (_result, _error, { jobId }) => [{ type: 'JobNotes', id: jobId }],
    }),
    editJobNote: build.mutation<JobNotesResponse, EditJobNoteArgs>({
      query: ({ jobId, noteId, note_text }) => ({
        url: `/job-openings/${jobId}/notes/${noteId}`,
        method: 'PUT',
        body: { note_text },
      }),
      invalidatesTags: (_result, _error, { jobId }) => [{ type: 'JobNotes', id: jobId }],
    }),
    deleteJobNote: build.mutation<void, DeleteJobNoteArgs>({
      query: ({ jobId, noteId }) => ({
        url: `/job-openings/${jobId}/notes/${noteId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { jobId }) => [{ type: 'JobNotes', id: jobId }],
    }),

    // -- suggested skills --------------------------------------------------
    getSuggestedSkills: build.query<SuggestedSkillsResponse, SuggestedSkillsArgs>({
      query: ({ jobId, ...params }) => ({
        url: `/job-openings/${jobId}/skills/suggested`,
        params,
      }),
      providesTags: (_result, _error, { jobId }) => [{ type: 'JobSuggestedSkills', id: jobId }],
    }),

    // -- scoring criteria --------------------------------------------------
    getJobScoringCriteria: build.query<ScoringCriteriaResponse, string>({
      query: (jobId) => `/job-openings/${jobId}/scoring-criteria`,
      providesTags: (_result, _error, jobId) => [{ type: 'JobScoringCriteria', id: jobId }],
    }),
    saveJobScoringCriteria: build.mutation<ScoringCriteriaResponse, SaveScoringCriteriaArgs>({
      query: ({ jobId, ...body }) => ({
        url: `/job-openings/${jobId}/scoring-criteria`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { jobId }) => [{ type: 'JobScoringCriteria', id: jobId }],
    }),
    resetJobScoringCriteria: build.mutation<ScoringCriteriaResponse, string>({
      query: (jobId) => ({ url: `/job-openings/${jobId}/scoring-criteria/reset`, method: 'POST' }),
      invalidatesTags: (_result, _error, jobId) => [{ type: 'JobScoringCriteria', id: jobId }],
    }),

    // -- interview sequence --------------------------------------------------
    // saveInterviewSequence removed — collided with the real one in
    // GetInterviewRound.ts. getInterviewSequence (read) doesn't collide,
    // kept as-is.
    getInterviewSequence: build.query<InterviewSequenceResponse, string>({
      query: (jobId) => `/job-openings/${jobId}/interview-sequence`,
      providesTags: (_result, _error, jobId) => [{ type: 'JobInterviewSequence', id: jobId }],
    }),

    // -- audio questions / question bank --------------------------------------
    // getAudioQuestions, getJobQuestions, generateJobQuestions,
    // regenerateJobQuestions, saveJobQuestions, bulkImportJobQuestions all
    // removed — every one collided with the real definitions in
    // jobQuestions.ts.

    // -- publish / close / reopen --------------------------------------------
    // publishJob, closeJob, reopenJob removed — collided with the real ones
    // in CloseJob.ts. getPublishValidation doesn't collide, kept as-is.
    getPublishValidation: build.query<PublishValidationResponse, string>({
      query: (jobId) => `/job-openings/${jobId}/publish/validate`,
      providesTags: (_result, _error, jobId) => [{ type: 'JobPublishValidation', id: jobId }],
    }),

    // -- listing / stats / counts --------------------------------------------
    // Renamed from `getJobOpenings` (was colliding with GetJobOpening.ts's
    // endpoint of the same name, which returns a different, transformed
    // response shape — `{data, total, totalElements}` there vs this one's
    // untransformed `{items, total}`). Consumers of *this* implementation
    // (CompanyMetrics/JobOpeningsListModal.tsx, OpenJobsSection.tsx) still
    // need the `{items}` shape, so rather than deleting it and risking a
    // shape mismatch, it's kept under a name that can't collide — same
    // implementation, same behavior, just no longer fighting over the same
    // registration key.
    getJobOpeningsListLegacy: build.query<JobListResponse, JobListArgs | void>({
      query: (params) => ({ url: '/job-openings', params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((item) => ({
                type: 'Jobs' as const,
                id: item.org_job_opening_id,
              })),
              'Jobs',
            ]
          : ['Jobs'],
    }),
    // getJobStats removed — collided with the real one in GetJobOpening.ts
    // (identical shape there, so its consumers were migrated to import from
    // there instead rather than kept here under a new name).
    getActiveJobCountByLocation: build.query<ActiveJobCountResponse, string>({
      query: (locationId) => ({
        url: '/job-openings/count-active-jobs-by-location',
        params: { location_id: locationId },
      }),
    }),
    getJobCountsByDepartment: build.query<JobCountsByDepartmentResponse, void>({
      query: () => '/job-openings/counts-by-department',
    }),
    getJobCountsByLocation: build.query<JobCountsByLocationResponse, void>({
      query: () => '/job-openings/counts-by-location',
    }),

    // -- full detail / wizard state ------------------------------------------
    // duplicateJobOpening and deleteJobOpening removed — both collided with
    // the real ones in GetJobOpeningById.ts.
    getJobOpeningDetail: build.query<JobOpeningDetailResponse, string>({
      query: (jobId) => `/job-openings/${jobId}`,
      providesTags: (_result, _error, jobId) => [{ type: 'Jobs', id: jobId }],
    }),
    getJobWizardState: build.query<WizardStateResponse, string>({
      query: (jobId) => `/job-openings/${jobId}/wizard-state`,
      providesTags: (_result, _error, jobId) => [{ type: 'JobWizardState', id: jobId }],
    }),
  }),
});

export const {
  useGenerateJdMutation,
  useGetJdEnhancementResultQuery,
  useLazyGetJdEnhancementResultQuery,
  useSaveJobDetailsMutation,
  useGetJobNotesQuery,
  useAddJobNoteMutation,
  useEditJobNoteMutation,
  useDeleteJobNoteMutation,
  useGetSuggestedSkillsQuery,
  useLazyGetSuggestedSkillsQuery,
  useGetJobScoringCriteriaQuery,
  useSaveJobScoringCriteriaMutation,
  useResetJobScoringCriteriaMutation,
  useGetInterviewSequenceQuery,
  useGetPublishValidationQuery,
  useLazyGetPublishValidationQuery,
  useGetJobOpeningsListLegacyQuery,
  useLazyGetJobOpeningsListLegacyQuery,
  useGetActiveJobCountByLocationQuery,
  useGetJobCountsByDepartmentQuery,
  useGetJobCountsByLocationQuery,
  useGetJobOpeningDetailQuery,
  useLazyGetJobOpeningDetailQuery,
  useGetJobWizardStateQuery,
} = extendedApi;
