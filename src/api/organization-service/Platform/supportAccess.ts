import { orgApi } from '../orgApi';

/**
 * A time-limited, read-only grant letting one cfp_support platform-staff
 * membership reach a single tenant's `/v1/platform/tenants/{tenant_id}/...`
 * routes (profile, departments, offices, designations, users, dashboard,
 * activity, audio-questions, qr-code) — org-service now authorizes these
 * for a live grant; previously they always 403'd even a valid one.
 *
 * `grant_id`/`membership_id`/`email` field names are this file's own
 * assumption (not yet confirmed against a real response body) — the backend
 * spec only fixed the request/response CONCEPT (who, expires_at,
 * remaining_seconds) and the endpoint shapes below, following this API
 * layer's own established convention (every resource elsewhere has an
 * `_id`, see PlatformStaffMember.membership_id in ./staff.ts). Adjust field
 * names here first if a real response disagrees — every consumer reads
 * through this one type.
 */
export type SupportAccessGrant = {
  grant_id: string;
  membership_id: string;
  email: string | null;
  granted_at: string;
  expires_at: string;
  remaining_seconds: number;
};

export type GrantSupportAccessArgs = {
  tenantId: string;
  membership_id: string;
  /** Omit for the backend's own default (72h); max 720h (30 days). */
  hours?: number;
};

export type RevokeSupportAccessArgs = {
  tenantId: string;
  grantId: string;
};

/**
 * The cfp_support user's own "which tenants can I currently reach" list —
 * NOT one of the endpoints the backend team confirmed working. The grant
 * endpoints below are all tenant-scoped (GET .../support-access lists a
 * SPECIFIC tenant's grants, for the admin managing them), which has no
 * answer for "what tenant(s) am I, the cfp_support caller, granted into
 * right now" without already knowing a tenant_id — exactly the gap
 * My Support Access (src/pages/MySupportAccessPage) needs filled. Built
 * against this assumed shape so the screen has something to wire up to;
 * needs backend confirmation/implementation before it'll return real data.
 */
export type MySupportAccessGrant = {
  grant_id: string;
  tenant_id: string;
  tenant_name: string;
  granted_at: string;
  expires_at: string;
  remaining_seconds: number;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listSupportAccessGrants: build.query<SupportAccessGrant[], string>({
      query: (tenantId) => `/v1/platform/tenants/${tenantId}/support-access`,
      transformResponse: (response: { grants: SupportAccessGrant[] }) => response.grants,
      providesTags: (_result, _error, tenantId) => [{ type: 'SupportAccess', id: tenantId }],
    }),
    grantSupportAccess: build.mutation<SupportAccessGrant, GrantSupportAccessArgs>({
      query: ({ tenantId, ...body }) => ({
        url: `/v1/platform/tenants/${tenantId}/support-access`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [{ type: 'SupportAccess', id: tenantId }],
    }),
    revokeSupportAccess: build.mutation<{ status: string }, RevokeSupportAccessArgs>({
      query: ({ tenantId, grantId }) => ({
        url: `/v1/platform/tenants/${tenantId}/support-access/${grantId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [{ type: 'SupportAccess', id: tenantId }],
    }),
    // See MySupportAccessGrant's own comment — endpoint path/shape assumed,
    // not yet confirmed with backend.
    listMySupportAccessGrants: build.query<MySupportAccessGrant[], void>({
      query: () => '/v1/platform/support-access/me',
      transformResponse: (response: { grants: MySupportAccessGrant[] }) => response.grants,
      providesTags: ['SupportAccess'],
    }),
  }),
});

export const {
  useListSupportAccessGrantsQuery,
  useGrantSupportAccessMutation,
  useRevokeSupportAccessMutation,
  useListMySupportAccessGrantsQuery,
} = extendedApi;
