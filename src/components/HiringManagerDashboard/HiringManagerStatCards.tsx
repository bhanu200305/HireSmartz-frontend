import React, { useState } from 'react';
import { MdOutlineWorkOutline, MdOutlineRateReview, MdOutlinePendingActions } from 'react-icons/md';
import { StatCardRow, StatDetailModal } from '../shared';
import type { StatCardData } from '../shared';
import { useGetJobStatsQuery } from '../../api/job-service/JobOpening/GetJobOpening';
import {
  useGetCandidatesInReviewQuery,
  useGetPendingDecisionsQuery,
} from '../../api/candidate-service/Stats/stats';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';

/**
 * Hiring Manager KPI dashboard — "My open jobs" / "Candidates in review" /
 * "Pending Decision". `assigned_to_me=true` is what scopes "My open jobs"
 * to this hiring manager's own tagged-or-created jobs — every other role
 * calling `getJobStats` elsewhere in this app omits it deliberately (see
 * `HiringOverviewStats`); the candidate-service counts need no equivalent
 * flag since a hiring manager caller is auto-scoped to their assigned jobs
 * whenever `job_opening_id` is omitted (`resolve_stats_job_scope`).
 */
const HiringManagerStatCards: React.FC = () => {
  const canViewJobs = useHasAccess(Authorities.JOB_OPENING_VIEW);
  const canViewCandidates = useHasAccess(Authorities.CANDIDATE_VIEW);
  const [activeDetail, setActiveDetail] = useState<'jobs' | 'review' | 'pending' | null>(null);

  const { data: jobStats, isLoading: isJobStatsLoading } = useGetJobStatsQuery(
    { assignedToMe: true },
    { skip: !canViewJobs }
  );
  const { data: candidatesInReview, isLoading: isReviewLoading } = useGetCandidatesInReviewQuery(
    undefined,
    { skip: !canViewCandidates }
  );
  const { data: pendingDecisions, isLoading: isPendingLoading } = useGetPendingDecisionsQuery(
    undefined,
    { skip: !canViewCandidates }
  );

  const cards: StatCardData[] = [
    ...(canViewJobs
      ? [
          {
            icon: <MdOutlineWorkOutline />,
            variant: 'blue' as const,
            label: 'My open jobs',
            value: isJobStatsLoading ? undefined : jobStats?.published_count?.toLocaleString(),
            onClick: () => setActiveDetail('jobs'),
          },
        ]
      : []),
    ...(canViewCandidates
      ? [
          {
            icon: <MdOutlineRateReview />,
            variant: 'orange' as const,
            label: 'Candidates in review',
            value: isReviewLoading ? undefined : candidatesInReview?.total?.toLocaleString(),
            footer: (
              <p className="text-[11px] text-neutral-400">
                Scheduled for, or already given, a panel interview
              </p>
            ),
            onClick: () => setActiveDetail('review'),
          },
          {
            icon: <MdOutlinePendingActions />,
            variant: 'neutral' as const,
            label: 'Pending Decision',
            value: isPendingLoading ? undefined : pendingDecisions?.total?.toLocaleString(),
            footer: (
              <p className="text-[11px] text-neutral-400">
                Interviewed, awaiting selection or rejection
              </p>
            ),
            onClick: () => setActiveDetail('pending'),
          },
        ]
      : []),
  ];

  return (
    <>
      <StatCardRow cards={cards} columns={3} />
      {activeDetail === 'jobs' && (
        <StatDetailModal
          onClose={() => setActiveDetail(null)}
          icon={<MdOutlineWorkOutline />}
          variant="blue"
          label="My open jobs"
          value={jobStats?.published_count?.toLocaleString()}
          description="Published job openings assigned to, or created by, you."
          // No viewAllHref: unlike a recruiter, job-service's list endpoint
          // does NOT auto-scope a hiring_manager caller to their own jobs
          // (routers.py's `_BROAD_VISIBILITY_ROLES` — they get broad
          // visibility there by design), and /jobs has no URL-driven "my
          // jobs only" filter (`showMyJobsOnly` is local component state,
          // defaults off on every load) — so /jobs would show every job,
          // not the scoped count this card displays.
        />
      )}
      {activeDetail === 'review' && (
        <StatDetailModal
          onClose={() => setActiveDetail(null)}
          icon={<MdOutlineRateReview />}
          variant="orange"
          label="Candidates in review"
          value={candidatesInReview?.total?.toLocaleString()}
          description="Candidates scheduled for, or already given, a panel interview on one of your jobs."
          viewAllHref="/candidates"
          viewAllLabel="View candidates"
        />
      )}
      {activeDetail === 'pending' && (
        <StatDetailModal
          onClose={() => setActiveDetail(null)}
          icon={<MdOutlinePendingActions />}
          variant="neutral"
          label="Pending Decision"
          value={pendingDecisions?.total?.toLocaleString()}
          description="Candidates who have been interviewed and are awaiting a selection or rejection decision."
          viewAllHref="/candidates"
          viewAllLabel="View candidates"
        />
      )}
    </>
  );
};

export default HiringManagerStatCards;
