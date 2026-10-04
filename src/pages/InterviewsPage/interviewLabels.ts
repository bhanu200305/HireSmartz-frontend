import type { BadgeStatus } from '../../components/shared/ui/badge';
import type { BookingStatus, InterviewType } from '../../api/interview-service/client';

/**
 * Shared display maps for interview bookings — kept here so the Interviews
 * list, the detail drawer, and every row action phrase a status/type the
 * same way instead of each screen growing its own copy.
 */

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Canceled',
  no_show: 'No-show',
  interviewer_no_show: 'Interviewer no-show',
  failed: 'Failed',
  rescheduled: 'Rescheduled',
};

export const BOOKING_STATUS_BADGE: Record<BookingStatus, BadgeStatus> = {
  draft: 'neutral',
  scheduled: 'info',
  completed: 'success',
  cancelled: 'neutral',
  no_show: 'warning',
  // Distinct from the candidate's `no_show` ('warning') on purpose — this is
  // the company's failure, not the candidate's, and the two must never read
  // as the same status at a glance.
  interviewer_no_show: 'info',
  failed: 'danger',
  rescheduled: 'warning',
};

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  audio: 'Intake call',
  audio_screening: 'AI Audio Screening',
  ai_video: 'AI video',
  panel: 'Panel',
};

export const BOOKING_STATUS_OPTIONS: Array<{ label: string; value: BookingStatus }> = (
  Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[]
).map((value) => ({ value, label: BOOKING_STATUS_LABELS[value] }));

export const INTERVIEW_TYPE_OPTIONS: Array<{ label: string; value: InterviewType }> = (
  Object.keys(INTERVIEW_TYPE_LABELS) as InterviewType[]
).map((value) => ({ value, label: INTERVIEW_TYPE_LABELS[value] }));

export const bookingStatusLabel = (status: string): string =>
  BOOKING_STATUS_LABELS[status as BookingStatus] ?? status;

export const bookingStatusBadge = (status: string): BadgeStatus =>
  BOOKING_STATUS_BADGE[status as BookingStatus] ?? 'neutral';

export const interviewTypeLabel = (type: string): string =>
  INTERVIEW_TYPE_LABELS[type as InterviewType] ?? type;
