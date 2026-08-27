import React from 'react';
import { StatCardRow, ChartCard, FunnelBars } from '../shared';
import type { StatCardData } from '../shared';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import type { JobSummary } from '../../api/job-service/JobOpenings/types';
import {
  useGetTotalApplicationsQuery,
  useGetHiringFunnelQuery,
} from '../../api/candidate-service/Stats/stats';
import { useGetInterviewSummaryQuery } from '../../api/interview-service/Dashboard/summary';

const capitalize = (value: string): string =>
  value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const COMING_SOON_ROUND_TYPE =
  'Coming soon — interview-service no longer breaks bookings down by Audio/AI/Panel, only by status.';
const COMING_SOON_SCORE = 'Coming soon — no AI-score endpoint yet.';

/**
 * One job's own KPI popup — real applicant/funnel/applications-over-time
 * numbers (job-scoped candidate-service calls), the interview-summary total
 * this service can actually give (not the Audio/AI/Panel split the doc
 * asks for — see `COMING_SOON_ROUND_TYPE`), and honest "coming soon" for
 * the two AI-score cards no endpoint backs yet.
 *
 * Extracted out of `OpenJobsSection` (its original home) so
 * `JobOpeningsListModal` — the "Active job openings" KPI card's own popup —
 * can open the exact same per-job detail on a row click, rather than
 * reimplementing it or diverging from the metrics page's version.
 */
const JobDetailModal: React.FC<{ job: JobSummary; onClose: () => void }> = ({ job, onClose }) => {
  const jobId = job.org_job_opening_id;
  const { data: totalApplications, isLoading: isTotalLoading } = useGetTotalApplicationsQuery({
    jobOpeningId: jobId,
  });
  const { data: funnel, isLoading: isFunnelLoading } = useGetHiringFunnelQuery({
    jobOpeningId: jobId,
  });
  const { data: interviewSummary, isLoading: isSummaryLoading } =
    useGetInterviewSummaryQuery(jobId);

  const funnelStages = (funnel?.stages ?? []).map((stage) => ({
    label: capitalize(stage.stage),
    value: stage.count,
  }));

  const statusCards: StatCardData[] = [
    {
      label: 'Total applicants',
      value: isTotalLoading ? undefined : totalApplications?.total?.toLocaleString(),
    },
    {
      label: 'Interview bookings',
      value: isSummaryLoading ? undefined : interviewSummary?.total_bookings?.toLocaleString(),
    },
    {
      label: 'Completion rate',
      value:
        isSummaryLoading || interviewSummary?.completion_rate == null
          ? null
          : `${(interviewSummary.completion_rate * 100).toFixed(0)}%`,
    },
    {
      label: 'Avg AI score',
      value: null,
      footer: <p className="text-[11px] text-neutral-400">{COMING_SOON_SCORE}</p>,
    },
  ];

  return (
    <AntdCommonModal open onClose={onClose} title={job.title || 'Untitled job'}>
      <div className="flex flex-col gap-4">
        <StatCardRow cards={statusCards} columns={4} />

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <ChartCard
            title="Candidate status breakdown"
            subtitle="Applied, Audio Round, AI Interview, Panel Interview, Selected, Rejected"
            typeTag="Funnel"
            isLoading={isFunnelLoading}
            available={funnelStages.length > 0}
          >
            <FunnelBars stages={funnelStages} color="#263d92" />
          </ChartCard>

          <ChartCard
            title="Audio / AI / Panel interviews"
            subtitle="Interviews conducted for this job, by round type"
            typeTag="Bar"
            available={false}
            unavailableLabel={COMING_SOON_ROUND_TYPE}
          >
            <div />
          </ChartCard>

          <ChartCard
            title="AI score distribution"
            subtitle="Candidates grouped by resume-score band"
            typeTag="Bar"
            span={2}
            available={false}
            unavailableLabel={COMING_SOON_SCORE}
          >
            <div />
          </ChartCard>
        </div>
      </div>
    </AntdCommonModal>
  );
};

export default JobDetailModal;
