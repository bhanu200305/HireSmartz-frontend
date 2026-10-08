import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartCard, FunnelBars } from '../shared';
import { StatCardRow } from '../shared/ui/StatCardRow';
import type { StatCardData } from '../shared/ui/StatCardRow';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import type { JobSummary } from '../../api/job-service/JobOpenings/types';
import {
  useGetTotalApplicationsQuery,
  useGetHiringFunnelQuery,
  useGetAverageResumeScoreQuery,
  useGetResumeScoreDistributionQuery,
  RESUME_SCORE_BAND_ORDER,
} from '../../api/candidate-service/Stats/stats';
import { useGetInterviewSummaryQuery } from '../../api/interview-service/Dashboard/summary';
import { useJobTitleNameMap } from '../../hooks/useJobTitleNameMap';
import { AI_SCORE_MAX } from '../JobsOpening/Candidates/roundPipeline';

const capitalize = (value: string): string =>
  value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const COMING_SOON_ROUND_TYPE =
  'Coming soon: interview-service no longer breaks bookings down by Audio/AI/Panel, only by status.';

/**
 * One job's own KPI popup — real applicant/funnel/applications-over-time/
 * AI-score numbers (job-scoped candidate-service calls) and the interview-
 * summary total this service can actually give (not the Audio/AI/Panel
 * split the doc asks for — see `COMING_SOON_ROUND_TYPE`, still genuinely
 * unbacked, interview-service's own gap).
 *
 * Extracted out of `OpenJobsSection` (its original home) so
 * `JobOpeningsListModal` — the "Active job openings" KPI card's own popup —
 * can open the exact same per-job detail on a row click, rather than
 * reimplementing it or diverging from the metrics page's version.
 */
const JobDetailModal: React.FC<{ job: JobSummary; onClose: () => void }> = ({ job, onClose }) => {
  const navigate = useNavigate();
  const jobId = job.org_job_opening_id;
  // `job.title` doesn't exist on the current backend contract (job-service
  // only ever returns job_title_id — see JobSummaryView's docstring) — the
  // real name comes from this org-service catalogue lookup instead.
  const { titleMap } = useJobTitleNameMap();
  const jobTitle = (job.job_title_id && titleMap[job.job_title_id]) || 'Untitled job';
  const { data: totalApplications, isLoading: isTotalLoading } = useGetTotalApplicationsQuery({
    jobOpeningId: jobId,
  });
  const { data: funnel, isLoading: isFunnelLoading } = useGetHiringFunnelQuery({
    jobOpeningId: jobId,
  });
  const { data: interviewSummary, isLoading: isSummaryLoading } =
    useGetInterviewSummaryQuery(jobId);
  const { data: averageResumeScore, isLoading: isAvgScoreLoading } = useGetAverageResumeScoreQuery({
    jobOpeningId: jobId,
  });
  const { data: resumeScoreDistribution, isLoading: isScoreDistributionLoading } =
    useGetResumeScoreDistributionQuery({ jobOpeningId: jobId });

  const funnelStages = (funnel?.stages ?? []).map((stage) => ({
    label: capitalize(stage.stage),
    value: stage.count,
  }));

  const scoreByBand = new Map((resumeScoreDistribution?.bands ?? []).map((b) => [b.band, b.count]));
  const resumeScoreData = RESUME_SCORE_BAND_ORDER.map((band) => ({
    name: band,
    Candidates: scoreByBand.get(band) ?? 0,
  }));

  const statusCards: StatCardData[] = [
    {
      label: 'Total Applicants',
      value: isTotalLoading ? undefined : totalApplications?.total?.toLocaleString(),
      onClick: () => {
        onClose();
        navigate(`/jobs/view/${jobId}/candidates`);
      },
    },
    {
      label: 'Interview Bookings',
      value: isSummaryLoading ? undefined : interviewSummary?.total_bookings?.toLocaleString(),
    },
    {
      label: 'Completion Rate',
      value:
        isSummaryLoading || interviewSummary?.completion_rate == null
          ? null
          : `${(interviewSummary.completion_rate * 100).toFixed(0)}%`,
    },
    {
      // `average` is `null` when nothing has been scored yet, not `0` —
      // API_CONTRACT.md's own distinction, rendered as "-" not "0.0".
      label: 'Avg AI Score',
      value: isAvgScoreLoading
        ? undefined
        : averageResumeScore?.average != null
          ? `${averageResumeScore.average.toFixed(1)} / ${AI_SCORE_MAX}`
          : '-',
    },
  ];

  return (
    <AntdCommonModal
      open
      onClose={onClose}
      title={jobTitle}
      subtitle={job.job_profile_code}
      modalProps={{ width: 820, maskClosable: true }}
      fillHeight
    >
      {/* Scrolls on this plain div, not `.ant-modal-body` — same
          fillHeight convention every other list modal already uses (see
          AntdCommonModal's own comment on the prop), so this scroll region
          picks up the app's global thin-scrollbar styling the same
          reliable way theirs does, rather than falling back to
          `.ant-modal-body`'s own scroll (antd's bundled styles contest the
          global scrollbar rule there, which is where the native/arrow
          scrollbar was showing through). */}
      <div className="flex min-h-0 flex-auto flex-col gap-4 overflow-y-auto">
        <StatCardRow cards={statusCards} columns={4} />

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <ChartCard
            title="Candidate Status Breakdown"
            subtitle="Applied, AI Agent Call, AI Video Interview, Panel Interview, Selected, Rejected"
            isLoading={isFunnelLoading}
            available={funnelStages.length > 0}
          >
            <FunnelBars stages={funnelStages} color="#263d92" />
          </ChartCard>

          <ChartCard
            title="Audio / AI / Panel Interviews"
            subtitle="Interviews conducted for this job, by round type"
            available={false}
            unavailableLabel={COMING_SOON_ROUND_TYPE}
          >
            <div />
          </ChartCard>

          <ChartCard
            title="AI Score Distribution"
            subtitle="Candidates grouped by resume-score band"
            span={2}
            isLoading={isScoreDistributionLoading}
            available={resumeScoreData.some((band) => band.Candidates > 0)}
          >
            <ResponsiveContainer width="100%" height={190}>
              <BarChart
                data={resumeScoreData}
                margin={{ top: 8, right: 12, left: -16, bottom: 14 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f7" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#8593ac' }}
                  axisLine={false}
                  tickLine={false}
                  height={30}
                  label={{
                    value: 'Score band',
                    position: 'insideBottom',
                    offset: -2,
                    style: { fontSize: 12, fill: '#8593ac' },
                  }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#8593ac' }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  label={{
                    value: 'Candidates',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 12, fill: '#8593ac', textAnchor: 'middle' },
                  }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid var(--gray-200, #e5e8f0)',
                    fontSize: 12,
                    boxShadow: '0 8px 24px -12px rgba(16,30,54,.18)',
                  }}
                />
                <Bar dataKey="Candidates" fill="#0f9fc4" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </AntdCommonModal>
  );
};

export default JobDetailModal;
