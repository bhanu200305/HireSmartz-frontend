import { orgApi } from '../orgApi';

// GET/PUT /v1/tenants/{tenant_id}/culture-intro — a genuinely SEPARATE
// resource from the rest of the profile (its own `CultureIntroView`/
// `TenantUpdateCultureIntroRequest`, wire field `intro_text`, gated on
// `interview:read`/`interview:write` rather than organization/company
// permissions — it's the tenant's own spoken intro played before an audio
// interview round's Q&A, not a plain profile field). It is NOT part of
// `GET/PATCH /v1/tenants/{tenant_id}/profile`'s `UpdateTenantProfileRequest`
// (that request model is `extra="forbid"`, so a `culture_intro` key in that
// PATCH body 422s the whole request) — see Tenants/profile.ts's own note.
// `intro_text` also has `min_length=1` server-side: there is no "clear it
// back to empty" call, only set-to-a-non-empty-value.
export type CultureIntro = {
  intro_text: string;
};

export type UpdateCultureIntroArgs = {
  tenantId: string;
  intro_text: string;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    getTenantCultureIntro: build.query<CultureIntro, string>({
      query: (tenantId) => `/v1/tenants/${tenantId}/culture-intro`,
      providesTags: (_result, _error, tenantId) => [{ type: 'Tenant', id: tenantId }],
    }),
    updateTenantCultureIntro: build.mutation<CultureIntro, UpdateCultureIntroArgs>({
      query: ({ tenantId, intro_text }) => ({
        url: `/v1/tenants/${tenantId}/culture-intro`,
        method: 'PUT',
        body: { intro_text },
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [{ type: 'Tenant', id: tenantId }],
    }),
  }),
});

export const { useGetTenantCultureIntroQuery, useUpdateTenantCultureIntroMutation } = extendedApi;
