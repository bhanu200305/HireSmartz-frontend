import { orgApi } from '../orgApi';
import { LOCALSTORAGE_KEYS } from '../../../constants/webAPI';
import { getLocalStorageItem } from '../../../shared/utils/auth/localstorage.helpers';
import type {
  ConfirmRosterImportArgs,
  ConfirmRosterImportResponse,
  ParseRosterArgs,
  ParseRosterResponse,
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
  }),
});

export const {
  useUploadPlatformRosterFileMutation,
  useParsePlatformRosterMutation,
  useConfirmPlatformRosterImportMutation,
} = extendedApi;

/** Platform mirror of downloadRosterTemplate (Tenants/imports.ts) — same raw
 * .xlsx FileResponse, authenticated manual fetch for the same reason. */
export const downloadPlatformRosterTemplate = async (tenantId: string): Promise<void> => {
  const baseUrl = import.meta.env.VITE_ORG_SERVICE_ENDPOINT as string;
  const token = getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) as string | null;

  const response = await fetch(
    `${baseUrl}/v1/platform/tenants/${tenantId}/users/bulk-import/template`,
    { headers: token ? { authorization: `Bearer ${token}` } : undefined }
  );
  if (!response.ok) {
    throw new Error(`Template download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = 'roster_import_template.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};
