'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

export type BadgeStatus = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  children: ReactNode;
  status?: BadgeStatus;
  className?: string;
  /** Renders a leading status dot. Defaults to on — set false for a plain label pill. */
  dot?: boolean;
}

const statusClasses: Record<BadgeStatus, string> = {
  success: 'bg-success-bg text-success-text',
  warning: 'bg-warning-bg text-warning-text',
  danger: 'bg-danger-bg text-danger-text',
  info: 'bg-info-bg text-info-text',
  neutral: 'bg-neutral-100 text-neutral-600',
};

const dotClasses: Record<BadgeStatus, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-neutral-400',
};

/**
 * Status pill for table rows, cards, and headers (e.g. Active/Pending/Inactive,
 * package tiers, "New" markers). Replaces the one-off inline-styled pills that
 * were previously hand-copied per page — see DESIGN_SYSTEM.md §1 "Status pills".
 */
export const Badge = ({ children, status = 'neutral', className, dot = true }: BadgeProps) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        statusClasses[status],
        className
      )}
    >
      {dot && <span className={clsx('h-1.5 w-1.5 rounded-full', dotClasses[status])} />}
      {children}
    </span>
  );
};
