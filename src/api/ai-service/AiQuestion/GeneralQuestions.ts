import api from '../..';
import {
  EditAiGeneralQuestionRequest,
  RegenrateAiGeneralQuestionResponse,
  ReorderAiGeneralQuestionRequest,
  SaveAiGeneralQuestionRequest,
  SaveAiGeneralQuestionResponse,
} from '../../../types';

export interface AiGeneralQuestion {
  id: number;
  question: string;
  sequence: number;
  interviewRoundId: number | null;
}

export interface GetAllAiGeneralQuestionsByJobIdResponse {
  success: boolean;
  message: string;
  data: AiGeneralQuestion[];
}

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAllAiGeneralQuestionsByJobId: build.query<
      GetAllAiGeneralQuestionsByJobIdResponse,
      { jobOpeningId: number }
    >({
      query: ({ jobOpeningId }) => ({
        url: `/ai-interview-general-questions/getAllByJobId?jobOpeningId=${jobOpeningId}`,
        method: 'GET',
      }),
    }),
    saveAiGeneralQuestion: build.mutation<
      SaveAiGeneralQuestionResponse,
      SaveAiGeneralQuestionRequest
    >({
      query: ({ jobOpeningId, interviewRoundId, ...body }) => ({
        url: `/ai-interview-general-questions/save?jobOpeningId=${jobOpeningId}&interviewRoundId=${interviewRoundId}`,
        method: 'POST',
        body,
      }),
    }),
    deleteAiGeneralQuestion: build.mutation<
      { status: boolean; message: string },
      { questionID: number; interviewRoundId: number | null }
    >({
      query: ({ questionID, interviewRoundId }) => ({
        url: `/ai-interview-general-questions/delete?questionID=${questionID}&interviewRoundId=${interviewRoundId}`,
        method: 'DELETE',
      }),
    }),
    editAiGeneralQuestion: build.mutation<
      { status: boolean; message: string },
      EditAiGeneralQuestionRequest & { questionID: number; interviewRoundId: number | null }
    >({
      query: ({ questionID, interviewRoundId, ...body }) => ({
        url: `/ai-interview-general-questions/edit?questionID=${questionID}&interviewRoundId=${interviewRoundId}`,
        method: 'PUT',
        body,
      }),
    }),
    reorderAiGeneralQuestion: build.mutation<
      { status: boolean; message: string },
      {
        jobOpeningId: number;
        interviewRoundId: number | null;
        items: { id: number; order: number }[];
      }
    >({
      query: ({ jobOpeningId, interviewRoundId, items }) => ({
        url: `/ai-interview-general-questions/reorder?jobOpeningId=${jobOpeningId}&interviewRoundId=${interviewRoundId}`,
        method: 'PUT',
        body: { items },
      }),
    }),
    generateAiGeneralQuestions: build.mutation<
      { status?: boolean; success?: boolean; message: string },
      { jobOpeningId: number; interviewRoundId: number | null; mode: 'ADD' | 'REPLACE' }
    >({
      query: ({ jobOpeningId, interviewRoundId, mode }) => ({
        url: `/ai-interview-general-questions/generate-questions?jobOpeningId=${jobOpeningId}&interviewRoundId=${interviewRoundId}&mode=${mode}`,
        method: 'POST',
      }),
    }),
    pasteAiGeneralQuestions: build.mutation<
      { success: boolean; message: string; data?: AiGeneralQuestion[] },
      { jobOpeningId: number; interviewRoundId: number | null; text: string }
    >({
      query: ({ jobOpeningId, interviewRoundId, text }) => ({
        url: `/ai-interview-general-questions/paste?jobOpeningId=${jobOpeningId}&interviewRoundId=${interviewRoundId}`,
        method: 'POST',
        body: { text },
      }),
    }),
    uploadAiGeneralQuestionsExcel: build.mutation<
      {
        success: boolean;
        message: string;
        data?: {
          uploadedFileName: string;
          importedCount: number;
          skippedRows: number;
          warnings: string[];
          questions: AiGeneralQuestion[];
        };
      },
      { file: File; jobOpeningId: number; interviewRoundId: number | null }
    >({
      query: ({ file, jobOpeningId, interviewRoundId }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('jobOpeningId', String(jobOpeningId));
        if (interviewRoundId !== null) {
          formData.append('interviewRoundId', String(interviewRoundId));
        }
        return {
          url: `/ai-interview-general-questions/upload-excel`,
          method: 'POST',
          body: formData,
        };
      },
    }),
    deleteAllAiGeneralQuestions: build.mutation<
      { success: boolean; message: string },
      { jobOpeningId: number; interviewRoundId: number | null }
    >({
      query: ({ jobOpeningId, interviewRoundId }) => ({
        url: `/ai-interview-general-questions/delete-all?jobOpeningId=${jobOpeningId}&interviewRoundId=${interviewRoundId}`,
        method: 'DELETE',
      }),
    }),
    downloadAiGeneralQuestionsTemplate: build.mutation<Blob, void>({
      query: () => ({
        url: `/ai-interview-general-questions/download-template`,
        method: 'GET',
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAllAiGeneralQuestionsByJobIdQuery,
  useSaveAiGeneralQuestionMutation,
  useDeleteAiGeneralQuestionMutation,
  useEditAiGeneralQuestionMutation,
  useReorderAiGeneralQuestionMutation,
  useGenerateAiGeneralQuestionsMutation,
  usePasteAiGeneralQuestionsMutation,
  useUploadAiGeneralQuestionsExcelMutation,
  useDeleteAllAiGeneralQuestionsMutation,
  useDownloadAiGeneralQuestionsTemplateMutation,
} = extendedApi;
