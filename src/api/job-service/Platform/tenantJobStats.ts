import { jobApi } from '../jobApi';
import type { JobStatsResponse } from '../types';

// GET /platform/tenants/{organization_id}/job-stats — same counts as
// GET /job-openings/stats, for a tenant the Super Admin chooses rather than
// their own (job-service's platform_router.py, require_platform_permission
// (Permission.JOB_READ)). Powers "Jobs by status" on the Super Admin's
// per-tenant analytics popup (TenantAnalyticsModal / MetricsPanel) — the
// one chart in that popup's "coming soon" grid that already has a real
// backend endpoint, just never wired up from here.
const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getTenantJobStats: build.query<JobStatsResponse, string>({
      query: (organizationId) => `/platform/tenants/${organizationId}/job-stats`,
      providesTags: (_result, _error, organizationId) => [{ type: 'JobStats', id: organizationId }],
    }),
  }),
});

export const { useGetTenantJobStatsQuery } = extendedApi;
