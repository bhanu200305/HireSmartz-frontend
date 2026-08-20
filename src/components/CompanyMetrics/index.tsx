import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MdOutlineInsights } from 'react-icons/md';
import MainLayout from '../../layouts/MainLayout';
import { Typography } from '../shared';
import { RootState } from '../../redux/provider/store';
import { useGetTenantDashboardQuery } from '../../api/organization-service/Tenants/profile';
import MetricTile from '../PlatformMetrics/MetricTile';

const describeAction = (action: string): string =>
  action
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/**
 * A company admin's own equivalent of the Super Admin's Platform Metrics —
 * same tile layout, but every number here comes from THIS tenant's own
 * `GET /v1/tenants/{tenant_id}/dashboard` (TenantDashboardSummaryView), never
 * the platform-wide aggregate a company admin has no business seeing. Kept
 * as a separate page/route rather than reusing PlatformMetrics — that page
 * is gated on PLATFORM_VIEW specifically because only a no-tenant (platform)
 * principal can ever hold it (see Authorities.PLATFORM_VIEW's comment).
 */
const CompanyMetrics: React.FC = () => {
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);
  const { data, isLoading } = useGetTenantDashboardQuery(tenantId ?? '', { skip: !tenantId });

  if (!tenantId) {
    // A platform caller (Super Admin / internal staff) has no tenant of
    // their own — this screen has nothing to show them.
    return <Navigate to="/" replace />;
  }

  const enabledEntitlementCount = data
    ? Object.values(data.entitlements).filter((value) => value === true).length
    : 0;
  const totalEntitlementCount = data ? Object.keys(data.entitlements).length - 1 : 0; // - locked_flags

  return (
    <MainLayout>
      <div className="w-full p-8 pt-16">
        <div className="flex items-center space-x-2 mb-6">
          <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
            <MdOutlineInsights size={18} />
          </span>
          <h2 className="text-xl font-semibold">Company Metrics</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <MetricTile title="Team" isLoading={isLoading} available={Boolean(data)}>
            <Typography variant="body2">{data?.team_size ?? 0} team members</Typography>
            <Typography variant="caption">
              {data?.pending_invite_count ?? 0} invitations pending
            </Typography>
          </MetricTile>

          <MetricTile
            title="Job Openings"
            isLoading={isLoading}
            available={data?.open_job_count !== null && data?.open_job_count !== undefined}
          >
            <Typography variant="body2">{data?.open_job_count} open job openings</Typography>
          </MetricTile>

          <MetricTile title="Feature Settings" isLoading={isLoading} available={Boolean(data)}>
            <Typography variant="body2">
              {enabledEntitlementCount}/{totalEntitlementCount} features enabled
            </Typography>
            {data && data.entitlements.locked_flags.length > 0 && (
              <Typography variant="caption">
                {data.entitlements.locked_flags.length} locked by CareerForce Pro
              </Typography>
            )}
          </MetricTile>

          <MetricTile
            title="Recent Activity"
            isLoading={isLoading}
            available={Boolean(data?.recent_activity?.length)}
          >
            {data?.recent_activity.slice(0, 4).map((event) => (
              <Typography key={event.id} variant="body2" className="block truncate">
                {describeAction(event.action)}
              </Typography>
            ))}
          </MetricTile>
        </div>
      </div>
    </MainLayout>
  );
};

export default CompanyMetrics;
