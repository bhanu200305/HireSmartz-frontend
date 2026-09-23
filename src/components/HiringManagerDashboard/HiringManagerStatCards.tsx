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
import JobOpeningsListModal from '../CompanyMetrics/JobOpeningsListModal';
import PendingDecisionsListModal from './PendingDecisionsListModal';

/**
 * Hiring Manager KPI dashboard — "My open jobs" / "Candidates in review" /
 * "Pending Decision". `assigned_to_me=true` is what scopes "My open jobs"
 * to this hiring manager's own tagged-or-created jobs — every other role
 * calling `getJobStats` elsewhere in this app omits it deliberately (see
 * `HiringOverviewStats`); the candidate-service counts need no equivalent
 * flag since a hiring manager caller is auto-scoped to their assigned jobs
 * whenever `job_opening_id` is omitted (`resolve_stats_job_scope`). Same
 * `assigned_to_me` flag now works on `JobOpeningsListModal`'s own list
 * endpoint too, so "My open jobs" opens that instead of a bare number.
 * "Pending Decision" opens `PendingDecisionsListModal` (the paginated list
 * that already exists as `PendingDecisionsSection` further down this same
 * dashboard). "Candidates in review" has no paginated list endpoint on the
 * backend yet (`CandidatesInReviewView` is aggregate-only), so it stays on
 * `StatDetailModal` until one exists.
 */
const HiringManagerStatCards: React.FC = () => {
  const canViewJobs = useHasAccess(Authorities.JOB_OPENING_VIEW);
  const canViewCandidates = useHasAccess(Authorities.CANDIDATE_VIEW);
  const [showJobs, setShowJobs] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [activeDetail, setActiveDetail] = useState<'review' | null>(null);

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
            onClick: () => setShowJobs(true),
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
            onClick: () => setShowPending(true),
          },
        ]
      : []),
  ];

  return (
    <>
      <StatCardRow cards={cards} columns={3} />
      {showJobs && (
        <JobOpeningsListModal
          title="My open jobs"
          assignedToMe
          onClose={() => setShowJobs(false)}
        />
      )}
      {showPending && <PendingDecisionsListModal onClose={() => setShowPending(false)} />}
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
    </>
  );
};

export default HiringManagerStatCards;
