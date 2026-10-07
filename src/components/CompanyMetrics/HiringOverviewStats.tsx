import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  MdOutlineWorkOutline,
  MdOutlineDescription,
  MdOutlineEventAvailable,
  MdOutlineGroups,
} from 'react-icons/md';
import { StatCardRow } from '../shared/ui/StatCardRow';
import type { StatCardData } from '../shared/ui/StatCardRow';
import StatDetailModal from '../shared/ui/StatDetailModal';
import { RootState } from '../../redux/provider/store';
import { useGetTenantDashboardQuery } from '../../api/organization-service/Tenants/profile';
import { useGetJobStatsQuery } from '../../api/job-service/JobOpening/GetJobOpening';
import {
  useGetTotalApplicationsQuery,
  useGetCompletedInterviewsQuery,
  useGetInterviewsByStatusQuery,
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
 * still has no paginated list endpoint anywhere on the backend
 * (candidate-service's `completed-interviews` is aggregate-only, and
 * interview-service has no cross-tenant/list capability at all today) — a
 * recruiter still can't see WHICH candidates/rounds those are — so it stays
 * on `StatDetailModal` rather than a real list modal. What that popup CAN
 * show without any new backend work is the by-type breakdown
 * (`interviews-by-status`, already used by Recruiter Dashboard's own
 * charts) instead of the "coming soon" placeholder it used to show.
 */
// interviews-by-status's fixed 3-bucket vocabulary (round_type_classification.py)
// mapped to display names. Round types outside these (e.g. Identity Verification)
// are excluded upstream.
const ROUND_TYPE_LABELS: Record<string, string> = {
  AUDIO: 'AI Audio Call',
  AVATAR: 'AI Video Interview',
  VIDEO: 'Panel',
};
const ROUND_TYPE_ORDER = ['AUDIO', 'AVATAR', 'VIDEO'];

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
  // Real breakdown for the "Completed interviews" popup, built from an
  // endpoint that already exists and is already used elsewhere (Recruiter
  // Dashboard's "Interviews by Status & Type" chart) — no new backend work
  // needed. Filtered to the 'completed' status only; see this file's own
  // history for why that sums to the same total `completedInterviews.total`
  // reports (both queries apply the same round/status filters for that one
  // status value).
  const { data: interviewsByStatus } = useGetInterviewsByStatusQuery(undefined, {
    skip: !canViewInterviews,
  });
  const completedByType = ROUND_TYPE_ORDER.map((type) => ({
    type,
    label: ROUND_TYPE_LABELS[type],
    count: (interviewsByStatus?.counts ?? [])
      .filter((row) => row.status === 'completed' && row.round_type === type)
      .reduce((sum, row) => sum + row.count, 0),
  }));

  const cards: StatCardData[] = [
    ...(canViewJobs
      ? [
          {
            icon: <MdOutlineWorkOutline />,
            variant: 'blue' as const,
            label: 'Active Job Openings',
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
            label: 'Total Applications',
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
            label: 'Completed Interviews',
            value: isInterviewsLoading ? undefined : completedInterviews?.total?.toLocaleString(),
            footer: (
              <p className="text-xs text-neutral-400">
                {completedByType.map((t) => `${t.label} ${t.count}`).join(' · ')}
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
            label: 'Active Team Members',
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
          label="Completed Interviews"
          value={completedInterviews?.total?.toLocaleString()}
          description="Interviews that have been completed across all rounds and formats."
          footer={
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-neutral-500">Breakdown by Type</p>
              {completedByType.map((t) => (
                <div key={t.type} className="flex items-center justify-between">
                  <span>{t.label}</span>
                  <span className="font-medium text-neutral-700">{t.count}</span>
                </div>
              ))}
            </div>
          }
          viewAllHref="/interviews"
          viewAllLabel="View interviews"
        />
      )}
    </>
  );
};

export default HiringOverviewStats;
