import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartCard } from '../shared';
import {
  useGetAverageResumeScoreByJobQuery,
  useGetPanelInterviewsScheduledByJobQuery,
  useGetSelectedCandidatesByLocationQuery,
} from '../../api/candidate-service/Stats/stats';
import { useJobOpeningNameMap, jobDisplayName } from './useJobOpeningNameMap';
import { AI_SCORE_MAX } from '../JobsOpening/Candidates/roundPipeline';

const COLOR_PRIMARY = '#263d92';
const COLOR_ACCENT = '#0f9fc4';
const COLOR_SUCCESS = '#059669';

const cardTooltipStyle = {
  borderRadius: 10,
  border: '1px solid var(--gray-200, #e5e8f0)',
  fontSize: 12,
  boxShadow: '0 8px 24px -12px rgba(16,30,54,.18)',
};

const CHART_HEIGHT = 210;

// Job titles are shown at full length in nothing else on this dashboard —
// rotated (`angle={-20}`) so more fit before overlapping, but with no cap a
// long one still overflows the card's left edge and gets clipped by
// `ChartCard`'s `overflow-hidden`. Truncating just the axis tick (not the
// underlying `job` field) keeps the full name in the tooltip on hover —
// Recharts' `tickFormatter` only touches the rendered tick text, never the
// `<Tooltip>`'s own label. The cap itself scales with how many bars are on
// screen: with only 1-2 jobs there's plenty of width per label (a title
// like "Senior Software Engineer" should read in full), but once several
// jobs share the same row width, longer labels start overlapping each
// other rather than the card edge, so the cap tightens.
const axisLabelCharsFor = (barCount: number): number => {
  if (barCount <= 2) return 32;
  if (barCount <= 4) return 22;
  return 18;
};
const truncateAxisLabel = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

/**
 * Rotated X-axis job-name tick, used instead of `tickFormatter` so a
 * truncated label can carry the untruncated name as a native SVG `<title>`
 * — hovering the tick text itself (not just its bar) pops the browser's own
 * tooltip with the full job title. `tickFormatter` alone (the previous
 * approach) can't do this: it only ever produces a plain string, with
 * nowhere to attach a hover target.
 */
const RotatedAxisTick = (barCount: number) => {
  const Tick = ({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) => {
    const value = payload?.value ?? '';
    const truncated = truncateAxisLabel(value, axisLabelCharsFor(barCount));
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={10}
          textAnchor="end"
          transform="rotate(-35)"
          fontSize={12}
          fill="#8593ac"
        >
          {truncated}
          {truncated !== value && <title>{value}</title>}
        </text>
      </g>
    );
  };
  return Tick;
};

// Axis titles, not just tick values — see GrowthAdoptionCharts.tsx's own
// comment on this same pattern (widened Y-axis `width` to fit the title
// without reintroducing the left-edge clipping `ChartCard`'s
// `overflow-hidden` causes when an axis element overflows the card).
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

/**
 * Hiring Manager KPI dashboard charts — Panel interviews scheduled per job
 * (bar) / Avg AI score per job (bar) / Hiring by location (horizontal
 * bar). Every candidate-service query omits `job_opening_id` — a hiring
 * manager caller is auto-scoped to their own assigned jobs server-side
 * (`resolve_stats_job_scope`), same as the stat cards above.
 */
const HiringManagerCharts: React.FC = () => {
  const { jobNameMap, isLoading: isJobNamesLoading } = useJobOpeningNameMap();
  const { data: panelByJob, isLoading: isPanelLoading } =
    useGetPanelInterviewsScheduledByJobQuery();
  const { data: avgScoreByJob, isLoading: isAvgScoreLoading } =
    useGetAverageResumeScoreByJobQuery();
  const { data: byLocation, isLoading: isLocationLoading } =
    useGetSelectedCandidatesByLocationQuery();

  const panelData = useMemo(
    () =>
      (panelByJob?.jobs ?? []).map((row) => ({
        job: jobDisplayName(jobNameMap, row.job_opening_id),
        Scheduled: row.count,
      })),
    [panelByJob, jobNameMap]
  );

  const avgScoreData = useMemo(
    () =>
      (avgScoreByJob?.jobs ?? []).map((row) => ({
        job: jobDisplayName(jobNameMap, row.job_opening_id),
        'Avg AI score': Math.round(row.average * 10) / 10,
      })),
    [avgScoreByJob, jobNameMap]
  );

  const locationData = useMemo(
    () =>
      [...(byLocation?.locations ?? [])]
        .sort((a, b) => b.count - a.count)
        .map((row) => ({ location: row.location, Selected: row.count })),
    [byLocation]
  );

  const isLoadingJobCharts = isJobNamesLoading || isPanelLoading || isAvgScoreLoading;

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <ChartCard
        title="Panel Interview (scheduled) per job"
        subtitle="Candidates currently sitting at a scheduled Panel round, by job"
        isLoading={isLoadingJobCharts}
        available={panelData.length > 0}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={panelData} margin={{ top: 8, right: 12, left: 8, bottom: 14 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f7" />
            <XAxis
              dataKey="job"
              tick={RotatedAxisTick(panelData.length)}
              axisLine={false}
              tickLine={false}
              interval={0}
              height={96}
              label={xAxisLabel('Job')}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: '#8593ac' }}
              axisLine={false}
              tickLine={false}
              width={48}
              label={yAxisLabel('Scheduled')}
            />
            <Tooltip contentStyle={cardTooltipStyle} />
            <Bar dataKey="Scheduled" fill={COLOR_PRIMARY} radius={[6, 6, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Avg AI score (per job)"
        subtitle="Average resume score across scored candidates, by job"
        isLoading={isLoadingJobCharts}
        available={avgScoreData.length > 0}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={avgScoreData} margin={{ top: 8, right: 12, left: 8, bottom: 14 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f7" />
            <XAxis
              dataKey="job"
              tick={RotatedAxisTick(avgScoreData.length)}
              axisLine={false}
              tickLine={false}
              interval={0}
              height={96}
              label={xAxisLabel('Job')}
            />
            <YAxis
              domain={[0, AI_SCORE_MAX]}
              ticks={[0, 1, 2, 3, 4, 5]}
              tick={{ fontSize: 12, fill: '#8593ac' }}
              axisLine={false}
              tickLine={false}
              width={48}
              label={yAxisLabel('Avg score')}
            />
            <Tooltip contentStyle={cardTooltipStyle} />
            <Bar dataKey="Avg AI score" fill={COLOR_ACCENT} radius={[6, 6, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Hiring by Location"
        subtitle="Selected candidates, grouped by resume-derived location"
        isLoading={isLocationLoading}
        available={locationData.length > 0}
        span={2}
      >
        <ResponsiveContainer width="100%" height={Math.max(CHART_HEIGHT, locationData.length * 32)}>
          <BarChart
            data={locationData}
            layout="vertical"
            margin={{ top: 8, right: 24, left: 8, bottom: 14 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef1f7" />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 12, fill: '#8593ac' }}
              axisLine={false}
              tickLine={false}
              height={30}
              label={xAxisLabel('Selected candidates')}
            />
            <YAxis
              type="category"
              dataKey="location"
              tick={{ fontSize: 12, fill: '#8593ac' }}
              axisLine={false}
              tickLine={false}
              width={128}
              label={yAxisLabel('Location')}
            />
            <Tooltip contentStyle={cardTooltipStyle} />
            <Bar dataKey="Selected" fill={COLOR_SUCCESS} radius={[0, 6, 6, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

export default HiringManagerCharts;
