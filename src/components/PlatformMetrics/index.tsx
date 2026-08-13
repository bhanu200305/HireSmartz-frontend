import React from 'react';
import { MdOutlineInsights } from 'react-icons/md';
import MainLayout from '../../layouts/MainLayout';
import { Typography } from '../shared';
import {
  useGetGrowthMetricsQuery,
  useGetHealthMetricsQuery,
  useGetSecurityMetricsQuery,
  useGetFinanceSummaryQuery,
  useGetCostBreakdownQuery,
} from '../../api/organization-service/Platform/metrics';
import MetricTile from './MetricTile';

/**
 * Super Admin dashboard — five independent calls, one per tile, fetched
 * separately so a slow/unavailable one (finances, cost, security — all
 * documented as degrading until billing-service/auth-service exposes them)
 * never holds up the rest. Matches docs/frontend_guide.txt's explicit
 * "fetch each on its own" instruction.
 */
const PlatformMetrics: React.FC = () => {
  const { data: growth, isLoading: isGrowthLoading } = useGetGrowthMetricsQuery();
  const { data: health, isLoading: isHealthLoading } = useGetHealthMetricsQuery();
  const { data: security, isLoading: isSecurityLoading } = useGetSecurityMetricsQuery();
  const { data: finances, isLoading: isFinancesLoading } = useGetFinanceSummaryQuery();
  const { data: cost, isLoading: isCostLoading } = useGetCostBreakdownQuery();

  return (
    <MainLayout>
      <div className="w-full p-8 pt-16">
        <div className="flex items-center space-x-2 mb-6">
          <span className="bg-black text-white p-2 rounded-3xl flex items-center justify-center">
            <MdOutlineInsights size={18} />
          </span>
          <h2 className="text-xl font-semibold">Platform Metrics</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <MetricTile title="Growth" isLoading={isGrowthLoading} available={Boolean(growth)}>
            <Typography variant="body2">
              {Object.entries(growth?.tenants_by_status ?? {}).map(([status, count]) => (
                <span key={status} className="block capitalize">
                  {status}: {count}
                </span>
              ))}
            </Typography>
            <Typography variant="caption">
              {growth?.total_platform_users ?? 0} total platform users
            </Typography>
          </MetricTile>

          <MetricTile title="Health" isLoading={isHealthLoading} available={Boolean(health)}>
            <Typography variant="body2">
              {health?.stale_pre_approved_tenant_count ?? 0} stuck mid-signup
            </Typography>
            <Typography variant="body2">
              {health?.expiring_platform_invites_count ?? 0} staff invites expiring soon
            </Typography>
            <Typography variant="caption">
              Inactive companies: not wired up yet — always 0.
            </Typography>
          </MetricTile>

          <MetricTile
            title="Security"
            isLoading={isSecurityLoading}
            available={
              security?.failed_login_count !== null && security?.failed_login_count !== undefined
            }
          >
            <Typography variant="body2">
              {security?.failed_login_count} failed logins in the last {security?.window_minutes}{' '}
              min
            </Typography>
          </MetricTile>

          <MetricTile
            title="Finances"
            isLoading={isFinancesLoading}
            available={Boolean(finances?.available)}
          >
            <Typography variant="body2">
              {finances?.total_mrr_cents != null
                ? `MRR: $${(finances.total_mrr_cents / 100).toFixed(2)}`
                : '-'}
            </Typography>
          </MetricTile>

          <MetricTile title="Cost" isLoading={isCostLoading} available={Boolean(cost?.available)}>
            {Object.entries(cost?.this_month_cost_cents_by_provider ?? {}).map(
              ([provider, cents]) => (
                <Typography key={provider} variant="body2" className="capitalize">
                  {provider}: ${(cents / 100).toFixed(2)}
                </Typography>
              )
            )}
          </MetricTile>
        </div>
      </div>
    </MainLayout>
  );
};

export default PlatformMetrics;
