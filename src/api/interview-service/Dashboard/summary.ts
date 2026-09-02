import { type BookingStatus, type InterviewType, useGetDashboardSummaryQuery } from '../client';

export type InterviewSummary = {
  job_id: string;
  total_bookings: number;
  status_counts: Partial<Record<BookingStatus, number>>;
  no_show_rate: number | null;
  completion_rate: number | null;
  completed_by_type: Partial<Record<InterviewType, number>>;
};

export { useGetDashboardSummaryQuery as useGetInterviewSummaryQuery };
