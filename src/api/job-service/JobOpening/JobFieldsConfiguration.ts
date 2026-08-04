import api from '../..';

type DownloadTemplateParams = {
  type: string;
};

type DownloadSampleParams = {
  type: string;
};

type UploadJobOpeningParams = {
  dropdownName: string;
  file: File;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    downloadTemplateExcel: build.query<Blob, DownloadTemplateParams>({
      query: ({ type }) => ({
        url: `/job-opening/downloadTemplateExcel/${type}`,
        method: 'GET',
        responseHandler: (response) => response.blob(),
      }),
    }),
    downloadSampleExcel: build.query<Blob, DownloadSampleParams>({
      query: ({ type }) => ({
        url: `/job-opening/previewSampleExcel/${type}`,
        method: 'GET',
        responseHandler: (response) => response.blob(),
      }),
    }),
    uploadJobOpeningFile: build.mutation<any, UploadJobOpeningParams>({
      query: ({ dropdownName, file }) => {
        const formData = new FormData();
        formData.append('file', file);

        return {
          url: `/job-opening/upload?dropdownName=${dropdownName}`,
          method: 'POST',
          body: formData,
        };
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useLazyDownloadTemplateExcelQuery,
  useLazyDownloadSampleExcelQuery,
  useUploadJobOpeningFileMutation,
} = extendedApi;
