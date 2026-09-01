import { orgApi } from '../orgApi';
import type { CultureIntro, UpdateCultureIntroArgs } from '../Tenants/cultureIntro';

// Two separate resources sharing one shape (CultureIntroView, {intro_text}):
//
//   GET/PUT /v1/platform/tenants/{tenant_id}/culture-intro
//     Super Admin's proxy write for one specific tenant — full CRUD, unlike
//     the read-only audio-questions mirror on this same router (writes here
//     also log to that tenant's own activity feed, not just the platform
//     audit log — see UpdateTenantCultureIntroAsPlatformUseCase).
//
//   GET/PUT /v1/platform/culture-intro
//     The platform-wide default every NEW tenant's own copy is seeded from
//     at creation. Editing this never retroactively changes an existing
//     tenant's already-diverged copy — same "seed once, then owned
//     independently" shape PlatformScoringDefault already uses.
//
// CultureIntroTab.tsx (CompanySettings) picks between the two exactly like
// IntakeQuestionsTab.tsx already does for questions: a company dropdown
// with "Platform Default" as the first option.
const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    getPlatformTenantCultureIntro: build.query<CultureIntro, string>({
      query: (tenantId) => `/v1/platform/tenants/${tenantId}/culture-intro`,
      providesTags: ['CultureIntro'],
    }),
    updatePlatformTenantCultureIntro: build.mutation<CultureIntro, UpdateCultureIntroArgs>({
      query: ({ tenantId, intro_text }) => ({
        url: `/v1/platform/tenants/${tenantId}/culture-intro`,
        method: 'PUT',
        body: { intro_text },
      }),
      invalidatesTags: ['CultureIntro'],
    }),
    getPlatformDefaultCultureIntro: build.query<CultureIntro, void>({
      query: () => '/v1/platform/culture-intro',
      providesTags: ['PlatformCultureIntro'],
    }),
    updatePlatformDefaultCultureIntro: build.mutation<CultureIntro, string>({
      query: (intro_text) => ({
        url: '/v1/platform/culture-intro',
        method: 'PUT',
        body: { intro_text },
      }),
      invalidatesTags: ['PlatformCultureIntro'],
    }),
  }),
});

export const {
  useGetPlatformTenantCultureIntroQuery,
  useUpdatePlatformTenantCultureIntroMutation,
  useGetPlatformDefaultCultureIntroQuery,
  useUpdatePlatformDefaultCultureIntroMutation,
} = extendedApi;
