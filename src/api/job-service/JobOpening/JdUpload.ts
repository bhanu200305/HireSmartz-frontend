import { api } from '../../index';

export type JdUploadResponse = {
  success?: boolean;
  status?: boolean | string;
  message?: string;
  batchId?: number;
  data?: {
    batchId?: number;
    id?: number;
    batch?: {
      id?: number;
      batchId?: number;
    };
    jobOpeningId?: number;
    aiJobDescriptionId?: number;
    totalFiles?: number;
    acceptedFiles?: number;
    rejectedFiles?: number;
    createdDraftJobs?: number;
    failedJobs?: number;
    partialFailure?: boolean;
  };
};

const buildJdUploadFormData = (files: File[]): FormData => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  return formData;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    uploadSingleJd: build.mutation<JdUploadResponse, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: '/job-opening/jd-upload/single',
          method: 'POST',
          body: formData,
        };
      },
    }),
    uploadBulkJd: build.mutation<JdUploadResponse, File[]>({
      query: (files) => ({
        url: '/job-opening/jd-upload/bulk',
        method: 'POST',
        body: buildJdUploadFormData(files),
      }),
    }),
  }),
});

export const { useUploadSingleJdMutation, useUploadBulkJdMutation } = extendedApi;
