import React from 'react';
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

/**
 * 1.1 "Platform overview" — Total customers / New customers this month /
 * Monthly active users / Active sessions. Each number is its own KPI card
 * (`StatCardRow`), fetched from its own independent metrics call so one
 * slow/unavailable dependency never blocks the rest — same reasoning
 * `PlatformMetrics` already documents for its tile grid.
 */
const PlatformOverviewStats: React.FC<{ columns?: 2 | 3 | 4; tall?: boolean }> = ({
  columns = 4,
  tall,
}) => {
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

  return <StatCardRow cards={cards} columns={columns} tall={tall} />;
};

export default PlatformOverviewStats;
