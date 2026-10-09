import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
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
import { ChartCard, DonutStat, HiringPipeline, ScrollableBarChart } from '../shared';
import { RootState } from '../../redux/provider/store';
import { useGetJobStatsQuery } from '../../api/job-service/JobOpening/GetJobOpening';
import {
  useGetJobCountsByDepartmentQuery,
  useGetJobCountsByLocationQuery,
} from '../../api/job-service/JobOpenings/jobOpenings';
import { useListTenantDepartmentsQuery } from '../../api/organization-service/Tenants/departments';
import {
  useListTenantOfficesQuery,
  officeDisplayName,
} from '../../api/organization-service/Tenants/offices';
import {
  useGetHiringFunnelQuery,
  useGetApplicationsOverTimeQuery,
  useGetInterviewsByStatusQuery,
  useGetResumeScoreDistributionQuery,
  RESUME_SCORE_BAND_ORDER,
} from '../../api/candidate-service/Stats/stats';
import { parseCalendarDate } from '../../shared/utils/calendarDate';

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

// Truncates for the axis; full text kept as `fullName` for the tooltip.
const truncateAxisLabel = (value: string, maxLength = 10): string =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;

const formatDay = (isoDate: string): string =>
  parseCalendarDate(isoDate)?.format('MMM D') ?? isoDate;

const cardTooltipStyle = {
  borderRadius: 10,
  border: '1px solid var(--gray-200, #e5e8f0)',
  fontSize: 12,
  boxShadow: '0 8px 24px -12px rgba(16,30,54,.18)',
};

// Axis titles, not just tick values. Y-axis `width` must stay wide enough
// to fit the title, or it clips against ChartCard's `overflow-hidden` —
// same pattern as GrowthAdoptionCharts.tsx.
const axisTitleStyle = { fontSize: 12, fill: '#8593ac' };
const yAxisLabel = (value: string) => ({
  value,
  angle: -90,
  position: 'insideLeft' as const,
  style: { ...axisTitleStyle, textAnchor: 'middle' as const },
});
const xAxisLabel = (value: string) => ({
  value,
  position: 'insideBottom' as const,
  offset: -2,
  style: axisTitleStyle,
});

type HiringOverviewChartsProps = {
  /** 'compact' renders just the one headline chart (Applications over time)
   * at a shorter height — for the Dashboard carousel's preview slide. 'full'
   * (default) is the complete Company Metrics page grid. */
  variant?: 'full' | 'compact';
};

/**
 * 2.1 "Hiring overview" charts — Hiring funnel / Applications over time /
 * Job openings by status / Interviews by status. `job_opening_id` is omitted
 * everywhere here (org-wide) — see `HiringOverviewStats` for the same
 * pattern on the stat-card row above this.
 */
