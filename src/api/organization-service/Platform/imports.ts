import { orgApi } from '../orgApi';
import type {
  ConfirmRosterImportArgs,
  ConfirmRosterImportResponse,
  ParseRosterArgs,
  ParseRosterResponse,
  RosterImportTemplateResponse,
  UploadRosterFileArgs,
  RosterUploadResult,
} from '../Tenants/imports';

// Platform mirror of Tenants/imports.ts's real 3-step roster import flow —
// same server-mediated upload (multipart POST straight to
// organization-service, no browser-direct-to-S3 step) -> parse -> confirm
// contract and DTOs, just mounted under /v1/platform/tenants/{tenant_id}/...
// (platform_router.py) so a Super Admin can run it on behalf of any tenant,
// same pattern as Platform/tenantProfile.ts mirroring Tenants/profile.ts.

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    uploadPlatformRosterFile: build.mutation<RosterUploadResult, UploadRosterFileArgs>({
      query: ({ tenantId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/v1/platform/tenants/${tenantId}/users/bulk-import/upload`,
          method: 'POST',
          body: formData,
        };
      },
    }),
    parsePlatformRoster: build.mutation<ParseRosterResponse, ParseRosterArgs>({
      query: ({ tenantId, storage_key }) => ({
        url: `/v1/platform/tenants/${tenantId}/users/bulk-import/parse`,
        method: 'POST',
        body: { storage_key },
      }),
    }),
    confirmPlatformRosterImport: build.mutation<
      ConfirmRosterImportResponse,
      ConfirmRosterImportArgs
    >({
      query: ({ tenantId, rows }) => ({
        url: `/v1/platform/tenants/${tenantId}/users/bulk-import/confirm`,
        method: 'POST',
        body: { rows },
      }),
      invalidatesTags: ['TenantInvitations'],
    }),
    getPlatformRosterImportTemplateUrl: build.query<RosterImportTemplateResponse, string>({
      query: (tenantId) => `/v1/platform/tenants/${tenantId}/users/bulk-import/template`,
    }),
  }),
});

export const {
  useUploadPlatformRosterFileMutation,
  useParsePlatformRosterMutation,
  useConfirmPlatformRosterImportMutation,
  useLazyGetPlatformRosterImportTemplateUrlQuery,
} = extendedApi;

// downloadRosterTemplate (Tenants/imports.ts) is reused as-is for the
// platform path too — by the time it runs it's just fetching a presigned S3
// URL, which carries its own auth regardless of which route asked
// organization-service for it.
export { downloadRosterTemplate as downloadPlatformRosterTemplate } from '../Tenants/imports';
