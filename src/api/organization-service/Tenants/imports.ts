import { api } from '../../index';

export type UploadImportResponse = {
  batch_id: string;
  detected_departments: number;
  detected_users: number;
  warnings: string[];
};

export type UploadImportRequest = {
  tenantId: string;
  file: File;
};

export type ImportRow = Record<string, string>;

export type ConfirmImportRequest = {
  tenantId: string;
  batchId: string;
  confirmed_rows: ImportRow[];
};

export type ConfirmImportResponse = {
  invitations_sent: number;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    uploadTenantImport: build.mutation<UploadImportResponse, UploadImportRequest>({
      query: ({ tenantId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/v1/tenants/${tenantId}/imports`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['ImportBatch'],
    }),
    confirmTenantImport: build.mutation<ConfirmImportResponse, ConfirmImportRequest>({
      query: ({ tenantId, batchId, confirmed_rows }) => ({
        url: `/v1/tenants/${tenantId}/imports/${batchId}/confirm`,
        method: 'POST',
        body: { confirmed_rows },
      }),
      invalidatesTags: ['ImportBatch', 'TenantInvitations'],
    }),
  }),
});

export const { useUploadTenantImportMutation, useConfirmTenantImportMutation } = extendedApi;