const HiringOverviewCharts: React.FC<HiringOverviewChartsProps> = ({ variant = 'full' }) => {
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);
  const { data: jobStats, isLoading: isJobStatsLoading } = useGetJobStatsQuery();
  const { data: jobsByDepartment, isLoading: isJobsByDepartmentLoading } =
    useGetJobCountsByDepartmentQuery();
  const { data: jobsByLocation, isLoading: isJobsByLocationLoading } =
    useGetJobCountsByLocationQuery();
  // Resolves the opaque department_id/job_location_id ids to display names.
  const { data: departments, isLoading: isDepartmentsLoading } = useListTenantDepartmentsQuery(
    tenantId ?? '',
    { skip: !tenantId }
  );
  const { data: offices, isLoading: isOfficesLoading } = useListTenantOfficesQuery(
    { tenantId: tenantId ?? '' },
    { skip: !tenantId }
  );
  const { data: funnel, isLoading: isFunnelLoading } = useGetHiringFunnelQuery();
  const { data: appsOverTime, isLoading: isAppsLoading } = useGetApplicationsOverTimeQuery({
    days: 30,
  });
  const { data: interviewsByStatus, isLoading: isInterviewsLoading } =
    useGetInterviewsByStatusQuery();
  const { data: resumeScoreDistribution, isLoading: isResumeScoreLoading } =
    useGetResumeScoreDistributionQuery();

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

  const jobsByDepartmentData = useMemo(() => {
    if (!jobsByDepartment) return [];
    const nameById = new Map((departments ?? []).map((d) => [d.org_department_id, d.name]));
    return jobsByDepartment.departments
      .map((row) => {
        const fullName = row.department_id
          ? (nameById.get(row.department_id) ?? 'Unknown')
          : 'Unassigned';
        return { name: truncateAxisLabel(fullName), fullName, 'Job Openings': row.count };
      })
      .sort((a, b) => b['Job Openings'] - a['Job Openings']);
  }, [jobsByDepartment, departments]);

  const jobsByLocationData = useMemo(() => {
    if (!jobsByLocation) return [];
    const nameById = new Map((offices ?? []).map((o) => [o.office_id, officeDisplayName(o)]));
    return jobsByLocation.locations
      .map((row) => {
        const fullName = nameById.get(row.job_location_id) ?? 'Unknown';
        return { name: truncateAxisLabel(fullName), fullName, 'Job Openings': row.count };
      })
      .sort((a, b) => b['Job Openings'] - a['Job Openings']);
  }, [jobsByLocation, offices]);

  const interviewStatusData = useMemo(
    () =>
      (interviewsByStatus?.counts ?? []).map((row) => ({
        name: capitalize(row.status),
        Interviews: row.count,
      })),
    [interviewsByStatus]
  );

  const resumeScoreData = useMemo(() => {
    const byBand = new Map((resumeScoreDistribution?.bands ?? []).map((b) => [b.band, b.count]));
    return RESUME_SCORE_BAND_ORDER.map((band) => ({
      name: band,
      Candidates: byBand.get(band) ?? 0,
    }));
  }, [resumeScoreDistribution]);

  const chartHeight = variant === 'compact' ? 160 : 190;

  const appsOverTimeChart = (
    <ChartCard
      title="Applications Over Time"
      subtitle="Daily application volume, trailing 30 days"
      isLoading={isAppsLoading}
      available={appsOverTimeData.length > 0}
    >
      <ResponsiveContainer width="100%" height={chartHeight}>
        <LineChart
          data={appsOverTimeData}
          margin={{ top: 8, right: 12, left: -16, bottom: variant === 'compact' ? 0 : 14 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f7" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#8593ac' }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
            height={variant === 'compact' ? undefined : 30}
            label={variant === 'compact' ? undefined : xAxisLabel('Date')}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#8593ac' }}
            axisLine={false}
            tickLine={false}
            width={48}
            label={yAxisLabel('Applications')}
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
        title="Job Openings by Status"
        subtitle="Current mix of open, closed and draft job openings"
        isLoading={isJobStatsLoading}
        available={Boolean(jobStats) && jobStats!.total_count > 0}
      >
        <DonutStat data={jobsByStatusData} centerLabel="Job Openings" />
      </ChartCard>

      <ChartCard
        title="Job Openings by Department"
        subtitle="Open, closed and draft job openings, grouped by department"
        isLoading={isJobsByDepartmentLoading || isDepartmentsLoading}
        available={jobsByDepartmentData.length > 0}
      >
        <ScrollableBarChart
          data={jobsByDepartmentData}
          dataKey="Job Openings"
          color={COLOR_PRIMARY}
          height={chartHeight}
          tooltipStyle={cardTooltipStyle}
        />
      </ChartCard>

      <ChartCard
        title="Job Openings by Location"
        subtitle="Open, closed and draft job openings, grouped by office"
        isLoading={isJobsByLocationLoading || isOfficesLoading}
        available={jobsByLocationData.length > 0}
      >
        <ScrollableBarChart
          data={jobsByLocationData}
          dataKey="Job Openings"
          color={COLOR_ACCENT}
          height={chartHeight}
          tooltipStyle={cardTooltipStyle}
        />
      </ChartCard>

      <ChartCard
        title="Hiring Funnel"
        subtitle="Candidate progression and drop-off by stage"
        isLoading={isFunnelLoading}
        available={funnelStages.length > 0}
        span={2}
      >
        <HiringPipeline stages={funnelStages} />
      </ChartCard>

      <ChartCard
        title="Interviews by Status"
        subtitle="Round counts across every open job, not yet split by AI Agent Call / AI Video Interview / Panel Interview"
        isLoading={isInterviewsLoading}
        available={interviewStatusData.length > 0}
      >
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={interviewStatusData}
            margin={{ top: 8, right: 12, left: -16, bottom: 14 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f7" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#8593ac' }}
              axisLine={false}
              tickLine={false}
              height={30}
              label={xAxisLabel('Status')}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: '#8593ac' }}
              axisLine={false}
              tickLine={false}
              width={48}
              label={yAxisLabel('Interviews')}
            />
            <Tooltip contentStyle={cardTooltipStyle} />
            <Bar dataKey="Interviews" fill={COLOR_PRIMARY} radius={[6, 6, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="AI Score Distribution"
        subtitle="Candidates grouped by resume-score band"
        isLoading={isResumeScoreLoading}
        available={resumeScoreData.some((band) => band.Candidates > 0)}
      >
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={resumeScoreData} margin={{ top: 8, right: 12, left: -16, bottom: 14 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f7" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#8593ac' }}
              axisLine={false}
              tickLine={false}
              height={30}
              label={xAxisLabel('Score band')}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: '#8593ac' }}
              axisLine={false}
              tickLine={false}
              width={48}
              label={yAxisLabel('Candidates')}
            />
            <Tooltip contentStyle={cardTooltipStyle} />
            <Bar dataKey="Candidates" fill={COLOR_ACCENT} radius={[6, 6, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

export default HiringOverviewCharts;
