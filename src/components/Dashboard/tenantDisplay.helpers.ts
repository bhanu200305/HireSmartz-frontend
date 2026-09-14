import type { BadgeStatus } from '../shared/ui/badge';

/** Shared by every screen that renders a `PlatformTenantSummary.status` —
 * `TenantsPreviewCard`, `TenantAnalyticsModal`, `PlatformTenantsListModal` —
 * so a new tenant status only ever needs adding here once, rather than in
 * however many places happened to have copied this mapping by hand. */
export const TENANT_STATUS_BADGE: Record<string, BadgeStatus> = {
  draft: 'neutral',
  pre_approved: 'warning',
  active: 'success',
  suspended: 'danger',
};

export const formatTenantStatusLabel = (status: string): string =>
  status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const formatTenantDate = (isoDate: string | null): string =>
  isoDate
    ? new Date(isoDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '-';
