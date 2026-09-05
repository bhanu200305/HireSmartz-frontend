import React, { ReactNode } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { Typography } from '../shared';

type OverviewSlideProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  /** Route to the full KPI page (Platform Metrics / Company Metrics) —
   * rendered as a "View full report" link, same idiom as `CustomerTable`'s
   * own `onViewAll`/`TableFooter` below it. */
  viewAllHref: string;
  children: ReactNode;
  /** When true, the card stretches to fill its parent's height instead of sizing to content — same convention as `InterviewDashboard`/`CustomerTable`'s own `fillHeight` prop. */
  fillHeight?: boolean;
};

/**
 * Shared shell for the Dashboard carousel's KPI-overview slide (Platform
 * Overview for Super Admin, Hiring Overview for a Company Admin). Just the
 * four stat cards — no chart, no scroll — same "preview here, full depth on
 * its own page" pattern every other slide in this carousel already follows
 * (`CustomerTable` shows 5 rows + "View all"), reached via `viewAllHref`.
 * The body is the flex-1 element (not the footer via `mt-auto`) so the four
 * cards sit vertically centered in whatever room `fillHeight` gives this
 * card, instead of clustering at the top with one big dead gap above the
 * footer.
 */
const OverviewSlide: React.FC<OverviewSlideProps> = ({
  icon,
  title,
  subtitle,
  viewAllHref,
  children,
  fillHeight,
}) => {
  const navigate = useNavigate();

  return (
    <div
      className={clsx(
        'w-full rounded-xl border bg-white p-6 shadow-xs',
        fillHeight && 'flex h-full flex-col [container-type:size]'
      )}
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Header/footer chrome scales with the card's own height (`cqh`), so
          it yields room to the stat grid on short screens. */}
      <div className="flex shrink-0 items-start gap-3">
        <div className="flex size-[clamp(32px,10cqh,44px)] shrink-0 items-center justify-center rounded-xl bg-primary-50 text-lg text-primary-600">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-neutral-900">{title}</h2>
          <Typography variant="caption" className="mt-0.5 block text-neutral-400">
            {subtitle}
          </Typography>
        </div>
      </div>

      <div
        className={clsx(
          'mt-[clamp(0.75rem,3cqh,1.5rem)]',
          fillHeight &&
            'flex min-h-0 flex-1 items-center justify-center overflow-y-hidden [container-type:size]'
        )}
      >
        {/* `[container-type:size]` lets `StatCardRow`'s `tall` cards size
            themselves in `cqh` off this box's real height. `overflow-y-
            hidden` is a last-resort floor past which the grid clips
            silently instead of scrolling or overlapping the header. */}
        <div className="w-full max-w-2xl">{children}</div>
      </div>

      <div className="mt-[clamp(0.75rem,3cqh,1.5rem)] flex shrink-0 items-center justify-end border-t border-neutral-100 pt-[clamp(0.5rem,2cqh,1rem)]">
        <button
          type="button"
          onClick={() => navigate(viewAllHref)}
          className="group flex items-center gap-1 text-xs font-semibold tracking-wide text-primary uppercase transition-colors hover:text-primary-700"
        >
          View full report
          <span className="text-accent-400 transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </button>
      </div>
    </div>
  );
};

export default OverviewSlide;
