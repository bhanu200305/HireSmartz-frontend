import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { ChartCard, DonutStat, FunnelBars } from '../shared';
import { useGetJobStatsQuery } from '../../api/job-service/JobOpenings/jobOpenings';
import {
  useGetHiringFunnelQuery,
  useGetApplicationsOverTimeQuery,
  useGetInterviewsByStatusQuery,
} from '../../api/candidate-service/Stats/stats';

// Same brand tokens as the Super Admin's GrowthAdoptionCharts (src/theme/index.css)
// — one shared palette across every KPI chart in the app.
const COLOR_PRIMARY = '#263d92';
const COLOR_ACCENT = '#0f9fc4';
const COLOR_SUCCESS = '#059669';
const COLOR_WARNING = '#d97706';
const COLOR_NEUTRAL = '#9aa3bc';

const capitalize = (value: string): string =>
  value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const formatDay = (isoDate: string): string =>
  new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const cardTooltipStyle = {
  borderRadius: 10,
  border: '1px solid var(--gray-200, #e5e8f0)',
  fontSize: 12,
  boxShadow: '0 8px 24px -12px rgba(16,30,54,.18)',
};

type HiringOverviewChartsProps = {
  /** 'compact' renders just the one headline chart (Applications over time)
   * at a shorter height — for the Dashboard carousel's preview slide. 'full'
   * (default) is the complete Company Metrics page grid. */
  variant?: 'full' | 'compact';
};

/**
 * 2.1 "Hiring overview" charts — Hiring funnel / Applications over time /
 * Jobs by status / Interviews by status. `job_opening_id` is omitted
 * everywhere here (org-wide) — see `HiringOverviewStats` for the same
 * pattern on the stat-card row above this.
 */
const HiringOverviewCharts: React.FC<HiringOverviewChartsProps> = ({ variant = 'full' }) => {
  const { data: jobStats, isLoading: isJobStatsLoading } = useGetJobStatsQuery();
  const { data: funnel, isLoading: isFunnelLoading } = useGetHiringFunnelQuery();
  const { data: appsOverTime, isLoading: isAppsLoading } = useGetApplicationsOverTimeQuery({
    days: 30,
  });
  const { data: interviewsByStatus, isLoading: isInterviewsLoading } =
    useGetInterviewsByStatusQuery();

  const funnelStages = useMemo(
    () =>
      (funnel?.stages ?? []).map((stage) => ({
        label: capitalize(stage.stage),
        value: stage.count,
      })),
    [funnel]
  );

  const appsOverTimeData = useMemo(
    () =>
      (appsOverTime?.points ?? []).map((point) => ({
        date: formatDay(point.date),
        Applications: point.count,
      })),
    [appsOverTime]
  );

  const jobsByStatusData = useMemo(() => {
    if (!jobStats) return [];
    return [
      { name: 'Open', value: jobStats.published_count, color: COLOR_SUCCESS },
      { name: 'Closed', value: jobStats.closed_count, color: COLOR_NEUTRAL },
      { name: 'Draft', value: jobStats.draft_count, color: COLOR_WARNING },
    ].filter((slice) => slice.value > 0);
  }, [jobStats]);

  const interviewStatusData = useMemo(
    () =>
      (interviewsByStatus?.counts ?? []).map((row) => ({
        name: capitalize(row.status),
        Interviews: row.count,
      })),
    [interviewsByStatus]
  );

  const chartHeight = variant === 'compact' ? 160 : 190;

  const appsOverTimeChart = (
    <ChartCard
      title="Applications over time"
      subtitle="Daily application volume, trailing 30 days"
      typeTag="Line"
      isLoading={isAppsLoading}
      available={appsOverTimeData.length > 0}
    >
      <ResponsiveContainer width="100%" height={chartHeight}>
        <LineChart data={appsOverTimeData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f7" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#8593ac' }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#8593ac' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip contentStyle={cardTooltipStyle} />
          <Line
            type="monotone"
            dataKey="Applications"
            stroke={COLOR_ACCENT}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );

  if (variant === 'compact') {
    return <div className="grid grid-cols-1 gap-3">{appsOverTimeChart}</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {appsOverTimeChart}

      <ChartCard
        title="Jobs by status"
        subtitle="Current mix of open, closed and draft job openings"
        typeTag="Donut"
        isLoading={isJobStatsLoading}
        available={Boolean(jobStats) && jobStats!.total_count > 0}
      >
        <DonutStat data={jobsByStatusData} centerLabel="Jobs" />
      </ChartCard>

      <ChartCard
        title="Hiring funnel"
        subtitle="Candidate progression and drop-off by stage"
        typeTag="Funnel"
        isLoading={isFunnelLoading}
        available={funnelStages.length > 0}
        span={2}
      >
        <FunnelBars stages={funnelStages} color={COLOR_PRIMARY} />
      </ChartCard>

      <ChartCard
        title="Interviews by status"
        subtitle="Round counts across every open job — not yet split by Audio Round / AI Interview / Panel Interview"
        typeTag="Bar"
        isLoading={isInterviewsLoading}
        available={interviewStatusData.length > 0}
      >
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={interviewStatusData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f7" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#8593ac' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#8593ac' }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip contentStyle={cardTooltipStyle} />
            <Bar dataKey="Interviews" fill={COLOR_PRIMARY} radius={[6, 6, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="AI score distribution"
        subtitle="Candidates grouped by resume-score band"
        typeTag="Bar"
        available={false}
        unavailableLabel="Coming soon — no scoring-distribution endpoint yet."
      >
        <div />
      </ChartCard>
    </div>
  );
};

export default HiringOverviewCharts;
