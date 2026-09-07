import { useMemo, useState } from 'react';
import { Select } from 'antd';
import { BsCalendar4Event } from 'react-icons/bs';
import dayjs from 'dayjs';

import MainLayout from '../../layouts/MainLayout';
import { Loader } from '../../components/shared/ui/loader';
import { Badge } from '../../components/shared/ui/badge';
import { Button } from '../../components/shared/ui/button';
import {
  useListBookingsQuery,
  type BookingStatus,
  type InterviewType,
  type InterviewApiError,
} from '../../api/interview-service/client';
import { useGetJobOpeningsQuery } from '../../api/job-service/JobOpening/GetJobOpening';
import { useJobTitleNameMap } from '../../hooks/useJobTitleNameMap';
import { CandidateNameCell } from './CandidateNameCell';
import { BookingDetailDrawer } from './BookingDetailDrawer';
import {
  BOOKING_STATUS_OPTIONS,
  INTERVIEW_TYPE_OPTIONS,
  bookingStatusBadge,
  bookingStatusLabel,
  interviewTypeLabel,
} from './interviewLabels';

const PAGE_SIZE = 25;

const PRIMARY_BTN =
  'text-white bg-button rounded-3xl px-4 py-2 text-sm shadow-xs hover:shadow-sm transition-shadow';
const SECONDARY_BTN =
  'rounded-3xl border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50';

/** job_opening_id -> display title, best-effort from the recruiter's own job list. */
const useJobTitleForOpening = (): ((jobId: string) => string) => {
  const { data } = useGetJobOpeningsQuery({ isAll: true, size: 200 });
  const { titleMap } = useJobTitleNameMap();

  const openingMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of data?.data ?? []) {
      const id = String(row.jobOpeningId);
      map[id] = titleMap[String(row.jobTitleId)] || row.jobProfileCode || '';
    }
    return map;
  }, [data, titleMap]);

  return (jobId: string) => openingMap[String(jobId)] || `${jobId.slice(0, 8)}…`;
};

const formatSchedule = (start: string | null, timezone: string | null): string => {
  if (!start) return 'Not scheduled';
  const d = dayjs(start);
  if (!d.isValid()) return 'Not scheduled';
  return `${d.format('DD MMM YYYY, h:mm A')}${timezone ? ` (${timezone})` : ''}`;
};

const roundLabel = (booking: { sequence_no: number }): string =>
  booking.sequence_no ? `Round ${booking.sequence_no}` : '—';

export const InterviewsPage = () => {
  const [statusFilter, setStatusFilter] = useState<BookingStatus | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<InterviewType | undefined>(undefined);
  // Cursor pagination: one entry per page visited; the last is the current page.
  const [cursorStack, setCursorStack] = useState<Array<string | null>>([null]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const currentCursor = cursorStack[cursorStack.length - 1];

  const { data, isLoading, isFetching, error, refetch } = useListBookingsQuery({
    ...(statusFilter ? { status_filter: statusFilter } : {}),
    ...(typeFilter ? { interview_type: typeFilter } : {}),
    limit: PAGE_SIZE,
    ...(currentCursor ? { cursor: currentCursor } : {}),
  });

  const resolveJobTitle = useJobTitleForOpening();

  const bookings = data?.items ?? [];
  const pageNumber = cursorStack.length;
  const hasNext = Boolean(data?.next_cursor);
  const hasPrev = cursorStack.length > 1;

  const resetPaging = () => setCursorStack([null]);

  const apiError = error as InterviewApiError | undefined;

  return (
    <MainLayout>
      <div className="w-full p-8 pt-16">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
            <BsCalendar4Event size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Interviews</h1>
            <p className="text-sm text-neutral-500">
              Every scheduled, completed, and cancelled interview across your jobs.
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Select<BookingStatus>
            allowClear
            placeholder="All statuses"
            className="w-48"
            value={statusFilter}
            options={BOOKING_STATUS_OPTIONS}
            onChange={(value) => {
              setStatusFilter(value ?? undefined);
              resetPaging();
            }}
          />
          <Select<InterviewType>
            allowClear
            placeholder="All types"
            className="w-48"
            value={typeFilter}
            options={INTERVIEW_TYPE_OPTIONS}
            onChange={(value) => {
              setTypeFilter(value ?? undefined);
              resetPaging();
            }}
          />
          {(statusFilter || typeFilter) && (
            <button
              type="button"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
              onClick={() => {
                setStatusFilter(undefined);
                setTypeFilter(undefined);
                resetPaging();
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader />
            </div>
          ) : apiError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-neutral-600">
                {apiError.message || 'Could not load interviews.'}
              </p>
              <Button className={PRIMARY_BTN} onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-16 text-center text-sm text-neutral-500">
              {statusFilter || typeFilter
                ? 'No interviews match these filters.'
                : 'No interviews have been booked yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">Job</th>
                    <th className="px-4 py-3">Round</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Scheduled</th>
                  </tr>
                </thead>
                <tbody className={isFetching ? 'opacity-60' : undefined}>
                  {bookings.map((booking) => (
                    <tr
                      key={booking.id}
                      onClick={() => setSelectedBookingId(booking.id)}
                      className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50/60"
                    >
                      <td className="max-w-[220px] px-4 py-3">
                        <CandidateNameCell candidateId={booking.candidate_id} />
                      </td>
                      <td className="max-w-[200px] px-4 py-3">
                        <span className="block truncate text-neutral-700">
                          {resolveJobTitle(booking.job_id)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{roundLabel(booking)}</td>
                      <td className="px-4 py-3">
                        <Badge status="neutral" dot={false}>
                          {interviewTypeLabel(booking.interview_type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={bookingStatusBadge(booking.status)}>
                          {bookingStatusLabel(booking.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {formatSchedule(booking.start_time, booking.attendee_timezone)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!isLoading && !apiError && bookings.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-neutral-500">Page {pageNumber}</span>
            <div className="flex gap-2">
              <Button
                className={SECONDARY_BTN}
                disabled={!hasPrev || isFetching}
                onClick={() => setCursorStack((stack) => stack.slice(0, -1))}
              >
                Previous
              </Button>
              <Button
                className={SECONDARY_BTN}
                disabled={!hasNext || isFetching}
                onClick={() => setCursorStack((stack) => [...stack, data?.next_cursor ?? null])}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <BookingDetailDrawer
        bookingId={selectedBookingId}
        onClose={() => setSelectedBookingId(null)}
      />
    </MainLayout>
  );
};

export default InterviewsPage;
