import React, { useState } from 'react';
import {
  MdOutlineGroups,
  MdOutlineWorkOutline,
  MdOutlineDescription,
  MdOutlineEventAvailable,
} from 'react-icons/md';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import { StatCardRow, ChartCard, StatDetailModal } from '../shared';
import type { StatCardData } from '../shared';
import { Badge } from '../shared/ui/badge';
import {
  useGetPlatformTenantDashboardQuery,
  type PlatformTenantSummary,
} from '../../api/organization-service/Platform/tenants';
import { TENANT_STATUS_BADGE, formatTenantStatusLabel } from './tenantDisplay.helpers';

const initials = (name: string): string =>
  name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const formatRelativeTime = (isoDate: string | null): string => {
  if (!isoDate) return 'Not available yet';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const COMING_SOON = 'Coming soon: needs a platform-scoped job-service/candidate-service endpoint.';

/**
 * One company's analytics — opened in place, no route change. Clicking a
 * row in the "CFP Company" Dashboard card used to `navigate()` to the full
 * `/view-company` page (a route change + that page's own loading state);
 * this renders the same content this app already has for it —
 * `MetricsPanel.tsx`'s stat cards and "coming soon" chart grid — as a modal
 * instead, so it opens instantly over the dashboard rather than away from
 * it. Same real-vs-coming-soon split as that panel: Active users and Open
 * jobs come from `GET /v1/platform/tenants/{tenant_id}/dashboard`, which is
 * real; everything below it needs a cross-tenant job-service/candidate-
 * service read no platform-scoped endpoint exists for yet.
 */
const TenantAnalyticsModal: React.FC<{ tenant: PlatformTenantSummary; onClose: () => void }> = ({
  tenant,
  onClose,
}) => {
  const { data, isLoading } = useGetPlatformTenantDashboardQuery(tenant.tenant_id);
  const [activeDetail, setActiveDetail] = useState<
    'users' | 'jobs' | 'applications' | 'interviews' | null
  >(null);

  const cards: StatCardData[] = [
    {
      icon: <MdOutlineGroups />,
      variant: 'neutral',
      label: 'Active users',
      value: isLoading ? undefined : data?.team_size?.toLocaleString(),
      onClick: () => setActiveDetail('users'),
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
      value: null,
      footer: <p className="text-[11px] text-neutral-400">{COMING_SOON}</p>,
      onClick: () => setActiveDetail('applications'),
    },
    {
      icon: <MdOutlineEventAvailable />,
      variant: 'orange',
      label: 'Completed interviews',
      value: null,
      footer: <p className="text-[11px] text-neutral-400">{COMING_SOON}</p>,
      onClick: () => setActiveDetail('interviews'),
    },
  ];

  return (
    <AntdCommonModal
      open
      onClose={onClose}
      modalProps={{
        width: 860,
        maskClosable: true,
        // Caps the body at a fraction of the viewport and scrolls inside
        // it instead of letting the modal grow past the screen — five
        // chart tiles plus the stat-card row is comfortably taller than
        // most viewports, and an overflowing modal has no way to reach its
        // own footer/close affordance below the fold. Extra right padding
        // plus `.thin-scrollbar` (index.css) keep the scrollbar itself from
        // overlapping the rightmost column of cards — some Windows/Chrome
        // setups render the default scrollbar as a wide overlay rather
        // than reserving its own track space. `overflowX: 'hidden'` is
        // required alongside `overflowY: 'auto'` — per the CSS overflow
        // spec, leaving overflow-x at its default `visible` while
        // overflow-y isn't computes overflow-x to `auto` too, opening a
        // stray horizontal scrollbar that clips a sliver off this content.
        styles: {
          body: { maxHeight: '70vh', overflowY: 'auto', overflowX: 'hidden', paddingRight: 14 },
        },
        classNames: { body: 'thin-scrollbar' },
      }}
    >
      <div className="flex flex-col gap-5">
        {/* pr-10 keeps this row's own content (badge + last-activity text
            can run fairly wide) clear of antd's close button — it's
            `position: absolute` over the modal's top-right corner
            (AntdCommonModal renders with `title={null}`, so there's no
            reserved header row pushing it out of the way), and without
            this gutter a long enough status line sits directly under it. */}
        <div className="flex items-center gap-3 pr-10">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 font-display text-sm font-bold text-white">
            {initials(tenant.company_name)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-semibold text-neutral-900">
              {tenant.company_name}
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              <Badge status={TENANT_STATUS_BADGE[tenant.status] ?? 'neutral'}>
                {formatTenantStatusLabel(tenant.status)}
              </Badge>
              <span>·</span>
              <span>Last activity {formatRelativeTime(tenant.last_active_at)}</span>
            </div>
          </div>
        </div>

        <StatCardRow cards={cards} columns={4} />

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
      {activeDetail === 'users' && (
        <StatDetailModal
          onClose={() => setActiveDetail(null)}
          icon={<MdOutlineGroups />}
          variant="neutral"
          label="Active users"
          value={data?.team_size?.toLocaleString()}
          description={`Team members currently active at ${tenant.company_name}.`}
          // This tenant's own "Users" tab on the full company page (key '8'
          // in ViewCustomer/index.tsx) — a real route change, which is fine
          // here: this modal (and whatever opened it) is left behind on
          // navigation.
          viewAllHref={`/view-company?companyId=${tenant.tenant_id}&tab=8`}
          viewAllLabel="View team members"
        />
      )}
      {activeDetail === 'jobs' && (
        <StatDetailModal
          onClose={() => setActiveDetail(null)}
          icon={<MdOutlineWorkOutline />}
          variant="blue"
          label="Open jobs"
          value={data?.open_job_count?.toLocaleString() ?? null}
          description={`Job openings ${tenant.company_name} currently has published.`}
        />
      )}
      {activeDetail === 'applications' && (
        <StatDetailModal
          onClose={() => setActiveDetail(null)}
          icon={<MdOutlineDescription />}
          variant="green"
          label="Total applications"
          value={null}
          description={`Total candidate applications received by ${tenant.company_name}.`}
          footer={COMING_SOON}
        />
      )}
      {activeDetail === 'interviews' && (
        <StatDetailModal
          onClose={() => setActiveDetail(null)}
          icon={<MdOutlineEventAvailable />}
          variant="orange"
          label="Completed interviews"
          value={null}
          description={`Interviews completed by ${tenant.company_name} across all rounds.`}
          footer={COMING_SOON}
        />
      )}
    </AntdCommonModal>
  );
};

export default TenantAnalyticsModal;
