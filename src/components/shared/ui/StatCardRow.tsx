'use client';

import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { formatStatValue } from '../../../shared/utils/methods';

export type StatCardVariant = 'neutral' | 'orange' | 'blue' | 'green';

export interface StatCardDelta {
  /** e.g. "2 this month" — rendered next to the direction arrow. Only ever
   * pass this when the number is real; there's no synthetic "vs last
   * period" comparison to fall back on, so omit `delta` entirely rather
   * than invent one. */
  label: string;
  direction: 'up' | 'down';
}

export interface StatCardData {
  icon?: ReactNode;
  label: ReactNode;
  value: string | number | null | undefined;
  variant?: StatCardVariant;
  /** Renders the card as a router Link. Mutually exclusive with onClick. */
  href?: string;
  /** Renders the card as a button for handlers that do more than navigate (e.g. also set filters). */
  onClick?: () => void;
  /** A real month-over-month (or similar) change — omit rather than fabricate. */
  delta?: StatCardDelta;
  /** Optional content below the value (e.g. a caveat line) — never part of the href/onClick target. */
  footer?: ReactNode;
}

interface StatCardRowProps {
  cards: StatCardData[];
  className?: string;
  /** Fixed column count at the `sm`/`xl` breakpoints (2 always on mobile) —
   * evenly fills the row instead of `auto-fit`'s minmax wrap, which leaves a
   * half-empty last row whenever the card count doesn't divide evenly into
   * however many 200px columns happen to fit. Omit to keep the auto-fit
   * behavior. */
  columns?: 2 | 3 | 4;
  /** Gives each card a taller minimum height with its content vertically
   * centered — for a 2-column grid in a capped-width container (the
   * Dashboard carousel slide), where a squarish tile reads better than a
   * short wide one. */
  tall?: boolean;
}

const COLUMN_CLASSES: Record<2 | 3 | 4, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 xl:grid-cols-3',
  4: 'sm:grid-cols-2 xl:grid-cols-4',
};

// Brand-token badge/accent pairs (src/theme/index.css) — one small spot of
// color per card (icon badge + top accent bar) at rest; the gradient/glow
// pairs only show up on hover, so a row of four still reads calmly as one
// group until you're actually pointing at one of them. Two gradient
// strengths: `hoverGradient` (subtle, the full Metrics-page cards) and
// `hoverGradientTall` (richer/more saturated — the Dashboard carousel's
// "tall" cards, which asked for more shine specifically), plus a colored
// glow shadow only the tall cards use.
const VARIANT_STYLES: Record<
  StatCardVariant,
  {
    badge: string;
    accent: string;
    hoverGradient: string;
    hoverGradientTall: string;
    hoverBorder: string;
    hoverGlow: string;
  }
> = {
  neutral: {
    badge: 'bg-neutral-900 text-white',
    accent: 'bg-neutral-400',
    hoverGradient: 'from-neutral-100 via-white to-white',
    hoverGradientTall: 'from-neutral-200 via-neutral-50 to-white',
    hoverBorder: 'group-hover:border-neutral-400',
    hoverGlow: 'group-hover:shadow-[0_12px_28px_-8px_rgba(23,26,31,0.35)]',
  },
  orange: {
    badge: 'bg-warning text-white',
    accent: 'bg-warning',
    hoverGradient: 'from-warning-bg via-white to-white',
    hoverGradientTall: 'from-warning/25 via-warning-bg to-white',
    hoverBorder: 'group-hover:border-warning',
    hoverGlow: 'group-hover:shadow-[0_12px_28px_-8px_rgba(217,119,6,0.4)]',
  },
  blue: {
    badge: 'bg-primary-600 text-white',
    accent: 'bg-primary-600',
    hoverGradient: 'from-primary-50 via-white to-white',
    hoverGradientTall: 'from-primary-200 via-primary-50 to-white',
    hoverBorder: 'group-hover:border-primary-300',
    hoverGlow: 'group-hover:shadow-[0_12px_28px_-8px_rgba(38,61,146,0.4)]',
  },
  green: {
    badge: 'bg-success text-white',
    accent: 'bg-success',
    hoverGradient: 'from-success-bg via-white to-white',
    hoverGradientTall: 'from-success/25 via-success-bg to-white',
    hoverBorder: 'group-hover:border-success',
    hoverGlow: 'group-hover:shadow-[0_12px_28px_-8px_rgba(5,150,105,0.4)]',
  },
};

