import React, { useState } from 'react';
import {
  MdOutlineApartment,
  MdOutlinePersonAddAlt,
  MdOutlineGroups,
  MdOutlineWifiTethering,
} from 'react-icons/md';
import { StatCardRow } from '../shared/ui/StatCardRow';
import type { StatCardData } from '../shared/ui/StatCardRow';
import {
  useGetGrowthMetricsQuery,
  useGetLoginMetricsQuery,
  useGetSessionMetricsQuery,
} from '../../api/organization-service/Platform/metrics';
import PlatformTenantsListModal from '../Dashboard/PlatformTenantsListModal';
import LoginUsersListModal from './LoginUsersListModal';
import ActiveSessionsListModal from './ActiveSessionsListModal';

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
 * "Monthly active users" and "Active sessions" now have real list drill-
 * downs too (`LoginUsersListModal`/`ActiveSessionsListModal`, backed by
 * org-service's `.../logins/users` and `.../sessions/list`) — the actual
 * people/sessions behind each number, cursor-paginated.
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
      label: 'Total Customers',
      value: isLoading ? undefined : growth?.total_customers?.toLocaleString(),
      onClick: () => setShowCustomers(true),
    },
    {
      icon: <MdOutlinePersonAddAlt />,
      variant: 'green',
      label: 'New Customers This Month',
      value: isLoading ? undefined : growth?.new_customers_this_month?.toLocaleString(),
      onClick: () => setShowNewCustomers(true),
    },
    {
      icon: <MdOutlineGroups />,
      variant: 'orange',
      label: 'Monthly Active Users',
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
      label: 'Active Sessions',
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
          title="New Customers This Month"
          createdAfter={startOfCurrentUtcMonth()}
          onClose={() => setShowNewCustomers(false)}
        />
      )}
      {activeDetail === 'mau' && <LoginUsersListModal onClose={() => setActiveDetail(null)} />}
      {activeDetail === 'sessions' && (
        <ActiveSessionsListModal onClose={() => setActiveDetail(null)} />
      )}
    </>
  );
};

export default PlatformOverviewStats;
