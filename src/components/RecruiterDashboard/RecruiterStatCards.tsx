import React, { useState } from 'react';
import { MdOutlineDescription, MdOutlineWorkOutline } from 'react-icons/md';
import { StatCardRow } from '../shared/ui/StatCardRow';
import type { StatCardData } from '../shared/ui/StatCardRow';
import { useGetJobStatsQuery } from '../../api/job-service/JobOpening/GetJobOpening';
import { useGetTotalApplicationsQuery } from '../../api/candidate-service/Stats/stats';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';
import JobOpeningsListModal from '../CompanyMetrics/JobOpeningsListModal';
import CandidatesListModal from '../shared/ui/CandidatesListModal';

/**
 * Recruiter KPI dashboard — "Total applications" / "Active job openings (my
 * open jobs)". `job-openings/stats` needs no `assigned_to_me` param here:
 * job-service's `_stats_assignment_scope` already scopes a `recruiter`
 * caller to their own tagged-or-created jobs unconditionally, the same way
 * `getJobStats` is called org-wide everywhere else in this app — the
 * server, not the client, decides the scope for this role. Same reasoning
 * applies to `JobOpeningsListModal` below (the exact list endpoint behind
 * `getJobStats`'s count) — no `assignedToMe` prop needed here either, unlike
 * `HiringManagerStatCards`'s use of the same modal.
 */
const RecruiterStatCards: React.FC = () => {
  const canViewJobs = useHasAccess(Authorities.JOB_OPENING_VIEW);
  const canViewCandidates = useHasAccess(Authorities.CANDIDATE_VIEW);
  const [showApplications, setShowApplications] = useState(false);
  const [showJobs, setShowJobs] = useState(false);

  const { data: jobStats, isLoading: isJobStatsLoading } = useGetJobStatsQuery(undefined, {
    skip: !canViewJobs,
  });
  const { data: totalApplications, isLoading: isApplicationsLoading } =
    useGetTotalApplicationsQuery(undefined, { skip: !canViewCandidates });

  const cards: StatCardData[] = [
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
    ...(canViewJobs
      ? [
          {
            icon: <MdOutlineWorkOutline />,
            variant: 'blue' as const,
            label: 'Active job openings (my open jobs)',
            value: isJobStatsLoading ? undefined : jobStats?.published_count?.toLocaleString(),
            onClick: () => setShowJobs(true),
          },
        ]
      : []),
  ];

  return (
    <>
      <StatCardRow cards={cards} columns={2} />
      {showApplications && <CandidatesListModal onClose={() => setShowApplications(false)} />}
      {showJobs && (
        <JobOpeningsListModal title="Active Job Openings" onClose={() => setShowJobs(false)} />
      )}
    </>
  );
};

export default RecruiterStatCards;
