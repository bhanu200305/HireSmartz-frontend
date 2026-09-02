import { orgApi } from '../orgApi';

// Platform staff's own bulk-import flow — GET/POST /v1/platform/staff/
// bulk-import/*. Deliberately NOT a mirror of Tenants/imports.ts's upload
// step: that one gets a presigned S3 POST and uploads straight from the
// browser (see request_roster_upload.py's docstring on why — and the real
// CORS bug that pattern hit locally). The staff flow's own backend
// (request_staff_roster_upload.py) is explicit that it's server-mediated on
// purpose — the file goes to this service as normal multipart form data,
// which then writes it to S3 itself — so there's no separate "get an
// upload target" call and no direct-to-S3 fetch here, just one POST.

export type StaffRosterUploadResponse = {
  storage_key: string;
};

export type ParsedStaffRosterRow = {
  row_number: number;
  name: string;
  email: string;
  department: string | null;
  designation: string | null;
  role: string | null;
  contact: string | null;
};

export type ParseStaffRosterResponse = {
  rows: ParsedStaffRosterRow[];
};

export type StaffRosterRole = string;

export type ConfirmStaffRosterRow = {
  email: string;
  role: StaffRosterRole;
  department_id?: string | null;
  designation?: string | null;
  contact?: string | null;
};

export type ConfirmStaffRosterImportArgs = {
  rows: ConfirmStaffRosterRow[];
};

export type StaffRosterRowFailure = {
  row_number: number;
  email: string;
  reason: string;
};

export type ConfirmStaffRosterImportResponse = {
  created_count: number;
  invitation_ids: string[];
  // confirm_staff_roster_import.py's own docstring: unlike the tenant
  // flow, a duplicate email isn't a separate "skipped" bucket — it comes
  // back as a `failures` row with DuplicateInvitationError's own message,
  // same as any other per-row rejection (unknown role, unknown
  // department, protected super_admin role).
  failures: StaffRosterRowFailure[];
};

export type StaffRosterTemplateResponse = {
  download_url: string;
  expires_in: number;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    uploadStaffRoster: build.mutation<StaffRosterUploadResponse, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: '/v1/platform/staff/bulk-import/upload',
          method: 'POST',
          body: formData,
        };
      },
    }),
    parseStaffRoster: build.mutation<ParseStaffRosterResponse, string>({
      query: (storage_key) => ({
        url: '/v1/platform/staff/bulk-import/parse',
        method: 'POST',
        body: { storage_key },
      }),
    }),
    confirmStaffRosterImport: build.mutation<
      ConfirmStaffRosterImportResponse,
      ConfirmStaffRosterImportArgs
    >({
      query: ({ rows }) => ({
        url: '/v1/platform/staff/bulk-import/confirm',
        method: 'POST',
        body: { rows },
      }),
      invalidatesTags: ['PlatformStaff'],
    }),
    getStaffRosterTemplateUrl: build.query<StaffRosterTemplateResponse, void>({
      query: () => '/v1/platform/staff/bulk-import/template',
    }),
  }),
});

export const {
  useUploadStaffRosterMutation,
  useParseStaffRosterMutation,
  useConfirmStaffRosterImportMutation,
  useLazyGetStaffRosterTemplateUrlQuery,
} = extendedApi;

/**
 * The template endpoint returns a presigned S3 GET URL (`download_url`),
 * not the file itself — one extra fetch to actually get the bytes, then the
 * same short-lived-object-URL download trick Tenants/imports.ts's
 * `downloadRosterTemplate` uses. That one manually attaches a bearer token
 * because organization-service's own `/template` route is authenticated;
 * this one doesn't need to, because by the time this second `fetch` runs,
 * the URL is a presigned S3 link that carries its own auth in the query
 * string — attaching an `Authorization` header here would just be ignored
 * by S3, not required by it.
 */
export const downloadStaffRosterTemplate = async (downloadUrl: string): Promise<void> => {
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Template download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = 'platform_staff_roster_import_template.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};
