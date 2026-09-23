import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  MdOutlineWorkOutline,
  MdOutlineDescription,
  MdOutlineEventAvailable,
  MdOutlineGroups,
} from 'react-icons/md';
import { StatCardRow, StatDetailModal } from '../shared';
import type { StatCardData } from '../shared';
import { RootState } from '../../redux/provider/store';
import { useGetTenantDashboardQuery } from '../../api/organization-service/Tenants/profile';
import { useGetJobStatsQuery } from '../../api/job-service/JobOpening/GetJobOpening';
import {
  useGetTotalApplicationsQuery,
  useGetCompletedInterviewsQuery,
} from '../../api/candidate-service/Stats/stats';
import JobOpeningsListModal from './JobOpeningsListModal';
import CandidatesListModal from '../shared/ui/CandidatesListModal';
import TeamMembersListModal from '../shared/ui/TeamMembersListModal';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';

/**
 * 2.1 "Hiring overview" — Active job openings / Total applications /
 * Completed interviews / Active team members. Same independent-call
 * pattern as the Super Admin's `PlatformOverviewStats`: one query per card,
 * so a slow job-service or candidate-service call never blocks the others.
 *
 * Three of the four cards have a real paginated list behind them:
 * "Active job openings" (`JobOpeningsListModal`), "Total applications"
 * (`CandidatesListModal`), "Active team members" (`TeamMembersListModal`) —
 * all open in place instead of navigating away. "Completed interviews"
 * still doesn't have a paginated list endpoint anywhere on the backend
 * (candidate-service's `completed-interviews` is aggregate-only, and
 * interview-service has no cross-tenant/list capability at all today), so
 * it stays on `StatDetailModal` — the number plus what it counts — until
 * one exists.
 */
const HiringOverviewStats: React.FC<{ columns?: 2 | 3 | 4; tall?: boolean }> = ({
  columns = 4,
  tall,
}) => {
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);
  const [showJobOpenings, setShowJobOpenings] = useState(false);
  const [showApplications, setShowApplications] = useState(false);
  const [showTeamMembers, setShowTeamMembers] = useState(false);
  const [activeDetail, setActiveDetail] = useState<'interviews' | null>(null);

  // Each card needs its OWN permission check, resolved against whichever
  // location is currently active (see useEffectivePermissions) — the four
  // cards here span four different resources (job/candidate/interview/user),
  // and a role's location override can grant some of those at one office and
  // not another (see the Dashboard investigation this matches). Gating the
  // whole slide by one permission would either hide cards the user DOES have
  // rights to, or show cards they don't — this keeps each card's visibility
  // exactly as narrow as what's actually granted at the active location.
  const canViewJobs = useHasAccess(Authorities.JOB_OPENING_VIEW);
  const canViewCandidates = useHasAccess(Authorities.CANDIDATE_VIEW);
  const canViewInterviews = useHasAccess(Authorities.INTERVIEW_QUESTIONS_VIEW);
  const canViewUsers = useHasAccess(Authorities.USER_VIEW);

  const { data: tenantDashboard, isLoading: isTeamLoading } = useGetTenantDashboardQuery(
    tenantId ?? '',
    { skip: !tenantId || !canViewUsers }
  );
  const { data: jobStats, isLoading: isJobStatsLoading } = useGetJobStatsQuery(undefined, {
    skip: !canViewJobs,
  });
  const { data: totalApplications, isLoading: isApplicationsLoading } =
    useGetTotalApplicationsQuery(undefined, { skip: !canViewCandidates });
  const { data: completedInterviews, isLoading: isInterviewsLoading } =
    useGetCompletedInterviewsQuery(undefined, { skip: !canViewInterviews });

  const cards: StatCardData[] = [
    ...(canViewJobs
      ? [
          {
            icon: <MdOutlineWorkOutline />,
            variant: 'blue' as const,
            label: 'Active job openings',
            value: isJobStatsLoading ? undefined : jobStats?.published_count?.toLocaleString(),
            onClick: () => setShowJobOpenings(true),
          },
        ]
      : []),
    ...(canViewCandidates
      ? [
          {
            icon: <MdOutlineDescription />,
            variant: 'green' as const,
            label: 'Total applications',
            value: isApplicationsLoading ? undefined : totalApplications?.total?.toLocaleString(),
            onClick: () => setShowApplications(true),
          },
        ]
      : []),
    ...(canViewInterviews
      ? [
          {
            icon: <MdOutlineEventAvailable />,
            variant: 'orange' as const,
            label: 'Completed interviews',
            value: isInterviewsLoading ? undefined : completedInterviews?.total?.toLocaleString(),
            footer: (
              <p className="text-[11px] text-neutral-400">
                Breakdown by Audio / AI / Panel: coming soon
              </p>
            ),
            onClick: () => setActiveDetail('interviews'),
          },
        ]
      : []),
    ...(canViewUsers
      ? [
          {
            icon: <MdOutlineGroups />,
            variant: 'neutral' as const,
            label: 'Active team members',
            value: isTeamLoading ? undefined : tenantDashboard?.team_size?.toLocaleString(),
            onClick: () => setShowTeamMembers(true),
          },
        ]
      : []),
  ];

  return (
    <>
      <StatCardRow cards={cards} columns={columns} tall={tall} />
      {showJobOpenings && <JobOpeningsListModal onClose={() => setShowJobOpenings(false)} />}
      {showApplications && <CandidatesListModal onClose={() => setShowApplications(false)} />}
      {showTeamMembers && <TeamMembersListModal onClose={() => setShowTeamMembers(false)} />}
      {activeDetail === 'interviews' && (
        <StatDetailModal
          onClose={() => setActiveDetail(null)}
          icon={<MdOutlineEventAvailable />}
          variant="orange"
          label="Completed interviews"
          value={completedInterviews?.total?.toLocaleString()}
          description="Interviews that have been completed across all rounds and formats."
          footer="Breakdown by Audio / AI / Panel: coming soon"
          viewAllHref="/interviews"
          viewAllLabel="View interviews"
        />
      )}
    </>
  );
};

export default HiringOverviewStats;
