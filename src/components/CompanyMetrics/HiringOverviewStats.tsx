import React from 'react';
import { useSelector } from 'react-redux';
import {
  MdOutlineWorkOutline,
  MdOutlineDescription,
  MdOutlineEventAvailable,
  MdOutlineGroups,
} from 'react-icons/md';
import { StatCardRow } from '../shared';
import type { StatCardData } from '../shared';
import { RootState } from '../../redux/provider/store';
import { useGetTenantDashboardQuery } from '../../api/organization-service/Tenants/profile';
import { useGetJobStatsQuery } from '../../api/job-service/JobOpenings/jobOpenings';
import {
  useGetTotalApplicationsQuery,
  useGetCompletedInterviewsQuery,
} from '../../api/candidate-service/Stats/stats';

/**
 * 2.1 "Hiring overview" — Active job openings / Total applications /
 * Completed interviews / Active team members. Same independent-call
 * pattern as the Super Admin's `PlatformOverviewStats`: one query per card,
 * so a slow job-service or candidate-service call never blocks the others.
 */
const HiringOverviewStats: React.FC<{ columns?: 2 | 3 | 4; tall?: boolean }> = ({
  columns = 4,
  tall,
}) => {
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);

  const { data: tenantDashboard, isLoading: isTeamLoading } = useGetTenantDashboardQuery(
    tenantId ?? '',
    { skip: !tenantId }
  );
  const { data: jobStats, isLoading: isJobStatsLoading } = useGetJobStatsQuery();
  const { data: totalApplications, isLoading: isApplicationsLoading } =
    useGetTotalApplicationsQuery();
  const { data: completedInterviews, isLoading: isInterviewsLoading } =
    useGetCompletedInterviewsQuery();

  const cards: StatCardData[] = [
    {
      icon: <MdOutlineWorkOutline />,
      variant: 'blue',
      label: 'Active job openings',
      value: isJobStatsLoading ? undefined : jobStats?.published_count?.toLocaleString(),
    },
    {
      icon: <MdOutlineDescription />,
      variant: 'green',
      label: 'Total applications',
      value: isApplicationsLoading ? undefined : totalApplications?.total?.toLocaleString(),
    },
    {
      icon: <MdOutlineEventAvailable />,
      variant: 'orange',
      label: 'Completed interviews',
      value: isInterviewsLoading ? undefined : completedInterviews?.total?.toLocaleString(),
      footer: (
        <p className="text-[11px] text-neutral-400">
          Breakdown by Audio / AI / Panel — coming soon
        </p>
      ),
    },
    {
      icon: <MdOutlineGroups />,
      variant: 'neutral',
      label: 'Active team members',
      value: isTeamLoading ? undefined : tenantDashboard?.team_size?.toLocaleString(),
    },
  ];

  return <StatCardRow cards={cards} columns={columns} tall={tall} />;
};

export default HiringOverviewStats;
