import api from '../..';
import { GetAiInterviewQuestionsByRoundResponse } from '../../../types';

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAiInterviewQuestionsByRound: build.query<
      GetAiInterviewQuestionsByRoundResponse,
      { interviewRoundId: string | number; jobOpeningId: string | number }
    >({
      query: ({ interviewRoundId, jobOpeningId }) => ({
        url: `/ai-interview-questions/getAllByRoundID?interviewRoundId=${interviewRoundId}&jobOpeningId=${jobOpeningId}`,
        method: 'GET',
      }),
    }),
    saveAiInterviewQuestion: build.mutation<
      { status: boolean; message: string },
      { JobOpeningId: number; interviewRoundId: number; categoryId: number; question: string }
    >({
      query: ({ JobOpeningId, interviewRoundId, categoryId, question }) => ({
        url: `/ai-interview-questions/save?JobOpeningId=${JobOpeningId}&interviewRoundId=${interviewRoundId}`,
        method: 'POST',
        body: {
          categoryId,
          question,
        },
      }),
    }),
    deleteAiInterviewQuestion: build.mutation<
      { status: boolean; message: string },
      { questionID: number; interviewRoundId: number }
    >({
      query: ({ questionID, interviewRoundId }) => ({
        url: `/ai-interview-questions/delete?questionID=${questionID}&interviewRoundId=${interviewRoundId}`,
        method: 'DELETE',
      }),
    }),
    editAiInterviewQuestion: build.mutation<
      { status: boolean; message: string },
      {
        questionID: number;
        interviewRoundId: number;
        categoryId?: string | number;
        question?: string;
      }
    >({
      query: ({ questionID, interviewRoundId, ...body }) => ({
        url: `/ai-interview-questions/edit?questionID=${questionID}&interviewRoundId=${interviewRoundId}`,
        method: 'PUT',
        body,
      }),
    }),
    reorderVideoInterviewQuestions: build.mutation<
      { status: boolean; message: string },
      {
        jobOpeningId: number;
        interviewRoundId: number;
        categoryId: number;
        items: { id: number; order: number }[];
      }
    >({
      query: ({ jobOpeningId, interviewRoundId, categoryId, items }) => ({
        url: `/ai-interview-questions/reorder?jobOpeningId=${jobOpeningId}&interviewRoundId=${interviewRoundId}&categoryId=${categoryId}`,
        method: 'PUT',
        body: { items },
      }),
    }),
    generateVideoInterviewQuestions: build.mutation<
      { status?: boolean; success?: boolean; message: string },
      {
        jobOpeningId: number;
        interviewRoundId: number;
        aiJobDescriptionId?: number;
        mode: 'ADD' | 'REPLACE';
      }
    >({
      query: ({ jobOpeningId, interviewRoundId, aiJobDescriptionId, mode }) => ({
        url: `/ai-interview-questions/generate-questions?jobOpeningId=${jobOpeningId}&interviewRoundId=${interviewRoundId}&mode=${mode}${aiJobDescriptionId ? `&aiJobDescriptionId=${aiJobDescriptionId}` : ''}`,
        method: 'POST',
      }),
    }),
    pasteVideoInterviewQuestions: build.mutation<
      { success: boolean; message: string; data?: any[] },
      { jobOpeningId: number; interviewRoundId: number; categoryId: number; text: string }
    >({
      query: ({ jobOpeningId, interviewRoundId, categoryId, text }) => ({
        url: `/ai-interview-questions/paste?jobOpeningId=${jobOpeningId}&interviewRoundId=${interviewRoundId}&categoryId=${categoryId}`,
        method: 'POST',
        body: { text },
      }),
    }),
    uploadVideoInterviewQuestionsExcel: build.mutation<
      {
        success: boolean;
        message: string;
        data?: {
          uploadedFileName: string;
          importedCount: number;
          skippedRows: number;
          warnings: string[];
          questions: any[];
        };
      },
      { file: File; jobOpeningId: number; interviewRoundId: number }
    >({
      query: ({ file, jobOpeningId, interviewRoundId }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('jobOpeningId', String(jobOpeningId));
        formData.append('interviewRoundId', String(interviewRoundId));
        return {
          url: `/ai-interview-questions/upload-excel`,
          method: 'POST',
          body: formData,
        };
      },
    }),
    deleteAllVideoInterviewQuestions: build.mutation<
      { success: boolean; message: string },
      { jobOpeningId: number; interviewRoundId: number; categoryId: number }
    >({
      query: ({ jobOpeningId, interviewRoundId, categoryId }) => ({
        url: `/ai-interview-questions/delete-all?jobOpeningId=${jobOpeningId}&interviewRoundId=${interviewRoundId}&categoryId=${categoryId}`,
        method: 'DELETE',
      }),
    }),
    downloadVideoInterviewQuestionsTemplate: build.mutation<Blob, void>({
      query: () => ({
        url: `/ai-interview-questions/download-template`,
        method: 'GET',
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAiInterviewQuestionsByRoundQuery,
  useLazyGetAiInterviewQuestionsByRoundQuery,
  useSaveAiInterviewQuestionMutation,
  useDeleteAiInterviewQuestionMutation,
  useEditAiInterviewQuestionMutation,
  useReorderVideoInterviewQuestionsMutation,
  useGenerateVideoInterviewQuestionsMutation,
  usePasteVideoInterviewQuestionsMutation,
  useUploadVideoInterviewQuestionsExcelMutation,
  useDeleteAllVideoInterviewQuestionsMutation,
  useDownloadVideoInterviewQuestionsTemplateMutation,
} = extendedApi;
