import { orgApi } from '../orgApi';

// EntitlementsView — shared by the Company Admin's own GET/PUT
// (/v1/tenants/{id}/entitlements) and the Super Admin's platform variant
// (/v1/platform/tenants/{id}/entitlements, see Platform/tenants.ts) — same
// underlying row, same view shape; only the write path differs.
export type Entitlements = {
  is_culture_intro_enabled: boolean;
  is_config_score_enabled: boolean;
  is_candidate_intro_enabled: boolean;
  is_candidate_inquiries_enabled: boolean;
  is_location_manage_allowed: boolean;
  is_hierarchy_enabled: boolean;
  locked_flags: string[];
};

/** A tenant's own write path — deliberately no `locked_flags` field at all;
 * a Company Admin cannot lock/unlock their own flags (only Super Admin can,
 * via the platform variant). Locked flags are rejected server-side. */
export type UpdateOwnEntitlementsRequest = {
  tenantId: string;
  is_culture_intro_enabled?: boolean;
  is_config_score_enabled?: boolean;
  is_candidate_intro_enabled?: boolean;
  is_candidate_inquiries_enabled?: boolean;
  is_location_manage_allowed?: boolean;
  is_hierarchy_enabled?: boolean;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    getOwnEntitlements: build.query<Entitlements, string>({
      query: (tenantId) => `/v1/tenants/${tenantId}/entitlements`,
      providesTags: (_result, _error, tenantId) => [{ type: 'Entitlements', id: tenantId }],
    }),
    updateOwnEntitlements: build.mutation<Entitlements, UpdateOwnEntitlementsRequest>({
      query: ({ tenantId, ...body }) => ({
        url: `/v1/tenants/${tenantId}/entitlements`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'Entitlements', id: tenantId },
        { type: 'Tenant', id: tenantId },
      ],
    }),
  }),
});

export const { useGetOwnEntitlementsQuery, useUpdateOwnEntitlementsMutation } = extendedApi;
