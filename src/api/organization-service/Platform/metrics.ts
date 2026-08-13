import { orgApi } from '../orgApi';

export type GrowthMetrics = {
  tenants_by_status: Record<string, number>;
  signups_this_week_by_source: Record<string, number>;
  total_platform_users: number;
};

export type HealthMetrics = {
  stale_pre_approved_tenant_count: number;
  expiring_platform_invites_count: number;
  /** Stays 0 ("no data") until a real activity source is wired up — not a
   * real "0 inactive tenants" signal yet. See the backend entity's own docstring. */
  inactive_tenant_count: number;
};

export type SecurityMetrics = {
  /** `null` means authentication-service doesn't expose this yet — render
   * "not available", never "0 failed logins". */
  failed_login_count: number | null;
  window_minutes: number;
};

export type FinanceSummary = {
  /** `false` means billing-service doesn't exist yet. */
  available: boolean;
  tenants: Record<string, unknown>[];
  total_mrr_cents: number | null;
};

export type CostBreakdown = {
  available: boolean;
  this_month_cost_cents_by_provider: Record<string, number>;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    // Five separate calls, one per dashboard tile — fetched independently so
    // a slow/unavailable one (finances, cost, security) never holds up the
    // rest, per docs/frontend_guide.txt's explicit instruction.
    getGrowthMetrics: build.query<GrowthMetrics, void>({
      query: () => '/v1/platform/metrics/growth',
    }),
    getHealthMetrics: build.query<HealthMetrics, void>({
      query: () => '/v1/platform/metrics/health',
    }),
    getSecurityMetrics: build.query<SecurityMetrics, number | void>({
      query: (windowMinutes) => ({
        url: '/v1/platform/metrics/security',
        params: windowMinutes ? { window_minutes: windowMinutes } : undefined,
      }),
    }),
    getFinanceSummary: build.query<FinanceSummary, void>({
      query: () => '/v1/platform/metrics/finances',
    }),
    getCostBreakdown: build.query<CostBreakdown, void>({
      query: () => '/v1/platform/metrics/cost',
    }),
  }),
});

export const {
  useGetGrowthMetricsQuery,
  useGetHealthMetricsQuery,
  useGetSecurityMetricsQuery,
  useGetFinanceSummaryQuery,
  useGetCostBreakdownQuery,
} = extendedApi;
