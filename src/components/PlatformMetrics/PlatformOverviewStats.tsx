import React, { useState } from 'react';
import {
  MdOutlineApartment,
  MdOutlinePersonAddAlt,
  MdOutlineGroups,
  MdOutlineWifiTethering,
} from 'react-icons/md';
import { StatCardRow } from '../shared';
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
 * "Total customers" is the one card with a real paginated list behind it
 * today (`GET /v1/platform/tenants`, the same call the "CFP Company" card
 * and the full `/company` page use) — clicking it opens
 * `PlatformTenantsListModal`. The other three stay display-only until their
 * own list endpoints exist (see the KPI backend request list).
 */
const PlatformOverviewStats: React.FC<{ columns?: 2 | 3 | 4; tall?: boolean }> = ({
  columns = 4,
  tall,
}) => {
  const [showCustomers, setShowCustomers] = useState(false);
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
    },
  ];

  return (
    <>
      <StatCardRow cards={cards} columns={columns} tall={tall} />
      {showCustomers && <PlatformTenantsListModal onClose={() => setShowCustomers(false)} />}
    </>
  );
};

export default PlatformOverviewStats;
