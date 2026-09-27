import React, { useRef, useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export type ScrollableBarChartDatum = { name: string; fullName?: string } & Record<
  string,
  string | number | undefined
>;

type ScrollableBarChartProps = {
  /** `name` must be pre-truncated for the axis; full text goes in `fullName`
   * for the tooltip — `tickFormatter` proved unreliable for this. */
  data: ScrollableBarChartDatum[];
  /** Which field on each datum the bar reads its height from. */
  dataKey: string;
  color: string;
  height: number;
  tooltipStyle?: React.CSSProperties;
  /** Category count at/below which the chart fills the card at 100% width;
   * past this it switches to fixed-width scrollable bars. */
  visibleBeforeScroll?: number;
};

const PX_PER_BAR = 90;
const SCROLL_STEP = 200;

const tooltipLabel = (label: string, payload: ReadonlyArray<{ payload?: unknown }>): string =>
  (payload?.[0]?.payload as ScrollableBarChartDatum | undefined)?.fullName ?? label;

/** A bar chart with no fixed ceiling on category count — used where the
 * category list is open-ended (e.g. "Jobs by department"/"by location"). */
const ScrollableBarChart: React.FC<ScrollableBarChartProps> = ({
  data,
  dataKey,
  color,
  height,
  tooltipStyle,
  visibleBeforeScroll = 6,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const needsScroll = data.length > visibleBeforeScroll;

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    if (!needsScroll) return;
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      resizeObserver.disconnect();
    };
  }, [needsScroll, updateScrollState, data.length]);

  const scrollBy = (direction: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: direction * SCROLL_STEP, behavior: 'smooth' });
  };

  // Few categories: render as a plain full-width chart, same as any other.
  // Axis/bar elements are duplicated in both branches rather than shared via
  // a JSX variable — Recharts doesn't traverse into a Fragment child, so a
  // shared `<>...</>` silently renders blank.
  if (!needsScroll) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f7" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#8593ac' }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#8593ac' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={tooltipLabel} />
          <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const arrowButtonClass = (enabled: boolean) =>
    clsx(
      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-xs transition-colors',
      enabled ? 'hover:border-primary-200 hover:text-primary-600 cursor-pointer' : 'opacity-30'
    );

  return (
    <div className="flex h-full items-center gap-1">
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scrollBy(-1)}
        disabled={!canScrollLeft}
        className={arrowButtonClass(canScrollLeft)}
      >
        <MdChevronLeft size={16} />
      </button>
      <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto">
        <BarChart
          data={data}
          width={data.length * PX_PER_BAR}
          height={height}
          margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f7" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#8593ac' }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#8593ac' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={tooltipLabel} />
          <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={40} />
        </BarChart>
      </div>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollBy(1)}
        disabled={!canScrollRight}
        className={arrowButtonClass(canScrollRight)}
      >
        <MdChevronRight size={16} />
      </button>
    </div>
  );
};

export default ScrollableBarChart;
