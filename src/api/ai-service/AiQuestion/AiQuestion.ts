import api from '../..';
import { jobApi } from '../../job-service/jobApi';
import {
  EditAiQuestionRequest,
  SaveAiQuestionRequest,
  SaveAiQuestionResponse,
  EditAiQuestionForScoringResponse,
  EditAiQuestionForScoringRequest,
  SaveScoreResponse,
  SaveScoreRequest,
  SaveFeedbackRequest,
  SaveFeedbackResponse,
  OrgUser,
  GetAiQuestionsByUserIdResponse,
} from '../../../types';

export type TopFivePromptResponse = {
  promptText: string;
}[];

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    saveAiQuestion: build.mutation<SaveAiQuestionResponse, SaveAiQuestionRequest>({
      query: ({ JobOpeningId, ...body }) => ({
        url: `/ai-interview-questions/save?JobOpeningId=${JobOpeningId}`,
        method: 'POST',
        body,
      }),
    }),
    deleteAiQuestion: build.mutation<{ status: boolean; message: string }, number>({
      query: (questionID) => ({
        url: `/ai-interview-questions/delete?questionID=${questionID}`,
        method: 'DELETE',
      }),
    }),
    editAiQuestion: build.mutation<
      { status: boolean; message: string },
      EditAiQuestionRequest & { questionID: number }
    >({
      query: ({ questionID, ...body }) => ({
        url: `/ai-interview-questions/edit?questionID=${questionID}`,
        method: 'PUT',
        body,
      }),
    }),
    editAiQuestionForScoring: build.mutation<
      EditAiQuestionForScoringResponse,
      EditAiQuestionForScoringRequest
    >({
      query: (body) => ({
        url: `/ai-interview-questions/edit-for-scoring`,
        method: 'PUT',
        body,
      }),
    }),
    saveScore: build.mutation<SaveScoreResponse, SaveScoreRequest>({
      query: ({ candidateId, interviewRoundId, score }) => ({
        url: `ai-interview-questions/save-score?candidateId=${candidateId}&interviewRoundId=${interviewRoundId}`,
        method: 'PUT',
        body: { score },
      }),
    }),
    saveFeedback: build.mutation<SaveFeedbackResponse, SaveFeedbackRequest>({
      query: ({ candidateId, interviewRoundId, feedback }) => ({
        url: `ai-interview-questions/save-feedback?candidateId=${candidateId}&interviewRoundId=${interviewRoundId}`,
        method: 'PUT',
        body: { feedback },
      }),
    }),
    getOrgUsersByCompanyId: build.query<OrgUser[], void>({
      query: () => {
        const token = localStorage.getItem('token');
        return {
          url: `/orguserservice/org/user/findByCompanyId`,
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),
    getAiQuestionsByUserId: build.query<
      GetAiQuestionsByUserIdResponse,
      {
        userId: number;
        jobOpeningId: string | number;
        interviewRoundId?: number;
        candidateId: number;
      }
    >({
      query: ({ userId, jobOpeningId, interviewRoundId, candidateId }) => ({
        url: `/ai-interview-questions/getByUserID?userId=${userId}&jobOpeningId=${jobOpeningId}&interviewRoundId=${interviewRoundId}&candidateId=${candidateId}`,
        method: 'GET',
      }),
    }),
  }),
  overrideExisting: false,
});

// getTopFivePrompt is a job-service endpoint, so it uses jobApi, not the
// shared `api` above.
const jobPromptsApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getTopFivePrompt: build.query<TopFivePromptResponse, void>({
      query: () => ({
        url: `/ai/prompts/top-five/by-user`,
        method: 'GET',
      }),
      transformResponse: (response: {
        prompts?: { prompt_text: string }[];
      }): TopFivePromptResponse =>
        (response.prompts ?? []).map((prompt) => ({ promptText: prompt.prompt_text })),
    }),
  }),
  overrideExisting: false,
});

export const {
  useSaveAiQuestionMutation,
  useDeleteAiQuestionMutation,
  useEditAiQuestionMutation,
  useEditAiQuestionForScoringMutation,
  useSaveScoreMutation,
  useSaveFeedbackMutation,
  useGetOrgUsersByCompanyIdQuery,
  useGetAiQuestionsByUserIdQuery,
  useLazyGetAiQuestionsByUserIdQuery,
} = extendedApi;

export const { useGetTopFivePromptQuery } = jobPromptsApi;
