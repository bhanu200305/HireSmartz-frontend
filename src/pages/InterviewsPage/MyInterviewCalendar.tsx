import { useMemo, useRef, useState } from 'react';
import { Tooltip } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  LuCalendarDays,
  LuChevronLeft,
  LuChevronRight,
  LuClock,
  LuExternalLink,
  LuPhone,
  LuCirclePlay,
  LuUsers,
  LuVideo,
} from 'react-icons/lu';
import { RootState } from '../../redux/provider/store';
import { Loader } from '../../components/shared/ui/loader';
import { Badge } from '../../components/shared/ui/badge';
import { showToast } from '../../components/shared';
import { useGetCandidateQuery } from '../../api/candidate-service/Candidates/CandidateLifecycle';
import {
  useGetArtifactsQuery,
  useListBookingsQuery,
  type BookingView,
  type InterviewType,
} from '../../api/interview-service/client';
import { buildCandidateDetailsPath } from '../../components/JobsOpening/Candidates/useCandidateNavigation';
import { useJobTitleForOpening } from './useJobTitleForOpening';
import { bookingStatusBadge, bookingStatusLabel, interviewTypeLabel } from './interviewLabels';

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

const MODE_ICON: Record<InterviewType, typeof LuPhone> = {
  audio: LuPhone,
  audio_screening: LuPhone,
  ai_video: LuVideo,
  panel: LuUsers,
};

const initials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

// Deterministic color per candidate (hashed from their id) so the same
// person's avatar always looks the same across the calendar without
// fetching/storing an actual photo — candidates have none.
const AVATAR_PALETTE = [
  'bg-rose-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-lime-600',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-fuchsia-500',
  'bg-pink-500',
];
const avatarColorFor = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};

// "Today"/"Tomorrow" read instantly; anything further out falls back to a
// weekday name — the full date (Month D, YYYY) always renders alongside
// this, in the group header below, so a bare "Monday" is never the only
// thing saying which Monday.
const dayGroupLabel = (date: Dayjs): string => {
  const today = dayjs().startOf('day');
  if (date.isSame(today, 'day')) return 'Today';
  if (date.isSame(today.add(1, 'day'), 'day')) return 'Tomorrow';
  return date.format('dddd');
};

// Candidate name + the job opening id their profile link needs — shared by
// every card/avatar below so each only renders once RTK Query's own cache
// resolves it (one request per distinct candidate, not one per usage).
const useCandidateSummary = (candidateId: string) => {
  const { data } = useGetCandidateQuery(candidateId, { skip: !candidateId });
  const name = [data?.first_name, data?.last_name].filter(Boolean).join(' ').trim();
  return { name: name || 'Candidate', jobOpeningId: data?.job_opening_id ?? null };
};

// A quiet "Recording available" chip — only ever renders once an artifact
// actually exists, so a round with nothing yet to review adds no visual
// noise. Scoped to whichever bookings are actually on screen (today's hero
// + the upcoming feed), never the full 200-booking fetch.
const RecordingIndicator = ({ bookingId }: { bookingId: string }) => {
  const { data } = useGetArtifactsQuery(bookingId);
  const hasRecording = Boolean(data?.artifacts.some((a) => a.kind === 'recording'));
  if (!hasRecording) return null;
  return (
    <Tooltip title="A recording is available to review">
      <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-medium text-success-text">
        <LuCirclePlay size={12} />
        Recording
      </span>
    </Tooltip>
  );
};

