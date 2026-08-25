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
  // bulk_import_dto.py's ParsedRosterRowView — the parse step returns
  // `contact`, not a location. There is no location concept anywhere in the
  // real bulk-import contract; see RosterRole/ConfirmRosterRow below.
  contact: string | null;
};

export type ParseRosterResponse = {
  rows: ParsedRosterRow[];
};

// RosterRowRequest.role is free text on the backend (api/requests.py) — NOT
// restricted to the single-invite form's fixed hiring_manager/recruiter
// TenantUserRole literal. It's validated per-row at confirm time against the
// tenant's own role catalog (GET /v1/roles); an unmatched name doesn't 422
// the whole batch any more, it comes back as a per-row entry in `failures`
// below instead.
export type RosterRole = string;

export type ConfirmRosterRow = {
  email: string;
  role: RosterRole;
  department?: string | null;
  designation?: string | null;
  contact?: string | null;
};

export type ConfirmRosterImportArgs = {
  tenantId: string;
  rows: ConfirmRosterRow[];
};

export type RosterRowFailure = {
  row_number: number;
  email: string;
  reason: string;
};

export type ConfirmRosterImportResponse = {
  created_count: number;
  invitation_ids: string[];
  skipped_duplicate_emails: string[];
  previously_suppressed_emails: string[];
  // bulk_import_dto.py's ConfirmRosterImportView.failures — rows that didn't
  // become an invitation for a reason other than "already invited" (most
  // commonly: role name doesn't match anything in this tenant's catalog).
  // Defaults to [] on the backend, but treat it as possibly absent here too
  // for older cached responses.
  failures?: RosterRowFailure[];
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
