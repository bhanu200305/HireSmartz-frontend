import React, { useState } from 'react';
import {
  MdOutlineApartment,
  MdOutlinePersonAddAlt,
  MdOutlineGroups,
  MdOutlineWifiTethering,
} from 'react-icons/md';
import { StatCardRow, StatDetailModal } from '../shared';
import type { StatCardData } from '../shared';
import {
  useGetGrowthMetricsQuery,
  useGetLoginMetricsQuery,
  useGetSessionMetricsQuery,
} from '../../api/organization-service/Platform/metrics';
import PlatformTenantsListModal from '../Dashboard/PlatformTenantsListModal';

/**
 * 1.1 "Platform overview" — Total customers / New customers this month /
 * Monthly active users / Active sessions. Each number is its own KPI card
 * (`StatCardRow`), fetched from its own independent metrics call so one
 * slow/unavailable dependency never blocks the rest — same reasoning
 * `PlatformMetrics` already documents for its tile grid.
 *
 * "Total customers" and "New customers this month" both have a real
 * paginated list behind them (`GET /v1/platform/tenants`, the same call the
 * "CFP Company" card and the full `/company` page use) — clicking either
 * opens `PlatformTenantsListModal`, the second time with `created_after` set
 * to the start of the current UTC month, the same boundary
 * `GetGrowthMetricsUseCase` itself uses to compute the number on the card.
 * The other two don't have their own list endpoints yet (see the KPI backend
 * request list), so they open `StatDetailModal` instead — the number plus
 * what it counts.
 */
const startOfCurrentUtcMonth = (): string => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
};

const PlatformOverviewStats: React.FC<{ columns?: 2 | 3 | 4; tall?: boolean }> = ({
  columns = 4,
  tall,
}) => {
  const [showCustomers, setShowCustomers] = useState(false);
  const [showNewCustomers, setShowNewCustomers] = useState(false);
  const [activeDetail, setActiveDetail] = useState<'mau' | 'sessions' | null>(null);
  const { data: growth, isLoading: isGrowthLoading } = useGetGrowthMetricsQuery();
  // Monthly Active Users — successful sign-ins, distinct users, 30-day window.
  const { data: logins, isLoading: isLoginsLoading } = useGetLoginMetricsQuery({
    windowDays: 30,
  });
  const { data: sessions, isLoading: isSessionsLoading } = useGetSessionMetricsQuery();

  const isLoading = isGrowthLoading || isLoginsLoading || isSessionsLoading;

  const cards: StatCardData[] = [
    {
      icon: <MdOutlineApartment />,
      variant: 'blue',
      label: 'Total customers',
      value: isLoading ? undefined : growth?.total_customers?.toLocaleString(),
      onClick: () => setShowCustomers(true),
    },
    {
      icon: <MdOutlinePersonAddAlt />,
      variant: 'green',
      label: 'New customers this month',
      value: isLoading ? undefined : growth?.new_customers_this_month?.toLocaleString(),
      onClick: () => setShowNewCustomers(true),
    },
    {
      icon: <MdOutlineGroups />,
      variant: 'orange',
      label: 'Monthly active users',
      value: isLoading
        ? undefined
        : logins?.available
          ? logins.distinct_users.toLocaleString()
          : null,
      onClick: () => setActiveDetail('mau'),
    },
    {
      icon: <MdOutlineWifiTethering />,
      variant: 'neutral',
      label: 'Active sessions',
      value: isLoading
        ? undefined
        : sessions?.available
          ? sessions.active_sessions.toLocaleString()
          : null,
      onClick: () => setActiveDetail('sessions'),
    },
  ];

  return (
    <>
      <StatCardRow cards={cards} columns={columns} tall={tall} />
      {showCustomers && <PlatformTenantsListModal onClose={() => setShowCustomers(false)} />}
      {showNewCustomers && (
        <PlatformTenantsListModal
          title="New customers this month"
          createdAfter={startOfCurrentUtcMonth()}
          onClose={() => setShowNewCustomers(false)}
        />
      )}
      {activeDetail === 'mau' && (
        <StatDetailModal
          onClose={() => setActiveDetail(null)}
          icon={<MdOutlineGroups />}
          variant="orange"
          label="Monthly active users"
          value={logins?.available ? logins.distinct_users.toLocaleString() : null}
          description="Distinct users who successfully signed in at least once over the last 30 days."
        />
      )}
      {activeDetail === 'sessions' && (
        <StatDetailModal
          onClose={() => setActiveDetail(null)}
          icon={<MdOutlineWifiTethering />}
          variant="neutral"
          label="Active sessions"
          value={sessions?.available ? sessions.active_sessions.toLocaleString() : null}
          description="Sessions currently active across the platform right now."
        />
      )}
    </>
  );
};

export default PlatformOverviewStats;
