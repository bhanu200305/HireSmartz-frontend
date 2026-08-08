'use client';

import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { formatStatValue } from '../../../shared/utils/methods';

export type StatCardVariant = 'neutral' | 'orange' | 'blue' | 'green';

export interface StatCardData {
  icon: ReactNode;
  label: ReactNode;
  value: string | number | null | undefined;
  variant: StatCardVariant;
  /** Renders the card as a router Link. Mutually exclusive with onClick. */
  href?: string;
  /** Renders the card as a button for handlers that do more than navigate (e.g. also set filters). */
  onClick?: () => void;
  /** Optional content below the value (e.g. a breakdown line) — never part of the href/onClick target. */
  footer?: ReactNode;
}

interface StatCardRowProps {
  cards: StatCardData[];
  className?: string;
}

// Background/badge pairs sourced from the existing brand tokens
// (src/theme/index.css) — no new colors introduced.
const VARIANT_STYLES: Record<StatCardVariant, { card: string; badge: string }> = {
  neutral: { card: 'bg-neutral-50', badge: 'bg-neutral-900 text-white' },
  orange: { card: 'bg-warning-bg', badge: 'bg-warning text-white' },
  blue: { card: 'bg-primary-50', badge: 'bg-primary-600 text-white' },
  green: { card: 'bg-success-bg', badge: 'bg-success text-white' },
};

const StatCard = ({ icon, label, value, variant, href, onClick, footer }: StatCardData) => {
  const styles = VARIANT_STYLES[variant];
  const displayValue = formatStatValue(value);
  const isPlaceholder = displayValue === 'Not enough data yet';

  const core = (
    <div className="flex flex-col gap-4">
      <div
        className={clsx(
          'w-10 h-10 rounded-lg flex items-center justify-center text-lg',
          styles.badge
        )}
        aria-hidden
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-600">{label}</p>
        <p
          className={clsx(
            'font-display font-bold tracking-tight mt-1',
            isPlaceholder
              ? 'text-sm font-medium text-neutral-400 italic'
              : 'text-2xl text-neutral-900'
          )}
        >
          {displayValue}
        </p>
      </div>
    </div>
  );

  const interactiveCore = href ? (
    <Link to={href} className="block hover:opacity-90 transition-opacity">
      {core}
    </Link>
  ) : onClick ? (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left hover:opacity-90 transition-opacity cursor-pointer"
    >
      {core}
    </button>
  ) : (
    core
  );

  return (
    <div className={clsx('rounded-xl p-5 flex flex-col gap-4 h-full', styles.card)}>
      {interactiveCore}
      {footer}
    </div>
  );
};

export const StatCardRow = ({ cards, className }: StatCardRowProps) => {
  return (
    <div
      className={clsx('grid gap-4', className)}
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
    >
      {cards.map((card, index) => (
        <StatCard key={index} {...card} />
      ))}
    </div>
  );
};
