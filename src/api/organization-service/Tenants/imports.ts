import { orgApi } from '../orgApi';

// Real 3-step roster import flow — bulk_import_dto.py. Upload is
// server-mediated: the browser POSTs the file straight to
// organization-service as normal multipart form data, and this service
// writes it to S3 itself (`RequestRosterUploadUseCase`/`StoragePort.put()`).
// This used to be a presigned-POST the browser sent directly to S3 — that
// depended on the bucket's own CORS configuration allowing this app's
// origin, which it didn't locally, so every upload failed with a CORS error
// the browser reported as an opaque "failed to parse the spreadsheet".
// Server-mediation removes that dependency entirely — see
// RosterUploadView's own docstring on the backend.

export type UploadRosterArgs = {
  tenantId: string;
  file: File;
};

export type RosterUploadResponse = {
  storage_key: string;
};

export type RosterImportTemplateResponse = {
  download_url: string;
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

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    uploadRoster: build.mutation<RosterUploadResponse, UploadRosterArgs>({
      query: ({ tenantId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/v1/tenants/${tenantId}/users/bulk-import/upload`,
          method: 'POST',
          body: formData,
        };
      },
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
    getRosterImportTemplateUrl: build.query<RosterImportTemplateResponse, string>({
      query: (tenantId) => `/v1/tenants/${tenantId}/users/bulk-import/template`,
    }),
  }),
});

export const {
  useUploadRosterMutation,
  useParseRosterMutation,
  useConfirmRosterImportMutation,
  useLazyGetRosterImportTemplateUrlQuery,
} = extendedApi;

/**
 * GET .../bulk-import/template now returns a presigned S3 GET URL
 * (`download_url`), not the file itself — this service's own route is still
 * authenticated (hence the manual bearer token on THAT fetch, via
 * useLazyGetRosterImportTemplateUrlQuery going through orgApi's normal
 * auth), but the second fetch here is a presigned S3 link that carries its
 * own auth in the query string, so it needs no header at all.
 */
export const downloadRosterTemplate = async (downloadUrl: string): Promise<void> => {
  const response = await fetch(downloadUrl);
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
