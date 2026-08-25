import { jobApi } from '../jobApi';
import type {
  ActiveJobCountResponse,
  AddJobNoteArgs,
  AudioQuestionsResponse,
  BulkImportQuestionsArgs,
  BulkImportQuestionsResponse,
  CloseJobArgs,
  CloseJobResponse,
  CreateDraftResponse,
  DeleteJobNoteArgs,
  DuplicateJobResponse,
  EditJdResponse,
  EditJobNoteArgs,
  EnhanceJdResponse,
  GenerateJdResponse,
  GenerateQuestionsArgs,
  GenerateQuestionsResponse,
  ImportAtsJobArgs,
  ImportAtsJobResponse,
  JdBulkUploadResponse,
  JdEnhancementResultResponse,
  JdStatusResponse,
  JdUploadBatchSummaryResponse,
  JobCountsByDepartmentResponse,
  JobCountsByLocationResponse,
  JobDetailsResponse,
  JobListArgs,
  JobListResponse,
  JobNotesResponse,
  JobOpeningDetailResponse,
  JobStatsResponse,
  PublishJobResponse,
  PublishValidationResponse,
  QuestionsResponse,
  RegenerateJdResponse,
  RegenerateQuestionsArgs,
  RegenerateQuestionsResponse,
  ReopenJobResponse,
  ReviewJdEnhancementArgs,
  ReviewJdEnhancementResponse,
  SaveInterviewSequenceArgs,
  SaveJobDetailsArgs,
  SaveQuestionsArgs,
  SaveScoringCriteriaArgs,
  ScoringCriteriaResponse,
  InterviewSequenceResponse,
  SuggestedSkillsArgs,
  SuggestedSkillsResponse,
  UploadJdResponse,
  WizardStateResponse,
} from './types';

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    // -- draft / upload / AI-generate entry paths --------------------------
    createJobDraft: build.mutation<CreateDraftResponse, void>({
      query: () => ({
        url: '/job-openings/draft',
        method: 'POST',
        body: { entry_path: 'MANUAL' },
      }),
      invalidatesTags: ['Jobs'],
    }),
    uploadSingleJd: build.mutation<UploadJdResponse, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return { url: '/job-openings/upload-jd', method: 'POST', body: formData };
      },
      invalidatesTags: ['Jobs'],
    }),
    uploadBulkJd: build.mutation<JdBulkUploadResponse, File[]>({
      query: (files) => {
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));
        return { url: '/job-openings/upload-jd/bulk', method: 'POST', body: formData };
      },
      invalidatesTags: ['Jobs'],
    }),
    getJdUploadBatchSummary: build.query<JdUploadBatchSummaryResponse, string>({
      query: (batchId) => `/job-openings/upload-jd/batch/${batchId}/summary`,
      providesTags: (_result, _error, batchId) => [{ type: 'JobBatches', id: batchId }],
    }),
    importAtsJob: build.mutation<ImportAtsJobResponse, ImportAtsJobArgs>({
      query: (body) => ({ url: '/job-openings/import-ats', method: 'POST', body }),
      invalidatesTags: ['Jobs'],
    }),
    generateJd: build.mutation<GenerateJdResponse, string>({
      query: (prompt_text) => ({
        url: '/job-openings/generate-jd',
        method: 'POST',
        body: { prompt_text },
      }),
      invalidatesTags: ['Jobs'],
    }),

    // -- JD status / edit / regenerate / enhance ---------------------------
    getJdStatus: build.query<JdStatusResponse, string>({
      query: (jobId) => `/job-openings/${jobId}/jd/status`,
      providesTags: (_result, _error, jobId) => [{ type: 'JobJdStatus', id: jobId }],
    }),
    editJd: build.mutation<EditJdResponse, { jobId: string; jd: string }>({
      query: ({ jobId, jd }) => ({
        url: `/job-openings/${jobId}/jd`,
        method: 'PUT',
        body: { jd },
      }),
      invalidatesTags: (_result, _error, { jobId }) => [
        { type: 'JobDetails', id: jobId },
        { type: 'Jobs', id: jobId },
      ],
    }),
    regenerateJd: build.mutation<RegenerateJdResponse, { jobId: string; prompt_text: string }>({
      query: ({ jobId, prompt_text }) => ({
        url: `/job-openings/${jobId}/jd/regenerate`,
        method: 'POST',
        body: { prompt_text },
      }),
      invalidatesTags: (_result, _error, { jobId }) => [{ type: 'JobJdStatus', id: jobId }],
    }),
    enhanceJd: build.mutation<EnhanceJdResponse, string>({
      query: (jobId) => ({ url: `/job-openings/${jobId}/jd/enhance`, method: 'POST' }),
      invalidatesTags: (_result, _error, jobId) => [{ type: 'JobJdEnhancement', id: jobId }],
    }),
    getJdEnhancementResult: build.query<JdEnhancementResultResponse, string>({
      query: (jobId) => `/job-openings/${jobId}/jd/enhance/result`,
      providesTags: (_result, _error, jobId) => [{ type: 'JobJdEnhancement', id: jobId }],
    }),
    reviewJdEnhancement: build.mutation<ReviewJdEnhancementResponse, ReviewJdEnhancementArgs>({
      query: ({ jobId, ...body }) => ({
        url: `/job-openings/${jobId}/jd/enhance/review`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { jobId }) => [
        { type: 'JobDetails', id: jobId },
        { type: 'JobJdEnhancement', id: jobId },
      ],
    }),

    // -- job details + skills ------------------------------------------------
    getJobDetails: build.query<JobDetailsResponse, string>({
      query: (jobId) => `/job-openings/${jobId}/details`,
      providesTags: (_result, _error, jobId) => [{ type: 'JobDetails', id: jobId }],
    }),
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
    getInterviewSequence: build.query<InterviewSequenceResponse, string>({
      query: (jobId) => `/job-openings/${jobId}/interview-sequence`,
      providesTags: (_result, _error, jobId) => [{ type: 'JobInterviewSequence', id: jobId }],
    }),
    saveInterviewSequence: build.mutation<InterviewSequenceResponse, SaveInterviewSequenceArgs>({
      query: ({ jobId, rounds }) => ({
        url: `/job-openings/${jobId}/interview-sequence`,
        method: 'PUT',
        body: { rounds },
      }),
      invalidatesTags: (_result, _error, { jobId }) => [
        { type: 'JobInterviewSequence', id: jobId },
        { type: 'JobQuestions', id: jobId },
      ],
    }),

    // -- audio questions (view-only) + question bank -------------------------
    getAudioQuestions: build.query<AudioQuestionsResponse, string>({
      query: (jobId) => `/job-openings/${jobId}/audio-questions`,
      providesTags: (_result, _error, jobId) => [{ type: 'JobAudioQuestions', id: jobId }],
    }),
    getJobQuestions: build.query<QuestionsResponse, string>({
      query: (jobId) => `/job-openings/${jobId}/questions`,
      providesTags: (_result, _error, jobId) => [{ type: 'JobQuestions', id: jobId }],
    }),
    generateJobQuestions: build.mutation<GenerateQuestionsResponse, GenerateQuestionsArgs>({
      query: ({ jobId, question_count }) => ({
        url: `/job-openings/${jobId}/questions/generate`,
        method: 'POST',
        body: { question_count },
      }),
      invalidatesTags: (_result, _error, { jobId }) => [{ type: 'JobQuestions', id: jobId }],
    }),
    regenerateJobQuestions: build.mutation<RegenerateQuestionsResponse, RegenerateQuestionsArgs>({
      query: ({ jobId, ...body }) => ({
        url: `/job-openings/${jobId}/questions/regenerate`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { jobId }) => [{ type: 'JobQuestions', id: jobId }],
    }),
    saveJobQuestions: build.mutation<QuestionsResponse, SaveQuestionsArgs>({
      query: ({ jobId, questions }) => ({
        url: `/job-openings/${jobId}/questions`,
        method: 'PUT',
        body: { questions },
      }),
      invalidatesTags: (_result, _error, { jobId }) => [{ type: 'JobQuestions', id: jobId }],
    }),
    bulkImportJobQuestions: build.mutation<BulkImportQuestionsResponse, BulkImportQuestionsArgs>({
      query: ({ jobId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/job-openings/${jobId}/questions/bulk-import`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { jobId }) => [{ type: 'JobQuestions', id: jobId }],
    }),

    // -- publish / close / reopen --------------------------------------------
    getPublishValidation: build.query<PublishValidationResponse, string>({
      query: (jobId) => `/job-openings/${jobId}/publish/validate`,
      providesTags: (_result, _error, jobId) => [{ type: 'JobPublishValidation', id: jobId }],
    }),
    publishJob: build.mutation<PublishJobResponse, string>({
      query: (jobId) => ({ url: `/job-openings/${jobId}/publish`, method: 'POST' }),
      invalidatesTags: (_result, _error, jobId) => [{ type: 'Jobs', id: jobId }, 'Jobs'],
    }),
    closeJob: build.mutation<CloseJobResponse, CloseJobArgs>({
      query: ({ jobId, ...body }) => ({
        url: `/job-openings/${jobId}/close`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { jobId }) => [{ type: 'Jobs', id: jobId }, 'Jobs'],
    }),
    reopenJob: build.mutation<ReopenJobResponse, string>({
      query: (jobId) => ({ url: `/job-openings/${jobId}/reopen`, method: 'POST' }),
      invalidatesTags: (_result, _error, jobId) => [{ type: 'Jobs', id: jobId }, 'Jobs'],
    }),

    // -- listing / stats / counts --------------------------------------------
    getJobOpenings: build.query<JobListResponse, JobListArgs | void>({
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
    getJobStats: build.query<JobStatsResponse, void>({
      query: () => '/job-openings/stats',
      providesTags: ['Jobs'],
    }),
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

    // -- full detail / wizard state / duplicate / delete ----------------------
    getJobOpeningDetail: build.query<JobOpeningDetailResponse, string>({
      query: (jobId) => `/job-openings/${jobId}`,
      providesTags: (_result, _error, jobId) => [{ type: 'Jobs', id: jobId }],
    }),
    getJobWizardState: build.query<WizardStateResponse, string>({
      query: (jobId) => `/job-openings/${jobId}/wizard-state`,
      providesTags: (_result, _error, jobId) => [{ type: 'JobWizardState', id: jobId }],
    }),
    duplicateJobOpening: build.mutation<DuplicateJobResponse, string>({
      query: (jobId) => ({ url: `/job-openings/${jobId}/duplicate`, method: 'POST' }),
      invalidatesTags: ['Jobs'],
    }),
    deleteJobOpening: build.mutation<void, string>({
      query: (jobId) => ({ url: `/job-openings/${jobId}`, method: 'DELETE' }),
      invalidatesTags: ['Jobs'],
    }),
  }),
});

export const {
  useCreateJobDraftMutation,
  useUploadSingleJdMutation,
  useUploadBulkJdMutation,
  useGetJdUploadBatchSummaryQuery,
  useImportAtsJobMutation,
  useGenerateJdMutation,
  useGetJdStatusQuery,
  useLazyGetJdStatusQuery,
  useEditJdMutation,
  useRegenerateJdMutation,
  useEnhanceJdMutation,
  useGetJdEnhancementResultQuery,
  useLazyGetJdEnhancementResultQuery,
  useReviewJdEnhancementMutation,
  useGetJobDetailsQuery,
  useLazyGetJobDetailsQuery,
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
  useSaveInterviewSequenceMutation,
  useGetAudioQuestionsQuery,
  useGetJobQuestionsQuery,
  useGenerateJobQuestionsMutation,
  useRegenerateJobQuestionsMutation,
  useSaveJobQuestionsMutation,
  useBulkImportJobQuestionsMutation,
  useGetPublishValidationQuery,
  useLazyGetPublishValidationQuery,
  usePublishJobMutation,
  useCloseJobMutation,
  useReopenJobMutation,
  useGetJobOpeningsQuery,
  useLazyGetJobOpeningsQuery,
  useGetJobStatsQuery,
  useGetActiveJobCountByLocationQuery,
  useGetJobCountsByDepartmentQuery,
  useGetJobCountsByLocationQuery,
  useGetJobOpeningDetailQuery,
  useLazyGetJobOpeningDetailQuery,
  useGetJobWizardStateQuery,
  useDuplicateJobOpeningMutation,
  useDeleteJobOpeningMutation,
} = extendedApi;
