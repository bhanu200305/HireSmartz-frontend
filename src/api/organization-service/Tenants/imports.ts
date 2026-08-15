import { orgApi } from '../orgApi';
import { LOCALSTORAGE_KEYS } from '../../../constants/webAPI';
import { getLocalStorageItem } from '../../../shared/utils/auth/localstorage.helpers';

// Real 3-step roster import flow — bulk_import_dto.py. The previous version
// of this file POSTed a FormData file straight to organization-service at an
// endpoint that doesn't exist; the actual contract is upload-url -> (direct
// browser upload to S3) -> parse -> confirm, matching docs/frontend_guide.txt's
// "Three steps" description exactly.

export type RequestRosterUploadArgs = {
  tenantId: string;
  filename: string;
  content_type: string;
};

export type RosterUploadTarget = {
  upload_url: string;
  /** Extra multipart fields the presigned POST requires, alongside `file`. */
  upload_fields: Record<string, string>;
  storage_key: string;
  expires_in: number;
};

export type ParseRosterArgs = {
  tenantId: string;
  storage_key: string;
};

export type ParsedRosterRow = {
  row_number: number;
  name: string;
  email: string;
  department: string | null;
  designation: string | null;
  role: string | null;
  location: string | null;
};

export type ParseRosterResponse = {
  rows: ParsedRosterRow[];
};

// The 4 roles a bulk-import row may invite as — same set as the single
// invite form (Tenants/users.ts's TenantUserRole), minus company_admin's
// counterpart being invited THROUGH this flow being just as valid as any
// other: organization-service validates all 4 identically here.
export type RosterRole = 'company_admin' | 'hiring_manager' | 'recruiter' | 'interviewer';

export type ConfirmRosterRow = {
  email: string;
  role: RosterRole;
  department?: string | null;
  designation?: string | null;
  /** Free text — must match an existing office's city exactly (see
   * OfficeRepository.get_by_city on the backend). Not auto-created: an
   * unrecognised value is reported back in `skipped_unknown_location_emails`,
   * not silently dropped or invented. */
  location?: string | null;
};

export type ConfirmRosterImportArgs = {
  tenantId: string;
  rows: ConfirmRosterRow[];
};

export type ConfirmRosterImportResponse = {
  created_count: number;
  invitation_ids: string[];
  skipped_duplicate_emails: string[];
  previously_suppressed_emails: string[];
  skipped_unknown_location_emails: string[];
};

/**
 * Uploads the file directly to storage using the presigned POST from
 * `requestRosterUpload` — the bytes never pass through organization-service,
 * so this is a plain `fetch` against `upload_url` (an arbitrary S3 origin),
 * not an orgApi endpoint. `upload_fields` must be appended before `file`,
 * the order S3's presigned-POST contract requires.
 */
export const uploadRosterFile = async (target: RosterUploadTarget, file: File): Promise<void> => {
  const formData = new FormData();
  Object.entries(target.upload_fields).forEach(([key, value]) => formData.append(key, value));
  formData.append('file', file);

  const response = await fetch(target.upload_url, { method: 'POST', body: formData });
  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    requestRosterUpload: build.mutation<RosterUploadTarget, RequestRosterUploadArgs>({
      query: ({ tenantId, ...body }) => ({
        url: `/v1/tenants/${tenantId}/users/bulk-import/upload-url`,
        method: 'POST',
        body,
      }),
    }),
    parseRoster: build.mutation<ParseRosterResponse, ParseRosterArgs>({
      query: ({ tenantId, storage_key }) => ({
        url: `/v1/tenants/${tenantId}/users/bulk-import/parse`,
        method: 'POST',
        body: { storage_key },
      }),
    }),
    confirmRosterImport: build.mutation<ConfirmRosterImportResponse, ConfirmRosterImportArgs>({
      query: ({ tenantId, rows }) => ({
        url: `/v1/tenants/${tenantId}/users/bulk-import/confirm`,
        method: 'POST',
        body: { rows },
      }),
      invalidatesTags: ['TenantInvitations'],
    }),
  }),
});

export const {
  useRequestRosterUploadMutation,
  useParseRosterMutation,
  useConfirmRosterImportMutation,
} = extendedApi;

/**
 * GET .../bulk-import/template — a raw .xlsx `FileResponse`, not JSON, so it
 * can't go through RTK Query's default JSON parsing. It's also an
 * authenticated route (`require_permission(INVITATION_WRITE)`), so a plain
 * `<a href>` won't carry the bearer token — this fetches it manually and
 * triggers the browser download via a short-lived object URL.
 */
export const downloadRosterTemplate = async (tenantId: string): Promise<void> => {
  const baseUrl = import.meta.env.VITE_ORG_SERVICE_ENDPOINT as string;
  const token = getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) as string | null;

  const response = await fetch(`${baseUrl}/v1/tenants/${tenantId}/users/bulk-import/template`, {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
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
