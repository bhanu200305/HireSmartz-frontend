import React, { useState } from 'react';
import { MdOutlineWorkOutline } from 'react-icons/md';
import { Badge, BadgeStatus, StatCardRow, ChartCard, FunnelBars } from '../shared';
import type { StatCardData } from '../shared';
import { Loader } from '../shared/ui/loader';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import { useGetJobOpeningsQuery } from '../../api/job-service/JobOpenings/jobOpenings';
import type { JobSummary } from '../../api/job-service/JobOpenings/types';
import {
  useGetTotalApplicationsQuery,
  useGetHiringFunnelQuery,
} from '../../api/candidate-service/Stats/stats';
import { useGetInterviewSummaryQuery } from '../../api/interview-service/Dashboard/summary';

const jobStatus = (job: JobSummary): { label: string; badge: BadgeStatus } => {
  if (job.is_closed) return { label: 'Closed', badge: 'neutral' };
  if (job.is_published) return { label: 'Open', badge: 'success' };
  return { label: 'Draft', badge: 'warning' };
};

const daysOpen = (openDate: string | null): string => {
  if (!openDate) return '—';
  const days = Math.max(0, Math.floor((Date.now() - new Date(openDate).getTime()) / 86400000));
  return `${days}d`;
};

const capitalize = (value: string): string =>
  value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const COMING_SOON_ROUND_TYPE =
  'Coming soon — interview-service no longer breaks bookings down by Audio/AI/Panel, only by status.';
const COMING_SOON_SCORE = 'Coming soon — no AI-score endpoint yet.';

/** One job's own KPI popup — real applicant/funnel/applications-over-time
 * numbers (job-scoped candidate-service calls), the interview-summary total
 * this service can actually give (not the Audio/AI/Panel split the doc
 * asks for — see `COMING_SOON_ROUND_TYPE`), and honest "coming soon" for
 * the two AI-score cards no endpoint backs yet. */
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

/**
 * 2.4 "Open jobs" — a real jobs list (job-service's own UUID-based
 * `GET /job-openings`, not the legacy numeric-ID list the "Job Openings"
 * nav page still runs on — see the two systems' write-up), with a per-job
 * KPI popup. Kept as its own section here rather than added to the
 * existing Job Openings page: that page's rows carry a different ID space
 * with no mapping to job-service's real jobs, so a KPI popup attached to
 * it couldn't query real data for the job actually clicked.
 */
const OpenJobsSection: React.FC = () => {
  const { data, isLoading } = useGetJobOpeningsQuery({ page: 1, page_size: 10 });
  const [selectedJob, setSelectedJob] = useState<JobSummary | null>(null);
  const jobs = data?.items ?? [];

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          <MdOutlineWorkOutline />
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold text-neutral-900">Open jobs</h3>
          <p className="text-xs text-neutral-400">Click a job to see its candidate pipeline</p>
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-neutral-400">
              <th className="pb-2 text-xs font-semibold uppercase tracking-wide">Job title</th>
              <th className="pb-2 text-xs font-semibold uppercase tracking-wide">Status</th>
              <th className="pb-2 text-xs font-semibold uppercase tracking-wide">Applicants</th>
              <th className="pb-2 text-xs font-semibold uppercase tracking-wide">Interviews</th>
              <th className="pb-2 text-xs font-semibold uppercase tracking-wide">Days open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {jobs.map((job) => {
              const status = jobStatus(job);
              return (
                <tr key={job.org_job_opening_id}>
                  <td className="py-2">
                    <button
                      type="button"
                      className="font-semibold text-primary transition-colors hover:text-primary-700"
                      onClick={() => setSelectedJob(job)}
                    >
                      {job.title || 'Untitled job'}
                    </button>
                  </td>
                  <td className="py-2">
                    <Badge status={status.badge}>{status.label}</Badge>
                  </td>
                  <td className="py-2 text-neutral-600">{job.candidate_count}</td>
                  <td className="py-2 text-neutral-600">{job.interviewed_count}</td>
                  <td className="py-2 text-neutral-600">{daysOpen(job.job_open_date)}</td>
                </tr>
              );
            })}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-neutral-400">
                  No open jobs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {selectedJob && <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </div>
  );
};

export default OpenJobsSection;
