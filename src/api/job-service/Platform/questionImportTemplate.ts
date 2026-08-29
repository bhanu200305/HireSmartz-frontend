import { jobApi } from '../jobApi';

// POST /platform/question-import-template — Super Admin replaces the fixed
// .xlsx bulk question-import template every tenant downloads from
// GET /master/question-import-template (see JobOpening/jobQuestions.ts's
// useLazyGetQuestionImportTemplateQuery) and uploads back through
// bulkImportJobQuestions. One shared file, not per-tenant — no response body.
const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    uploadQuestionImportTemplate: build.mutation<void, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return { url: '/platform/question-import-template', method: 'POST', body: formData };
      },
    }),
  }),
});

export const { useUploadQuestionImportTemplateMutation } = extendedApi;
