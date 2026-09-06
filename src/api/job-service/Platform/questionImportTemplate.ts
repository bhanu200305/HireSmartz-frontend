import { jobApi } from '../jobApi';

// POST /platform/question-import-template — Super Admin replaces the fixed
// .xlsx/.csv bulk question-import template every tenant downloads from
// GET /master/question-import-template. One shared file, no response body.
//
// GET /platform/question-import-template — same download, just
// platform-gated so a Super Admin token can call it.
const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    uploadQuestionImportTemplate: build.mutation<void, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return { url: '/platform/question-import-template', method: 'POST', body: formData };
      },
    }),
    getPlatformQuestionImportTemplate: build.query<
      { download_url: string; expires_in: number },
      void
    >({
      query: () => '/platform/question-import-template',
    }),
  }),
});

export const {
  useUploadQuestionImportTemplateMutation,
  useLazyGetPlatformQuestionImportTemplateQuery,
} = extendedApi;
