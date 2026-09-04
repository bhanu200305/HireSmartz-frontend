import { orgApi } from '../orgApi';

// CultureIntroView — GET/PUT /v1/tenants/{tenant_id}/culture-intro. The
// spoken script the AI interviewer reads aloud before the Q&A portion of a
// candidate's audio interview round (organization-service's
// OrganizationCultureIntro entity) — a genuinely separate resource from the
// general tenant profile, NOT one of PATCH /tenants/{tenant_id}/profile's
// fields (that request model is extra="forbid" with no culture_intro field
// at all; a previous version of the Company Details form sent one anyway,
// which 422'd the whole save — see CultureIntroTab.tsx for the real thing).
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
      providesTags: ['CultureIntro'],
    }),
    updateTenantCultureIntro: build.mutation<CultureIntro, UpdateCultureIntroArgs>({
      query: ({ tenantId, intro_text }) => ({
        url: `/v1/tenants/${tenantId}/culture-intro`,
        method: 'PUT',
        body: { intro_text },
      }),
      invalidatesTags: ['CultureIntro'],
    }),
  }),
});

export const { useGetTenantCultureIntroQuery, useUpdateTenantCultureIntroMutation } = extendedApi;
