import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartCard, DonutStat, FunnelBars } from '../shared';
import {
  useGetGrowthMetricsQuery,
  useGetLeadConversionMetricsQuery,
  useGetLoginMetricsQuery,
  useGetMfaMetricsQuery,
  useGetSessionMetricsQuery,
} from '../../api/organization-service/Platform/metrics';
import { parseCalendarDate } from '../../shared/utils/calendarDate';

// Brand tokens (src/theme/index.css) — no new colors introduced, same
// palette every other chart/badge in the app already draws from.
const COLOR_PRIMARY = '#fe7725';
const COLOR_ACCENT = '#e5661f';
const COLOR_SUCCESS = '#059669';
const COLOR_WARNING = '#d97706';
const COLOR_DANGER = '#dc2626';
const COLOR_NEUTRAL = '#9aa3bc';

const STATUS_COLORS: Record<string, string> = {
  active: COLOR_SUCCESS,
  pending: COLOR_WARNING,
  pre_approved: COLOR_WARNING,
  draft: COLOR_NEUTRAL,
  suspended: COLOR_DANGER,
};

const formatMonthPeriod = (period: string): string => {
  // "YYYY-MM" -> "Mon 'YY"
  const [year, month] = period.split('-');
  if (!year || !month) return period;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const formatBucketMonth = (isoDate: string): string =>
  parseCalendarDate(isoDate)?.format('MMM YY') ?? isoDate;

const capitalize = (value: string): string =>
  value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const cardTooltipStyle = {
  borderRadius: 10,
  border: '1px solid var(--gray-200, #e5e8f0)',
  fontSize: 12,
  boxShadow: '0 8px 24px -12px rgba(16,30,54,.18)',
};

// Axis titles, not just tick values — `insideLeft`/`insideBottom` keep them
// inside the plot area (rather than past it, where `ChartCard`'s
// `overflow-hidden` would clip them the same way the bare tick labels used
// to before the Y-axis `width` was widened here to make room).
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

type GrowthAdoptionChartsProps = {
  /** 'compact' renders just the one headline chart (Customer growth trend)
   * at a shorter height — for the Dashboard carousel's preview slide, which
   * has nowhere near the vertical room for all seven. 'full' (default) is
   * the complete Platform Metrics page grid. */
  variant?: 'full' | 'compact';
};

/**
 * 1.2 "Growth & adoption" — seven charts, each backed by an already-live
 * organization-service endpoint (growth / lead-conversion / logins /
 * sessions / mfa). No backend work needed here: every field this section
 * reads is already returned by those five endpoints today.
 */
const GrowthAdoptionCharts: React.FC<GrowthAdoptionChartsProps> = ({ variant = 'full' }) => {
  const { data: growth, isLoading: isGrowthLoading } = useGetGrowthMetricsQuery();
  const { data: leadConversion, isLoading: isLeadLoading } = useGetLeadConversionMetricsQuery();
  const { data: sessions, isLoading: isSessionsLoading } = useGetSessionMetricsQuery();
  const { data: mfa, isLoading: isMfaLoading } = useGetMfaMetricsQuery({ windowDays: 30 });
  // One call, bucket='year' (twelve monthly bars), shared by both the
  // adoption-trend area chart and the authentication-health stacked column.
  const { data: loginsTrend, isLoading: isLoginsTrendLoading } = useGetLoginMetricsQuery({
    bucket: 'year',
  });

  const growthTrendData = useMemo(
    () =>
      (growth?.customer_growth_trend ?? []).map((point) => ({
        period: formatMonthPeriod(point.period),
        'New tenants': point.new_tenants,
      })),
    [growth]
  );

  const orgStatusData = useMemo(
    () =>
      Object.entries(growth?.tenants_by_status ?? {})
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({
          name: capitalize(status),
          value: count,
          color: STATUS_COLORS[status] ?? COLOR_NEUTRAL,
        })),
    [growth]
  );

  const leadFunnelStages = useMemo(() => {
    if (!leadConversion) return [];
    return [
      { label: 'Total Leads', value: leadConversion.total_leads },
      { label: 'Converted to Tenant', value: leadConversion.total_converted },
    ];
  }, [leadConversion]);

  const adoptionTrendData = useMemo(
    () =>
      (loginsTrend?.buckets ?? []).map((bucket) => ({
        period: formatBucketMonth(bucket.bucket_start),
        'Active users': bucket.distinct_users,
      })),
    [loginsTrend]
  );

  const authHealthData = useMemo(
    () =>
      (loginsTrend?.buckets ?? []).map((bucket) => ({
        period: formatBucketMonth(bucket.bucket_start),
        Successful: bucket.success,
        Failed: bucket.failure,
      })),
    [loginsTrend]
  );

  const mfaData = useMemo(() => {
    if (!mfa) return [];
    return [
      { name: 'Successful', value: mfa.succeeded, color: COLOR_SUCCESS },
      { name: 'Unsuccessful', value: mfa.failed, color: COLOR_DANGER },
    ].filter((slice) => slice.value > 0);
  }, [mfa]);

  const deviceUsageData = useMemo(
    () =>
      (sessions?.by_device ?? [])
        .map((device) => ({ name: capitalize(device.device_type), Sessions: device.sessions }))
        .sort((a, b) => b.Sessions - a.Sessions),
    [sessions]
  );

  const chartHeight = variant === 'compact' ? 160 : 190;

  const growthTrendChart = (
    <ChartCard
      title="Customer Growth Trend"
      subtitle="Pace of customer acquisition over time"
      isLoading={isGrowthLoading}
      available={growthTrendData.length > 0}
    >
      <ResponsiveContainer width="100%" height={chartHeight}>
        <LineChart
          data={growthTrendData}
          margin={{ top: 8, right: 12, left: -16, bottom: variant === 'compact' ? 0 : 14 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f7" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 12, fill: '#8593ac' }}
            axisLine={false}
            tickLine={false}
            height={variant === 'compact' ? undefined : 30}
            label={variant === 'compact' ? undefined : xAxisLabel('Month')}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#8593ac' }}
            axisLine={false}
            tickLine={false}
            width={48}
            label={yAxisLabel('New tenants')}
          />
          <Tooltip contentStyle={cardTooltipStyle} />
          <Line
            type="monotone"
            dataKey="New tenants"
            stroke={COLOR_PRIMARY}
            strokeWidth={2.5}
            dot={{ r: 3, fill: COLOR_PRIMARY }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );

  if (variant === 'compact') {
    return <div className="grid grid-cols-1 gap-3">{growthTrendChart}</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {growthTrendChart}

      <ChartCard
        title="Organization Status"
        subtitle="Active vs suspended vs pending tenant organizations"
        isLoading={isGrowthLoading}
        available={orgStatusData.length > 0}
      >
        <DonutStat data={orgStatusData} centerLabel="Tenants" />
      </ChartCard>

      <ChartCard
        title="Lead → Confirmed Tenant"
        subtitle={
          leadConversion
            ? `Conversion through the sales pipeline · ${(leadConversion.conversion_rate * 100).toFixed(1)}% converted`
            : 'Conversion through the sales pipeline'
        }
        isLoading={isLeadLoading}
        available={Boolean(leadConversion) && leadConversion!.total_leads > 0}
      >
        <FunnelBars stages={leadFunnelStages} color={COLOR_ACCENT} />
      </ChartCard>

      <ChartCard
        title="User Adoption Trend"
        subtitle="Unique users actively accessing CFP over time"
        isLoading={isLoginsTrendLoading}
        available={Boolean(loginsTrend?.available) && adoptionTrendData.length > 0}
        unavailableLabel="Unavailable: authentication-service didn't answer."
      >
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart data={adoptionTrendData} margin={{ top: 8, right: 12, left: -16, bottom: 14 }}>
            <defs>
              <linearGradient id="adoptionFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLOR_SUCCESS} stopOpacity={0.35} />
                <stop offset="95%" stopColor={COLOR_SUCCESS} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f7" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 12, fill: '#8593ac' }}
              axisLine={false}
              tickLine={false}
              height={30}
              label={xAxisLabel('Month')}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: '#8593ac' }}
              axisLine={false}
              tickLine={false}
              width={48}
              label={yAxisLabel('Active users')}
            />
            <Tooltip contentStyle={cardTooltipStyle} />
            <Area
              type="monotone"
              dataKey="Active users"
              stroke={COLOR_SUCCESS}
              strokeWidth={2.5}
              fill="url(#adoptionFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Authentication Health"
        subtitle="Successful vs failed login attempts by month"
        isLoading={isLoginsTrendLoading}
        available={Boolean(loginsTrend?.available) && authHealthData.length > 0}
        unavailableLabel="Unavailable: authentication-service didn't answer."
      >
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={authHealthData} margin={{ top: 8, right: 12, left: -16, bottom: 14 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f7" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 12, fill: '#8593ac' }}
              axisLine={false}
              tickLine={false}
              height={30}
              label={xAxisLabel('Month')}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: '#8593ac' }}
              axisLine={false}
              tickLine={false}
              width={48}
              label={yAxisLabel('Logins')}
            />
            <Tooltip contentStyle={cardTooltipStyle} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span className="text-xs text-neutral-600">{value}</span>}
            />
            <Bar
              dataKey="Successful"
              stackId="auth"
              fill={COLOR_SUCCESS}
              radius={[0, 0, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="Failed"
              stackId="auth"
              fill={COLOR_DANGER}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="MFA Success"
        subtitle="Successful vs unsuccessful MFA attempts"
        isLoading={isMfaLoading}
        available={Boolean(mfa?.available) && mfa!.total > 0}
        unavailableLabel="Unavailable: authentication-service didn't answer."
      >
        <DonutStat data={mfaData} centerLabel="Attempts" />
      </ChartCard>

      <ChartCard
        title="Platform Usage by Device"
        subtitle="Active sessions broken down by device type"
        isLoading={isSessionsLoading}
        available={Boolean(sessions?.available) && deviceUsageData.length > 0}
        unavailableLabel="Unavailable: authentication-service didn't answer."
        span={2}
      >
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={deviceUsageData}
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
              label={xAxisLabel('Sessions')}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={118}
              tick={{ fontSize: 12, fill: '#4c5c78' }}
              axisLine={false}
              tickLine={false}
              label={yAxisLabel('Device')}
            />
            <Tooltip contentStyle={cardTooltipStyle} />
            <Bar dataKey="Sessions" fill={COLOR_ACCENT} radius={[0, 6, 6, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

export default GrowthAdoptionCharts;
