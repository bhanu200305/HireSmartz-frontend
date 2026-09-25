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
  Legend,
} from 'recharts';
import { ChartCard, DonutStat } from '../shared';
import { useGetJobStatsQuery } from '../../api/job-service/JobOpening/GetJobOpening';
import {
  useGetApplicationsOverTimeQuery,
  useGetInterviewsByStatusQuery,
  useGetResumeScoreDistributionQuery,
  type ResumeScoreBand,
} from '../../api/candidate-service/Stats/stats';

// Fixed band order per the Candidate Stats API contract — the response
// array isn't guaranteed to arrive in this order.
const RESUME_SCORE_BAND_ORDER: ResumeScoreBand[] = ['0-2', '2-4', '4-6', '6-8', '8-10'];

// "AUDIO" | "AVATAR" | "VIDEO" — the fixed round-type vocabulary
// interviews-by-status groups by (round_type_classification.py).
const ROUND_TYPES = ['AUDIO', 'AVATAR', 'VIDEO'] as const;
const ROUND_TYPE_COLORS: Record<(typeof ROUND_TYPES)[number], string> = {
  AUDIO: '#263d92',
  AVATAR: '#0f9fc4',
  VIDEO: '#d97706',
};

const COLOR_SUCCESS = '#059669';
const COLOR_WARNING = '#d97706';
const COLOR_NEUTRAL = '#9aa3bc';
const COLOR_ACCENT = '#0f9fc4';

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

// Axis titles, not just tick values — see GrowthAdoptionCharts.tsx's own
// comment on this same pattern (widened Y-axis `width` to fit the title
// without reintroducing the left-edge clipping `ChartCard`'s
// `overflow-hidden` causes when an axis element overflows the card).
const axisTitleStyle = { fontSize: 10, fill: '#8593ac' };
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

const CHART_HEIGHT = 190;

/**
 * Recruiter KPI dashboard charts — Applications over time (line) / Jobs by
 * status (donut) / Interviews by Status & Type (grouped bar) / AI score
 * distribution (global, bar). Every query is org-wide (no `job_opening_id`)
 * — job-service/candidate-service scope a `recruiter` caller to their own
 * jobs server-side, same as `RecruiterStatCards`.
 */
const RecruiterCharts: React.FC = () => {
  const { data: jobStats, isLoading: isJobStatsLoading } = useGetJobStatsQuery();
  const { data: appsOverTime, isLoading: isAppsLoading } = useGetApplicationsOverTimeQuery({
    days: 30,
  });
  const { data: interviewsByStatus, isLoading: isInterviewsLoading } =
    useGetInterviewsByStatusQuery();
  const { data: resumeScoreDistribution, isLoading: isResumeScoreLoading } =
    useGetResumeScoreDistributionQuery();

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

  // Pivot the flat {round_type, status, count}[] into one row per status,
  // one series per round type — what recharts' grouped BarChart needs.
  const interviewsByStatusAndTypeData = useMemo(() => {
    const counts = interviewsByStatus?.counts ?? [];
    const statuses = Array.from(new Set(counts.map((row) => row.status)));
    return statuses.map((status) => {
      const row: Record<string, string | number> = { status: capitalize(status) };
      ROUND_TYPES.forEach((type) => {
        row[type] = counts
          .filter((c) => c.status === status && c.round_type === type)
          .reduce((sum, c) => sum + c.count, 0);
      });
      return row;
    });
  }, [interviewsByStatus]);

  const resumeScoreData = useMemo(() => {
    const byBand = new Map((resumeScoreDistribution?.bands ?? []).map((b) => [b.band, b.count]));
    return RESUME_SCORE_BAND_ORDER.map((band) => ({
      name: band,
      Candidates: byBand.get(band) ?? 0,
    }));
  }, [resumeScoreDistribution]);

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <ChartCard
        title="Applications over time"
        subtitle="Daily application volume, trailing 30 days"
        isLoading={isAppsLoading}
        available={appsOverTimeData.length > 0}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <LineChart data={appsOverTimeData} margin={{ top: 8, right: 12, left: -16, bottom: 14 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f7" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#8593ac' }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
              height={30}
              label={xAxisLabel('Date')}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#8593ac' }}
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

      <ChartCard
        title="Jobs by status"
        subtitle="Current mix of open, closed and draft job openings"
        isLoading={isJobStatsLoading}
        available={Boolean(jobStats) && jobStats!.total_count > 0}
      >
        <DonutStat data={jobsByStatusData} centerLabel="Jobs" />
      </ChartCard>

      <ChartCard
        title="Interviews by Status & Type"
        subtitle="Interview round counts split by Audio / Avatar / Video"
        isLoading={isInterviewsLoading}
        available={interviewsByStatusAndTypeData.length > 0}
        span={2}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart
            data={interviewsByStatusAndTypeData}
            margin={{ top: 8, right: 12, left: -16, bottom: 14 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f7" />
            <XAxis
              dataKey="status"
              tick={{ fontSize: 11, fill: '#8593ac' }}
              axisLine={false}
              tickLine={false}
              height={30}
              label={xAxisLabel('Status')}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#8593ac' }}
              axisLine={false}
              tickLine={false}
              width={48}
              label={yAxisLabel('Interviews')}
            />
            <Tooltip contentStyle={cardTooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {ROUND_TYPES.map((type) => (
              <Bar
                key={type}
                dataKey={type}
                name={capitalize(type)}
                fill={ROUND_TYPE_COLORS[type]}
                radius={[6, 6, 0, 0]}
                maxBarSize={28}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="AI score distribution"
        subtitle="Candidates grouped by resume-score band (global, for triage)"
        isLoading={isResumeScoreLoading}
        available={resumeScoreData.some((band) => band.Candidates > 0)}
        span={2}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={resumeScoreData} margin={{ top: 8, right: 12, left: -16, bottom: 14 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f7" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#8593ac' }}
              axisLine={false}
              tickLine={false}
              height={30}
              label={xAxisLabel('Score band')}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#8593ac' }}
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

export default RecruiterCharts;
