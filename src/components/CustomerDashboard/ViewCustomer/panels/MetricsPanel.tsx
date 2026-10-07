import React, { useMemo, useState } from 'react';
import {
  MdOutlineGroups,
  MdOutlineWorkOutline,
  MdOutlineDescription,
  MdOutlineEventAvailable,
} from 'react-icons/md';
import { ChartCard, DonutStat } from '../../../shared';
import type { DonutSlice } from '../../../shared';
import { StatCardRow } from '../../../shared/ui/StatCardRow';
import type { StatCardData } from '../../../shared/ui/StatCardRow';
import StatDetailModal from '../../../shared/ui/StatDetailModal';
import { useGetPlatformTenantDashboardQuery } from '../../../../api/organization-service/Platform/tenants';
import { useGetTenantJobStatsQuery } from '../../../../api/job-service/Platform/tenantJobStats';
import TenantUsersListModal from '../../../Dashboard/TenantUsersListModal';

const COMING_SOON = 'Coming soon: needs a platform-scoped job-service/candidate-service endpoint.';

// Same three-slice palette HiringOverviewCharts.tsx's own "Jobs by status"
// donut uses (Admin's tenant-scoped version of this exact chart).
const COLOR_SUCCESS = '#059669';
const COLOR_WARNING = '#d97706';
const COLOR_NEUTRAL = '#9aa3bc';

/**
 * 1.5 Tenants — the analytics popup for one company, Super Admin side.
 * Active users, Open jobs, Total applications and Completed interviews are
 * all real now (`GET /v1/platform/tenants/{tenant_id}/dashboard`, same
 * summary org-service already exposes tenant-side, just reachable for any
 * tenant here — the latter two via a platform-scoped candidate-service
 * route org-service proxies, same shape as `open_job_count`). Everything
 * else the dashboard-inventory doc lists for this popup — Applications over
 * time, Jobs by status, Hiring funnel, Interviews by Status & Type, AI score
 * distribution — still needs its own cross-tenant read that doesn't exist
 * yet. Shown honestly as "coming soon" rather than faked.
 */
const MetricsPanel: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data, isLoading } = useGetPlatformTenantDashboardQuery(tenantId);
  const { data: jobStats, isLoading: isJobStatsLoading } = useGetTenantJobStatsQuery(tenantId);
  const [showUsers, setShowUsers] = useState(false);
  const [activeDetail, setActiveDetail] = useState<'jobs' | 'applications' | 'interviews' | null>(
    null
  );

  const jobsByStatusData: DonutSlice[] = useMemo(() => {
    if (!jobStats) return [];
    return [
      { name: 'Open', value: jobStats.published_count, color: COLOR_SUCCESS },
      { name: 'Closed', value: jobStats.closed_count, color: COLOR_NEUTRAL },
      { name: 'Draft', value: jobStats.draft_count, color: COLOR_WARNING },
    ].filter((slice) => slice.value > 0);
  }, [jobStats]);

  const cards: StatCardData[] = [
    {
      icon: <MdOutlineGroups />,
      variant: 'neutral',
      label: 'Active Users',
      value: isLoading ? undefined : data?.team_size?.toLocaleString(),
      onClick: () => setShowUsers(true),
    },
    {
      icon: <MdOutlineWorkOutline />,
      variant: 'blue',
      label: 'Active Job Openings',
      value: isLoading ? undefined : (data?.open_job_count?.toLocaleString() ?? null),
      onClick: () => setActiveDetail('jobs'),
    },
    {
      icon: <MdOutlineDescription />,
      variant: 'green',
      label: 'Total Applications',
      value: isLoading ? undefined : (data?.total_applications?.toLocaleString() ?? null),
      onClick: () => setActiveDetail('applications'),
    },
    {
      icon: <MdOutlineEventAvailable />,
      variant: 'orange',
      label: 'Completed Interviews',
      value: isLoading ? undefined : (data?.completed_interviews?.toLocaleString() ?? null),
      onClick: () => setActiveDetail('interviews'),
    },
  ];

  return (
    <div className="p-4">
      <StatCardRow cards={cards} columns={4} className="mb-4" />
      {showUsers && (
        <TenantUsersListModal tenantId={tenantId} onClose={() => setShowUsers(false)} />
      )}
      {activeDetail === 'jobs' && (
        <StatDetailModal
          onClose={() => setActiveDetail(null)}
          icon={<MdOutlineWorkOutline />}
          variant="blue"
          label="Active Job Openings"
          value={data?.open_job_count?.toLocaleString() ?? null}
          description="Job openings this organization currently has published."
        />
      )}
      {activeDetail === 'applications' && (
        <StatDetailModal
          onClose={() => setActiveDetail(null)}
          icon={<MdOutlineDescription />}
          variant="green"
          label="Total Applications"
          value={data?.total_applications?.toLocaleString() ?? null}
          description="Total candidate applications received by this organization."
        />
      )}
      {activeDetail === 'interviews' && (
        <StatDetailModal
          onClose={() => setActiveDetail(null)}
          icon={<MdOutlineEventAvailable />}
          variant="orange"
          label="Completed Interviews"
          value={data?.completed_interviews?.toLocaleString() ?? null}
          description="Interviews completed by this organization across all rounds."
        />
      )}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <ChartCard
          title="Applications Over Time"
          subtitle="Weekly application volume and recruitment activity"
          available={false}
          unavailableLabel={COMING_SOON}
        >
          <div />
        </ChartCard>
        <ChartCard
          title="Job Openings by Status"
          subtitle="Open, closed and draft jobs for this tenant"
          isLoading={isJobStatsLoading}
          available={Boolean(jobStats) && jobStats!.total_count > 0}
        >
          <DonutStat data={jobsByStatusData} centerLabel="Job Openings" />
        </ChartCard>
        <ChartCard
          title="Hiring Funnel"
          subtitle="Applied → AI Audio Screening → AI Video Interview → Panel Interview → Selected / Rejected"
          span={2}
          available={false}
          unavailableLabel={COMING_SOON}
        >
          <div />
        </ChartCard>
        <ChartCard
          title="Interviews by Status & Type"
          subtitle="Status split by AI Audio Screening, AI Video Interview & Panel Interview"
          tag="Grouped Bar"
          available={false}
          unavailableLabel={COMING_SOON}
        >
          <div />
        </ChartCard>
        <ChartCard
          title="AI Score Distribution"
          subtitle="Candidates grouped by resume-score band"
          available={false}
          unavailableLabel="Coming soon: no scoring-distribution endpoint yet."
        >
          <div />
        </ChartCard>
      </div>
    </div>
  );
};

export default MetricsPanel;
