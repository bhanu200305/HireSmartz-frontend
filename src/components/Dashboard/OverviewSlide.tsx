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
        fillHeight && 'flex h-full flex-col'
      )}
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex shrink-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-lg text-primary-600">
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
          'mt-6',
          fillHeight &&
            'flex min-h-0 flex-1 items-center justify-center overflow-y-auto [container-type:size]'
        )}
      >
        {/* Widened from an earlier, tighter cap that left dead margins on
            both sides — this still keeps the 2-column stat-card grid from
            stretching edge-to-edge (which is what made the cards short and
            wide originally), just with less empty space either side of it.

            `[container-type:size]`: turns THIS box into a CSS size query
            container, so `StatCardRow`'s `tall` cards (padding, min-height,
            icon size, value text) can be sized in `cqh` — a percentage of
            THIS box's actual rendered height — instead of fixed pixels. That
            is what makes them genuinely shrink/grow with whatever room the
            carousel stage actually has (a shorter laptop screen, a smaller
            browser window) rather than sitting at one fixed size and either
            leaving dead space or not fitting.

            Fixed pixel cards used to have exactly one failure mode when they
            didn't fit: something has to give, and centering (`items-center`)
            let that overflow bleed both up (over the header — the original
            "overlapping" bug) and down. Fluid sizing removes the OVERFLOW
            itself in all but the most extreme cases, which is what makes
            `items-center` safe to use again here — the perfectly centered
            look this component's own comment used to describe. `overflow-
            y-auto` stays as a last-resort safety net: the cards still have a
            floor (see `StatCardRow`), because shrinking indefinitely trades
            one bug (overlap) for another (illegible text) — past that floor,
            it scrolls instead of overlapping, same as before. */}
        <div className="w-full max-w-2xl">{children}</div>
      </div>

      <div className="mt-6 flex shrink-0 items-center justify-end border-t border-neutral-100 pt-4">
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
