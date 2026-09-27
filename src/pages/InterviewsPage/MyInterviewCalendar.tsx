import { useMemo } from 'react';
import { Calendar } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/provider/store';
import { Loader } from '../../components/shared/ui/loader';
import type { BadgeStatus } from '../../components/shared/ui/badge';
import { useGetCandidateQuery } from '../../api/candidate-service/Candidates/CandidateLifecycle';
import { useListBookingsQuery, type BookingView } from '../../api/interview-service/client';
import { useJobTitleForOpening } from './useJobTitleForOpening';
import { bookingStatusBadge, interviewTypeLabel } from './interviewLabels';

// Same dot colors as the shared Badge component (badge.tsx's own
// `dotClasses`) — reimplemented as a bare dot here since a full pill (label
// + padding) doesn't fit this cell's cramped width.
const STATUS_DOT_CLASSES: Record<BadgeStatus, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-neutral-400',
};

// `GET /bookings` has no date-range filter and orders by `created_at` desc,
// not `start_time` — there's no server-side way to ask for "this month's
// bookings" directly. This fetches the interviewer's most-recently-created
// 200 bookings and buckets them by `start_time` client-side. Reasonable for
// a first pass (no real interviewer is anywhere near 200 total bookings
// today); an interviewer who eventually has more than that would stop
// seeing their OLDEST ones here first. A real fix needs a `start_time`
// range param added to interview-service's own route — flagged, not solved
// here, since this feature has no backend change of its own otherwise
// (`interviewer_id` filtering already existed server-side, just wasn't
// wired to the frontend).
const CALENDAR_FETCH_LIMIT = 200;

const roundLabel = (booking: BookingView): string =>
  booking.sequence_no ? `Round ${booking.sequence_no}` : interviewTypeLabel(booking.interview_type);

const CandidateNamePill = ({ candidateId }: { candidateId: string }) => {
  const { data } = useGetCandidateQuery(candidateId, { skip: !candidateId });
  const name = [data?.first_name, data?.last_name].filter(Boolean).join(' ').trim();
  return <>{name || 'Candidate'}</>;
};

const DayBookingPill = ({
  booking,
  onSelect,
}: {
  booking: BookingView;
  onSelect: (bookingId: string) => void;
}) => {
  const resolveJobTitle = useJobTitleForOpening();
  const jobTitle = booking.round_snapshot?.job_title?.trim() || resolveJobTitle(booking.job_id);
  const time =
    booking.start_time && dayjs(booking.start_time).isValid()
      ? dayjs(booking.start_time).format('h:mm A')
      : null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(booking.id);
      }}
      className="flex w-full flex-col items-start gap-0.5 rounded-md border border-neutral-200 bg-white px-1.5 py-1 text-left text-xs leading-tight hover:border-brand-300 hover:bg-brand-50 cursor-pointer"
      title={jobTitle || undefined}
    >
      <span className="flex w-full items-center justify-between gap-1">
        <span className="font-semibold text-neutral-800 truncate">
          {time ?? roundLabel(booking)}
        </span>
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT_CLASSES[bookingStatusBadge(booking.status)]}`}
          title={booking.status}
        />
      </span>
      <span className="w-full truncate text-neutral-600">
        <CandidateNamePill candidateId={booking.candidate_id} />
        {' · '}
        {roundLabel(booking)}
      </span>
    </button>
  );
};

type MyInterviewCalendarProps = {
  onSelectBooking: (bookingId: string) => void;
};

export const MyInterviewCalendar = ({ onSelectBooking }: MyInterviewCalendarProps) => {
  const currentUserId = useSelector((state: RootState) => state.LoginSlice.userId);

  const { data, isLoading, isError } = useListBookingsQuery(
    { interviewer_id: currentUserId ?? '', limit: CALENDAR_FETCH_LIMIT },
    { skip: !currentUserId }
  );

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, BookingView[]>();
    for (const booking of data?.items ?? []) {
      if (!booking.start_time) continue;
      const d = dayjs(booking.start_time);
      if (!d.isValid()) continue;
      const key = d.format('YYYY-MM-DD');
      const existing = map.get(key) ?? [];
      existing.push(booking);
      map.set(key, existing);
    }
    for (const bookings of map.values()) {
      bookings.sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''));
    }
    return map;
  }, [data?.items]);

  if (!currentUserId) {
    return (
      <div className="py-16 text-center text-sm text-neutral-500">
        Could not determine your account — try refreshing the page.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-16 text-center text-sm text-neutral-500">
        Could not load your interview calendar.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-neutral-200 bg-white p-2 shadow-xs">
      <div className="min-w-[720px]">
        <Calendar
          cellRender={(date: Dayjs, info) => {
            if (info.type !== 'date') return info.originNode;
            const dayBookings = bookingsByDate.get(date.format('YYYY-MM-DD')) ?? [];
            if (dayBookings.length === 0) return null;
            return (
              <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: 88 }}>
                {dayBookings.map((booking) => (
                  <DayBookingPill key={booking.id} booking={booking} onSelect={onSelectBooking} />
                ))}
              </div>
            );
          }}
        />
      </div>
    </div>
  );
};

export default MyInterviewCalendar;
