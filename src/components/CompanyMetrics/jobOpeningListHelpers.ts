import type { BadgeStatus } from '../shared/ui/badge';
import type { JobSummary } from '../../api/job-service/JobOpenings/types';
import { calendarDaysSince } from '../../shared/utils/calendarDate';

/** Shared by `OpenJobsSection` and `JobOpeningsListModal` — one status/age
 * reading for a job row, so the KPI popup and the metrics-page section can
 * never disagree about what "Open" or "3d" means. */
export const jobStatus = (job: JobSummary): { label: string; badge: BadgeStatus } => {
  if (job.is_closed) return { label: 'Closed', badge: 'neutral' };
  if (job.is_published) return { label: 'Open', badge: 'success' };
  return { label: 'Draft', badge: 'warning' };
};

export const daysOpen = (openDate: string | null): string => {
  const days = calendarDaysSince(openDate);
  return days === null ? '-' : `${days}d`;
};
