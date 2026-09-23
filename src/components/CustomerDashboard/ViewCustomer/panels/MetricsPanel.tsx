import React, { useState } from 'react';
import {
  MdOutlineGroups,
  MdOutlineWorkOutline,
  MdOutlineDescription,
  MdOutlineEventAvailable,
} from 'react-icons/md';
import { StatCardRow, ChartCard, StatDetailModal } from '../../../shared';
import type { StatCardData } from '../../../shared';
import { useGetPlatformTenantDashboardQuery } from '../../../../api/organization-service/Platform/tenants';
import TenantUsersListModal from '../../../Dashboard/TenantUsersListModal';

const COMING_SOON = 'Coming soon: needs a platform-scoped job-service/candidate-service endpoint.';

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
  const [showUsers, setShowUsers] = useState(false);
  const [activeDetail, setActiveDetail] = useState<'jobs' | 'applications' | 'interviews' | null>(
    null
  );

  const cards: StatCardData[] = [
    {
      icon: <MdOutlineGroups />,
      variant: 'neutral',
      label: 'Active users',
      value: isLoading ? undefined : data?.team_size?.toLocaleString(),
      onClick: () => setShowUsers(true),
    },
    {
      icon: <MdOutlineWorkOutline />,
      variant: 'blue',
      label: 'Open jobs',
      value: isLoading ? undefined : (data?.open_job_count?.toLocaleString() ?? null),
      onClick: () => setActiveDetail('jobs'),
    },
    {
      icon: <MdOutlineDescription />,
      variant: 'green',
      label: 'Total applications',
      value: isLoading ? undefined : (data?.total_applications?.toLocaleString() ?? null),
      onClick: () => setActiveDetail('applications'),
    },
    {
      icon: <MdOutlineEventAvailable />,
      variant: 'orange',
      label: 'Completed interviews',
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
          label="Open jobs"
          value={data?.open_job_count?.toLocaleString() ?? null}
          description="Job openings this organization currently has published."
        />
      )}
      {activeDetail === 'applications' && (
        <StatDetailModal
          onClose={() => setActiveDetail(null)}
          icon={<MdOutlineDescription />}
          variant="green"
          label="Total applications"
          value={data?.total_applications?.toLocaleString() ?? null}
          description="Total candidate applications received by this organization."
        />
      )}
      {activeDetail === 'interviews' && (
        <StatDetailModal
          onClose={() => setActiveDetail(null)}
          icon={<MdOutlineEventAvailable />}
          variant="orange"
          label="Completed interviews"
          value={data?.completed_interviews?.toLocaleString() ?? null}
          description="Interviews completed by this organization across all rounds."
        />
      )}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <ChartCard
          title="Applications over time"
          subtitle="Weekly application volume and recruitment activity"
          typeTag="Line"
          available={false}
          unavailableLabel={COMING_SOON}
        >
          <div />
        </ChartCard>
        <ChartCard
          title="Jobs by status"
          subtitle="Open, closed and draft jobs for this tenant"
          typeTag="Donut"
          available={false}
          unavailableLabel={COMING_SOON}
        >
          <div />
        </ChartCard>
        <ChartCard
          title="Hiring funnel"
          subtitle="Applied → Audio Round → AI Interview → Panel Interview → Selected / Rejected"
          typeTag="Funnel"
          span={2}
          available={false}
          unavailableLabel={COMING_SOON}
        >
          <div />
        </ChartCard>
        <ChartCard
          title="Interviews by Status & Type"
          subtitle="Scheduled / Completed / Canceled, by Audio Round, AI Interview & Panel Interview"
          typeTag="Grouped bar"
          available={false}
          unavailableLabel={COMING_SOON}
        >
          <div />
        </ChartCard>
        <ChartCard
          title="AI score distribution"
          subtitle="Candidates grouped by resume-score band"
          typeTag="Bar"
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
