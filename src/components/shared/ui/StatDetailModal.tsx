import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import AntdCommonModal from './AntdCommonModal';
import type { StatCardVariant } from './StatCardRow';
import { formatStatValue } from '../../../shared/utils/methods';

const BADGE_STYLES: Record<StatCardVariant, string> = {
  neutral: 'bg-neutral-900 text-white',
  orange: 'bg-warning text-white',
  blue: 'bg-primary-600 text-white',
  green: 'bg-success text-white',
};

export interface StatDetailModalProps {
  onClose: () => void;
  icon?: React.ReactNode;
  variant?: StatCardVariant;
  label: React.ReactNode;
  value: string | number | null | undefined;
  /** What this number represents — shown under the value. */
  description: React.ReactNode;
  /** Optional caveat, e.g. "Breakdown by round: coming soon". */
  footer?: React.ReactNode;
  /** A real page this stat's full list/detail lives on. Omit if none exists yet. */
  viewAllHref?: string;
  viewAllLabel?: string;
}

/**
 * Generic "info" popup for a KPI card that has no dedicated list modal of
 * its own (e.g. no backing list endpoint yet). Shows the number plus a
 * plain-language explanation of what it counts, and — only when a real
 * route exists for it — a hyperlink through to the full page. Cards that
 * already have a purpose-built list modal (e.g. "Total customers" →
 * PlatformTenantsListModal) should keep using that instead of this.
 */
const StatDetailModal: React.FC<StatDetailModalProps> = ({
  onClose,
  icon,
  variant = 'blue',
  label,
  value,
  description,
  footer,
  viewAllHref,
  viewAllLabel = 'View full list',
}) => {
  const displayValue = formatStatValue(value);
  const isPlaceholder = displayValue === 'Not enough data yet';

  return (
    <AntdCommonModal open onClose={onClose} modalProps={{ width: 420 }}>
      <div className="flex items-start gap-3">
        {icon && (
          <div
            className={clsx(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg',
              BADGE_STYLES[variant]
            )}
            aria-hidden
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm text-neutral-500">{label}</p>
          <p
            className={clsx(
              'mt-1 font-display font-bold tracking-tight',
              isPlaceholder ? 'text-base text-neutral-400 italic' : 'text-[28px] text-neutral-900'
            )}
          >
            {displayValue}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-neutral-600">{description}</p>

      {footer && <div className="mt-3 text-xs text-neutral-500">{footer}</div>}

      {viewAllHref && (
        <div className="mt-5 border-t border-neutral-100 pt-4">
          <Link
            to={viewAllHref}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
          >
            {viewAllLabel} &rarr;
          </Link>
        </div>
      )}
    </AntdCommonModal>
  );
};

export default StatDetailModal;
