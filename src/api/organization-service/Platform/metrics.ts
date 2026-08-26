import { orgApi } from '../orgApi';

export type GrowthTrendPoint = {
  /** Calendar month, UTC, `YYYY-MM`. */
  period: string;
  new_tenants: number;
};

export type FunnelStage = {
  /** A tenant status value: `draft` | `pre_approved` | `active`. */
  stage: string;
  count: number;
};

export type GrowthMetrics = {
  tenants_by_status: Record<string, number>;
  signups_this_week_by_source: Record<string, number>;
  /** Tenant `User` rows across every tenant, plus platform staff. */
  total_platform_users: number;
  /** Every tenant, any status. */
  total_customers: number;
  /** Tenants created since the start of the current calendar month, UTC. */
  new_customers_this_month: number;
  /** Trailing months, oldest first, zero-filled for continuity. */
  customer_growth_trend: GrowthTrendPoint[];
  /** `draft -> pre_approved -> active`, current status counts. */
  lead_to_confirmed_funnel: FunnelStage[];
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

export type LeadConversionBucket = {
  /** Calendar month, UTC, `YYYY-MM` — the month the lead was SUBMITTED. */
  period: string;
  leads_submitted: number;
  /** Leads from this submission cohort that have converted as of now. */
  leads_converted: number;
};

export type LeadConversionMetrics = {
  as_of: string;
  total_leads: number;
  total_converted: number;
  /** `total_converted / total_leads`, rounded to 4 places. */
  conversion_rate: number;
  trend: LeadConversionBucket[];
};

export type DeviceUsage = {
  device_type: string;
  sessions: number;
  users: number;
};

export type SessionMetrics = {
  /** `false` means authentication-service didn't answer — render
   * "unavailable", never zeros. */
  available: boolean;
  as_of: string | null;
  active_sessions: number;
  distinct_users: number;
  by_device: DeviceUsage[];
  last_activity_at: string | null;
  last_activity_status: 'live' | 'no_active_session' | 'unavailable';
};

export type LoginBucket = {
  bucket_start: string;
  distinct_users: number;
  success: number;
  failure: number;
  mfa_required: number;
};

export type LoginMetrics = {
  available: boolean;
  as_of: string | null;
  window_start: string | null;
  window_end: string | null;
  bucket: 'hour' | 'day' | 'week' | 'month' | 'year';
  timezone: string;
  /** Successful sign-ins only — the MAU figure at `window_days=30`. */
  distinct_users: number;
  success: number;
  failure: number;
  mfa_required: number;
  excludes_unknown_email_failures: boolean;
  buckets: LoginBucket[];
};

export type LoginMetricsParams = {
  tenantId?: string;
  windowDays?: number;
  bucket?: 'hour' | 'day' | 'week' | 'month' | 'year';
};

export type MfaMethodOutcome = {
  method_type: string;
  succeeded: number;
  failed: number;
};

export type MfaMetrics = {
  available: boolean;
  as_of: string | null;
  window_start: string | null;
  window_end: string | null;
  total: number;
  succeeded: number;
  /** MAX_ATTEMPTS wrong codes — the only counter a failure rate may be built on. */
  failed: number;
  superseded: number;
  abandoned: number;
  pending: number;
  failed_includes_superseded: boolean;
  by_method: MfaMethodOutcome[];
};

export type MfaMetricsParams = {
  tenantId?: string;
  windowDays?: number;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    // Independent calls, one per dashboard tile/chart — fetched separately so
    // a slow/unavailable one (finances, cost, security — all documented as
    // degrading until billing-service/auth-service exposes them) never holds
    // up the rest. Matches docs/frontend_guide.txt's explicit "fetch each on
    // its own" instruction.
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
    // Book-a-Demo lead -> confirmed tenant conversion. Own data, always
    // available (no external service dependency).
    getLeadConversionMetrics: build.query<LeadConversionMetrics, void>({
      query: () => '/v1/platform/metrics/lead-conversion',
    }),
    // Active Sessions, Distinct Users, Last Activity, Platform Usage by
    // Device. Omit tenantId for platform-wide.
    getSessionMetrics: build.query<SessionMetrics, string | void>({
      query: (tenantId) => ({
        url: '/v1/platform/metrics/sessions',
        params: tenantId ? { tenant_id: tenantId } : undefined,
      }),
    }),
    // MAU, User Adoption Trend, Authentication Health.
    getLoginMetrics: build.query<LoginMetrics, LoginMetricsParams | void>({
      query: (params) => ({
        url: '/v1/platform/metrics/logins',
        params: {
          tenant_id: params?.tenantId,
          window_days: params?.windowDays,
          bucket: params?.bucket,
        },
      }),
    }),
    // MFA Success — outcome counters, only `failed` is a genuine failure.
    getMfaMetrics: build.query<MfaMetrics, MfaMetricsParams | void>({
      query: (params) => ({
        url: '/v1/platform/metrics/mfa',
        params: {
          tenant_id: params?.tenantId,
          window_days: params?.windowDays,
        },
      }),
    }),
  }),
});

export const {
  useGetGrowthMetricsQuery,
  useGetHealthMetricsQuery,
  useGetSecurityMetricsQuery,
  useGetFinanceSummaryQuery,
  useGetCostBreakdownQuery,
  useGetLeadConversionMetricsQuery,
  useGetSessionMetricsQuery,
  useGetLoginMetricsQuery,
  useGetMfaMetricsQuery,
} = extendedApi;