const StatCard = ({
  icon,
  label,
  value,
  variant = 'blue',
  href,
  onClick,
  delta,
  footer,
  tall,
}: StatCardData & { tall?: boolean }) => {
  const styles = VARIANT_STYLES[variant];
  const displayValue = formatStatValue(value);
  const isPlaceholder = displayValue === 'Not enough data yet';

  const core = (
    <div className={clsx('flex items-start', tall ? 'gap-[clamp(0.375rem,3cqh,0.75rem)]' : 'gap-3')}>
      {icon && (
        <div
          className={clsx(
            'flex shrink-0 items-center justify-center rounded-lg text-base',
            // cqh-based size for tall cards, fixed otherwise — see the
            // tall-card comment below.
            tall ? 'size-[clamp(20px,9cqh,32px)]' : 'h-9 w-9',
            styles.badge
          )}
          aria-hidden
        >
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className={clsx(tall ? 'text-[clamp(12px,4cqh,14px)]' : 'text-sm', 'text-neutral-500')}>
          {label}
        </p>
        <p
          className={clsx(
            'font-display font-bold tracking-tight',
            tall ? 'mt-[clamp(2px,2cqh,4px)]' : 'mt-1',
            isPlaceholder
              ? 'text-sm font-medium text-neutral-400 italic'
              : clsx(
                  'leading-none text-neutral-900',
                  tall ? 'text-[clamp(14px,6cqh,20px)]' : 'text-[26px]'
                )
          )}
        >
          {displayValue}
        </p>
        {delta && !isPlaceholder && (
          <p
            className={clsx(
              'mt-1.5 flex items-center gap-1 text-xs font-medium',
              delta.direction === 'up' ? 'text-success' : 'text-danger'
            )}
          >
            <span aria-hidden>{delta.direction === 'up' ? '▲' : '▼'}</span>
            {delta.label}
          </p>
        )}
      </div>
    </div>
  );

  const interactiveCore = href ? (
    <Link to={href} className="block">
      {core}
    </Link>
  ) : onClick ? (
    <button type="button" onClick={onClick} className="block w-full text-left cursor-pointer">
      {core}
    </button>
  ) : (
    core
  );

  return (
    <div
      className={clsx(
        'group relative overflow-hidden bg-white flex flex-col gap-2 h-full',
        'transition-all duration-200 ease-out hover:-translate-y-0.5',
        tall
          ? clsx(
              // cqh-based sizing off OverviewSlide's query container, so
              // two rows fill whatever height the carousel gives it, down
              // to a 38px floor and capped at the old fixed 100px.
              'rounded-xl border border-neutral-300 p-[clamp(0.25rem,8cqh,1rem)] min-h-[clamp(38px,calc(50cqh_-_16px),100px)] justify-center',
              styles.hoverBorder,
              styles.hoverGlow
            )
          : clsx('rounded-xl border border-neutral-200 p-4 hover:shadow-lg', styles.hoverBorder)
      )}
    >
      {/* Gradient wash — hidden at rest, fades in on hover so the card "pops".
          Tall (Dashboard carousel) cards get the richer, more saturated
          version. */}
      <span
        className={clsx(
          'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-200 group-hover:opacity-100',
          tall ? styles.hoverGradientTall : styles.hoverGradient
        )}
        aria-hidden
      />
      {tall && (
        // Diagonal shine — a bright band that sweeps across the card on
        // hover, on top of the gradient wash for the extra "shiny" pop.
        <span
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 transition-all duration-700 ease-out group-hover:translate-x-[420%] group-hover:opacity-100"
          aria-hidden
        />
      )}
      <span className={clsx('absolute inset-x-0 top-0 h-[3px]', styles.accent)} aria-hidden />
      <div className="relative">{interactiveCore}</div>
      {footer && <div className="relative">{footer}</div>}
    </div>
  );
};

export const StatCardRow = ({ cards, className, columns, tall }: StatCardRowProps) => {
  return (
    <div
      className={clsx(
        'grid grid-cols-1',
        tall ? 'gap-[clamp(0.375rem,3cqh,0.75rem)]' : 'gap-3',
        columns && COLUMN_CLASSES[columns],
        className
      )}
      style={columns ? undefined : { gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
    >
      {cards.map((card, index) => (
        <StatCard key={index} {...card} tall={tall} />
      ))}
    </div>
  );
};
