import { jobApi } from '../jobApi';
import type {
  OrganizationScoringCriteriaResponse,
  SaveOrganizationScoringCriteriaRequest,
} from '../types';

// Tenant self-service scoring weights, and the Super Admin
// on-behalf-of-any-tenant equivalent.
const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getOrganizationScoringCriteria: build.query<OrganizationScoringCriteriaResponse, void>({
      query: () => '/organization-scoring-criteria',
      providesTags: ['OrganizationScoringCriteria'],
    }),
    saveOrganizationScoringCriteria: build.mutation<
      OrganizationScoringCriteriaResponse,
      SaveOrganizationScoringCriteriaRequest
    >({
      query: (body) => ({ url: '/organization-scoring-criteria', method: 'PUT', body }),
      invalidatesTags: ['OrganizationScoringCriteria'],
    }),
    resetOrganizationScoringCriteria: build.mutation<OrganizationScoringCriteriaResponse, void>({
      query: () => ({ url: '/organization-scoring-criteria/reset', method: 'POST' }),
      invalidatesTags: ['OrganizationScoringCriteria'],
    }),

    getPlatformOrganizationScoringCriteria: build.query<
      OrganizationScoringCriteriaResponse,
      string
    >({
      query: (organizationId) => `/platform/organizations/${organizationId}/scoring-criteria`,
      providesTags: (_r, _e, organizationId) => [
        { type: 'PlatformOrganizationScoringCriteria', id: organizationId },
      ],
    }),
    savePlatformOrganizationScoringCriteria: build.mutation<
      OrganizationScoringCriteriaResponse,
      SaveOrganizationScoringCriteriaRequest & { organizationId: string }
    >({
      query: ({ organizationId, ...body }) => ({
        url: `/platform/organizations/${organizationId}/scoring-criteria`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_r, _e, { organizationId }) => [
        { type: 'PlatformOrganizationScoringCriteria', id: organizationId },
      ],
    }),
    resetPlatformOrganizationScoringCriteria: build.mutation<
      OrganizationScoringCriteriaResponse,
      { organizationId: string }
    >({
      query: ({ organizationId }) => ({
        url: `/platform/organizations/${organizationId}/scoring-criteria/reset`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, { organizationId }) => [
        { type: 'PlatformOrganizationScoringCriteria', id: organizationId },
      ],
    }),

    // PUT /platform/organizations/{organization_id}/scoring-lock — freezes
    // (or unfreezes) every job under this tenant for one stage. 204, no body.
    setOrganizationScoringLock: build.mutation<
      void,
      { organizationId: string; stage: 'RESUME' | 'INTERVIEW'; is_locked: boolean }
    >({
      query: ({ organizationId, stage, is_locked }) => ({
        url: `/platform/organizations/${organizationId}/scoring-lock`,
        method: 'PUT',
        body: { stage, is_locked },
      }),
      invalidatesTags: (_r, _e, { organizationId }) => [
        { type: 'PlatformOrganizationScoringCriteria', id: organizationId },
      ],
    }),
  }),
});

export { extendedApi as organizationScoringConfigApi };

export const {
  useGetOrganizationScoringCriteriaQuery,
  useSaveOrganizationScoringCriteriaMutation,
  useResetOrganizationScoringCriteriaMutation,
  useGetPlatformOrganizationScoringCriteriaQuery,
  useSavePlatformOrganizationScoringCriteriaMutation,
  useResetPlatformOrganizationScoringCriteriaMutation,
  useSetOrganizationScoringLockMutation,
} = extendedApi;