const HeroAvatarChip = ({ booking, onClick }: { booking: BookingView; onClick: () => void }) => {
  const { name } = useCandidateSummary(booking.candidate_id);
  const time =
    booking.start_time && dayjs(booking.start_time).isValid()
      ? dayjs(booking.start_time).format('h:mm A')
      : null;

  return (
    <Tooltip title={`${name}${time ? ` · ${time}` : ''} — click to open`}>
      <button
        type="button"
        onClick={onClick}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white shadow-sm transition-transform hover:z-10 hover:scale-110 cursor-pointer ${avatarColorFor(booking.candidate_id)}`}
      >
        {initials(name)}
      </button>
    </Tooltip>
  );
};

const AgendaCard = ({ booking, onOpen }: { booking: BookingView; onOpen: () => void }) => {
  const { name, jobOpeningId } = useCandidateSummary(booking.candidate_id);
  const resolveJobTitle = useJobTitleForOpening();
  const jobTitle = booking.round_snapshot?.job_title?.trim() || resolveJobTitle(booking.job_id);
  const start =
    booking.start_time && dayjs(booking.start_time).isValid() ? dayjs(booking.start_time) : null;
  const end =
    booking.end_time && dayjs(booking.end_time).isValid() ? dayjs(booking.end_time) : null;
  const ModeIcon = MODE_ICON[booking.interview_type] ?? LuPhone;
  const deliveryMode = booking.round_snapshot?.delivery_mode;
  const profileHref = jobOpeningId
    ? buildCandidateDetailsPath(jobOpeningId, booking.candidate_id)
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen();
      }}
      className="group flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColorFor(booking.candidate_id)}`}
      >
        {initials(name)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {profileHref ? (
              <a
                href={profileHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Open this candidate's full profile in a new tab"
                className="truncate font-semibold text-brand-700 underline decoration-transparent underline-offset-2 transition-colors hover:text-brand-800 hover:decoration-brand-400"
              >
                {name}
              </a>
            ) : (
              <p className="truncate font-semibold text-neutral-900">{name}</p>
            )}
            {jobTitle && <p className="truncate text-xs text-neutral-500">{jobTitle}</p>}
          </div>
          <Badge status={bookingStatusBadge(booking.status)} dot={false} className="shrink-0">
            {bookingStatusLabel(booking.status)}
          </Badge>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-600">
          <span className="flex items-center gap-1">
            <LuClock size={13} />
            {start ? start.format('h:mm A') : 'Time TBD'}
            {end ? ` – ${end.format('h:mm A')}` : ''}
          </span>
          <span className="flex items-center gap-1">
            <ModeIcon size={13} />
            {roundLabel(booking)}
            {deliveryMode && ` · ${deliveryMode === 'offline' ? 'In person' : 'Online'}`}
          </span>
          <RecordingIndicator bookingId={booking.id} />
        </div>
      </div>

      {profileHref && (
        <a
          href={profileHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Open this candidate's full profile in a new tab"
          className="flex shrink-0 items-center gap-1 self-start rounded-full border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 hover:border-brand-300 hover:text-brand-600"
        >
          Profile
          <LuExternalLink size={12} />
        </a>
      )}
    </div>
  );
};

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// A fully custom month grid instead of antd's own `Calendar` — that one
// fights Tailwind for every bit of styling (header dropdowns, cell
// backgrounds, today/selected treatment all live behind antd's own CSS
// specificity), and still ends up looking like a bare utility widget bolted
// onto the page. Plain arithmetic + Tailwind gives full control over
// exactly the two things that matter here: which day is "now", and which
// days actually have something on them.
const MonthGrid = ({
  focusedDate,
  todayKey,
  bookingsByDate,
  onSelectDate,
  onChangeMonth,
}: {
  focusedDate: Dayjs;
  todayKey: string;
  bookingsByDate: Map<string, BookingView[]>;
  onSelectDate: (date: Dayjs) => void;
  onChangeMonth: (date: Dayjs) => void;
}) => {
  const selectedKey = focusedDate.format('YYYY-MM-DD');
  const days = useMemo(() => {
    const gridStart = focusedDate.startOf('month').startOf('week');
    return Array.from({ length: 42 }, (_, i) => gridStart.add(i, 'day'));
  }, [focusedDate]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => onChangeMonth(focusedDate.subtract(1, 'month'))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 cursor-pointer"
        >
          <LuChevronLeft size={18} />
        </button>
        <h3 className="font-display text-lg font-bold text-neutral-900">
          {focusedDate.format('MMMM YYYY')}
        </h3>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => onChangeMonth(focusedDate.add(1, 'month'))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 cursor-pointer"
        >
          <LuChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="pb-2 text-center text-[11px] font-semibold tracking-wide text-neutral-400"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = day.format('YYYY-MM-DD');
          const inMonth = day.month() === focusedDate.month();
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const isPast = key < todayKey;
          const count = inMonth && !isPast ? (bookingsByDate.get(key)?.length ?? 0) : 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(day)}
              className={[
                'flex h-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl text-sm transition-all',
                !inMonth && 'text-neutral-300 hover:bg-neutral-50',
                inMonth && isPast && !isSelected && 'text-neutral-400 hover:bg-neutral-50',
                inMonth &&
                  !isPast &&
                  !isSelected &&
                  !isToday &&
                  'text-neutral-700 hover:bg-neutral-100',
                isToday &&
                  !isSelected &&
                  'font-bold text-brand-700 ring-2 ring-inset ring-brand-400',
                isSelected && 'bg-brand-600 font-bold text-white shadow-sm hover:bg-brand-700',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span>{day.date()}</span>
              {count > 0 && (
                <span
                  className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                    isSelected ? 'bg-white text-brand-700' : 'bg-brand-500 text-white'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full ring-2 ring-inset ring-brand-400" />
          Today
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
          Has Interviews
        </span>
      </div>
    </div>
  );
};

type MyInterviewCalendarProps = {
  onSelectBooking: (bookingId: string) => void;
};

export const MyInterviewCalendar = ({ onSelectBooking }: MyInterviewCalendarProps) => {
  const currentUserId = useSelector((state: RootState) => state.LoginSlice.userId);
  const dayGroupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Which month the big calendar below is showing + which date (if any) is
  // highlighted on it — kept separate from "today" so paging through months
  // or clicking a date doesn't fight the hero section's own "today" framing.
  const [focusedDate, setFocusedDate] = useState<Dayjs>(() => dayjs());

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

  const todayKey = dayjs().format('YYYY-MM-DD');
  const todaysBookings = bookingsByDate.get(todayKey) ?? [];

  // Only TODAY-or-later days that actually have something on them ever
  // become a group — there is nothing to scan past, no empty day to click
  // into just to learn it's empty. Past days are omitted the same way: this
  // feed answers "who am I meeting", not "what happened".
  const upcomingGroups = useMemo(
    () =>
      [...bookingsByDate.keys()]
        .filter((key) => key >= todayKey)
        .sort()
        .map((key) => ({ key, date: dayjs(key), bookings: bookingsByDate.get(key) ?? [] })),
    [bookingsByDate, todayKey]
  );

  // Clicking a date on the big calendar jumps straight to that day's cards
  // in the feed below instead of opening some separate day view — one
  // click, no extra screen. A date with nothing on it (or already past)
  // just says so rather than silently doing nothing.
  const handleCalendarSelect = (date: Dayjs) => {
    setFocusedDate(date);
    const key = date.format('YYYY-MM-DD');
    const group = dayGroupRefs.current[key];
    if (group) {
      group.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (key < todayKey) {
      showToast({ message: `${date.format('MMM D, YYYY')} has already passed.`, type: 'info' });
    } else {
      showToast({
        message: `No interviews scheduled on ${date.format('MMM D, YYYY')}.`,
        type: 'info',
      });
    }
  };

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
    <div className="w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {/* "Today" is the headline, not a date cell buried in a month grid —
          who you're meeting, and how many, at a glance before anything
          else on this page. */}
      <div className="flex flex-col gap-4 bg-gradient-to-br from-primary-600 to-accent-500 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">{dayjs().format('dddd')}</p>
          <h2 className="font-display text-2xl font-bold">{dayjs().format('MMM D, YYYY')}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/90">
            <LuCalendarDays size={15} />
            {todaysBookings.length === 0
              ? 'No interviews scheduled today'
              : `${todaysBookings.length} interview${todaysBookings.length === 1 ? '' : 's'} today`}
          </p>
        </div>
        {todaysBookings.length > 0 && (
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {todaysBookings.slice(0, 5).map((booking) => (
                <HeroAvatarChip
                  key={booking.id}
                  booking={booking}
                  onClick={() => onSelectBooking(booking.id)}
                />
              ))}
            </div>
            {todaysBookings.length > 5 && (
              <span className="ml-2 text-sm font-medium text-white/90">
                +{todaysBookings.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Two halves, side by side — the calendar is a real month grid, not
          a cramped sidebar widget, and the feed gets just as much room to
          breathe instead of being squeezed underneath it. */}
      <div className="flex flex-col lg:flex-row">
        {/* The real calendar — full month grid, every date that has an
            interview carries its own count badge, so there's nothing to
            hunt for: a blank date IS the answer "nothing that day".
            Clicking a date jumps straight to its cards in the feed beside
            it. */}
        <div className="border-b border-neutral-100 p-5 lg:w-1/2 lg:border-b-0 lg:border-r">
          <MonthGrid
            focusedDate={focusedDate}
            todayKey={todayKey}
            bookingsByDate={bookingsByDate}
            onSelectDate={handleCalendarSelect}
            onChangeMonth={setFocusedDate}
          />
        </div>

        {/* Everything coming up, nearest first, grouped by day — scroll to
            browse, never click through empty days to find out they're
            empty. */}
        <div className="p-5 lg:w-1/2">
          <h3 className="mb-3 text-base font-semibold text-neutral-900">Upcoming Interviews</h3>

          {upcomingGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 py-12 text-center">
              <LuCalendarDays size={28} className="text-neutral-300" />
              <p className="text-sm text-neutral-400">
                Nothing scheduled — your calendar is clear.
              </p>
            </div>
          ) : (
            <div className="flex max-h-[560px] flex-col gap-5 overflow-y-auto pr-1">
              {upcomingGroups.map((group) => (
                <div
                  key={group.key}
                  ref={(el) => {
                    dayGroupRefs.current[group.key] = el;
                  }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-neutral-800">
                      {dayGroupLabel(group.date)}
                    </h4>
                    <span className="text-xs text-neutral-400">
                      {group.date.format('MMM D, YYYY')} · {group.bookings.length}{' '}
                      {group.bookings.length === 1 ? 'interview' : 'interviews'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {group.bookings.map((booking) => (
                      <AgendaCard
                        key={booking.id}
                        booking={booking}
                        onOpen={() => onSelectBooking(booking.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyInterviewCalendar;
