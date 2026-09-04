import { orgApi } from '../orgApi';

// The platform-staff mirror of Tenants/imports.ts's real 3-step roster
// import flow (upload -> parse -> confirm), mounted under
// /v1/platform/staff/bulk-import/... (directory/api/platform_router.py) —
// no tenant_id anywhere, platform staff belong to no tenant. Two real
// differences from the tenant flow, both on the backend
// (confirm_staff_roster_import.py):
//  - `department` must resolve to a real platform department_id (a Select
//    against GET /v1/platform/departments), not free text — there is no
//    get-or-create-by-name for platform departments the way the tenant flow
//    has for its own.
//  - `designation`/`contact` are accepted by the row shape for symmetry with
//    the shared parse template, but silently dropped — no platform-scoped
//    designation catalogue exists (see that use case's own docstring). Not
//    surfaced as editable fields here on purpose, so this UI never implies
//    they do something they don't.

export type UploadStaffRosterFileArgs = {
  file: File;
};

export type StaffRosterUploadResult = {
  storage_key: string;
};

export type ParseStaffRosterArgs = {
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
export type ConfirmStaffRosterRow = {
  email: string;
  role: string;
  department_id?: string | null;
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
  failures: StaffRosterRowFailure[];
};

export type StaffRosterImportTemplateView = {
  download_url: string;
  expires_in: number;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    // A plain query, not the manual-fetch-and-unwrap-by-hand approach an
    // earlier version of this file used — that bypassed orgApi's own base
    // query (orgApi.ts's rawOrgBaseQuery), which is what actually strips
    // organization-service's `{status_code, status, message, data}` response
    // envelope. Every other endpoint in this file gets that unwrapping for
    // free; the manual fetch didn't, so `download_url` came back undefined
    // (it was one level down, under `.data`) and the resulting `<a href>`
    // navigation went to a garbage relative URL instead of the real file.
    getStaffRosterImportTemplate: build.query<StaffRosterImportTemplateView, void>({
      query: () => '/v1/platform/staff/bulk-import/template',
    }),
    uploadStaffRosterFile: build.mutation<StaffRosterUploadResult, UploadStaffRosterFileArgs>({
      query: ({ file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: '/v1/platform/staff/bulk-import/upload',
          method: 'POST',
          body: formData,
        };
      },
    }),
    parseStaffRoster: build.mutation<ParseStaffRosterResponse, ParseStaffRosterArgs>({
      query: ({ storage_key }) => ({
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
  }),
});

export const {
  useLazyGetStaffRosterImportTemplateQuery,
  useUploadStaffRosterFileMutation,
  useParseStaffRosterMutation,
  useConfirmStaffRosterImportMutation,
} = extendedApi;

/**
 * Turns a presigned download URL into an actual browser download with no
 * page navigation — the presigned URL's `Content-Disposition: attachment`
 * (set by `presign_download(..., filename=...)` on the backend) is what
 * makes a plain `<a>` click hand this straight to the download manager
 * instead of navigating there. No `window.open`/new tab: a scripted
 * `window.open()` called after an `await` no longer reads to the browser as
 * a direct response to the click that triggered it, so popup blockers
 * either kill it outright or leave an empty tab stuck on about:blank —
 * worse, `noopener` in its features string makes browsers hand back `null`
 * for the new window, so a naive fallback ends up navigating the CURRENT
 * tab (this app) to whatever URL you meant for the new one.
 */
export const triggerFileDownload = (downloadUrl: string): void => {
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
};
