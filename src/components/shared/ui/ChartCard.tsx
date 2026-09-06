import React, { ReactNode } from 'react';
import clsx from 'clsx';
import { Typography } from './Typography';
import { Loader } from './loader';

type ChartCardProps = {
  title: string;
  subtitle?: string;
  /** Small caption in the top-right corner, e.g. "Line", "Donut", "Bar". */
  typeTag?: string;
  isLoading?: boolean;
  /** `false` renders the "not available" state instead of `children` — used
   * both for a genuinely down dependency (auth-service, etc.) and for a
   * metric that isn't wired up yet (pass `unavailableLabel="Coming soon"`
   * for the latter) — never a fake empty chart either way. */
  available?: boolean;
  unavailableLabel?: string;
  span?: 1 | 2;
  children: ReactNode;
};

/**
 * Shared chart-tile shell used across every KPI dashboard (Platform Metrics,
 * Company Metrics, the home-page overview slides) — rounded-xl border,
 * hairline shadow, white surface, so every one of these sections reads as
 * one system rather than a per-page bolted-on look. Same hover "pop" (lift + gradient
 * wash) as `StatCard` — one brand gradient here rather than a per-variant
 * one, since a chart tile has no color of its own the way a stat card's
 * icon badge does.
 */
const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  typeTag,
  isLoading,
  available = true,
  unavailableLabel = 'Not available yet.',
  span,
  children,
}) => (
  <div
    className={clsx(
      'group relative flex h-full flex-col gap-2 overflow-hidden rounded-xl border border-neutral-200 bg-white p-4 shadow-xs',
      'transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg',
      span === 2 && 'xl:col-span-2'
    )}
  >
    <span
      className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-accent-50 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      aria-hidden
    />
    <div className="relative flex items-start justify-between gap-3">
      <div>
        <Typography variant="subtitle2" className="font-semibold text-neutral-900">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" className="mt-0.5 block text-neutral-400">
            {subtitle}
          </Typography>
        )}
      </div>
      {typeTag && (
        <span className="shrink-0 rounded-md border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
          {typeTag}
        </span>
      )}
    </div>

    <div className="relative min-h-[190px] flex-1">
      {isLoading ? (
        <div className="flex h-full min-h-[190px] items-center justify-center">
          <Loader />
        </div>
      ) : available ? (
        children
      ) : (
        <div className="flex h-full min-h-[190px] items-center justify-center">
          <Typography variant="body2" className="text-neutral-400">
            {unavailableLabel}
          </Typography>
        </div>
      )}
    </div>
  </div>
);

export default ChartCard;
