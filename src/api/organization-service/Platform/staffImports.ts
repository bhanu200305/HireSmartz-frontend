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
//
// Every endpoint below goes through orgApi's own base query
// (orgApi.ts's rawOrgBaseQuery), which is what strips
// organization-service's `{status_code, status, message, data}` response
// envelope — including the template lookup, which is a real `build.query`
// rather than a manual `fetch`. A manual fetch bypasses that shared
// unwrapping, so `download_url` would come back undefined (it sits one
// level down, under `.data`).

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

// StaffRosterRowRequest.role is free text on the backend, validated per-row
// against the platform role catalogue (GET /v1/platform/roles) at confirm
// time — an unmatched name comes back as a per-row `failures` entry rather
// than 422ing the whole batch.
export type StaffRosterRole = string;

export type ConfirmStaffRosterRow = {
  email: string;
  role: StaffRosterRole;
  department_id?: string | null;
  // Accepted by the backend row shape for symmetry with the shared parse
  // template, but silently dropped for a staff row — no platform-scoped
  // designation catalogue exists yet (confirm_staff_roster_import.py's own
  // docstring). Sending them is harmless; nothing in this app's UI should
  // present an editable field for either, since that would imply they do
  // something they don't.
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
      // A confirmed row only ever becomes a pending `Invite` (tenant_id IS
      // NULL) — the same "not a real Membership until accepted" gap the
      // tenant flow has — so this won't make anyone new appear in the staff
      // list below. Invalidated anyway so a row that already WAS a member
      // (e.g. re-imported after being offboarded and never actually
      // reinvited) picks up correctly if that ever changes server-side.
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
