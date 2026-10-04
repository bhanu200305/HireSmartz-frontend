import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import clsx from 'clsx';
import { LuChevronLeft, LuChevronRight, LuCalendarDays, LuCircleCheck } from 'react-icons/lu';
import { RxClock } from 'react-icons/rx';
import { Loader } from '../../components/shared/ui/loader';
import { PublicFooter } from '../../components/shared/PublicFooter';
import { usePublicCareersBranding } from '../../hooks/usePublicCareersBranding';
import { AI_SCHEDULE_WINDOW_DAYS, AI_SLOT_MIN_LEAD_MINUTES } from '../../constants/app.constants';
import {
  useLazyGetIntakeCallSlotsQuery,
  useBookIntakeCallSlotMutation,
} from '../../api/candidate-service/PublicApply/index';
import { getCandidateErrorMessage } from '../../shared/utils/auth/candidateError.helpers';

// Path A's Intake Call slot picker (FRONTEND_INTEGRATION_DETAILS.md §5.1
// steps 3–4), reached only after a resume-first apply whose response
// carried a real `intake_call_booking_token` (`CareersApplyPage`'s own
// routing). The `token` is a signed, self-expiring value carried in the
// URL query string — never a raw candidate/booking id, per this whole
// service's public-link convention.
//
// Booking (`POST .../intake-call-slots/book`) reaches interview-service
// SYNCHRONOUSLY — the confirmation below only renders once the slot is
// actually locked, there's no separate "pending" state to design for.
//
// VISUAL PARITY WITH AiCallSchedulePage — 2026-09-10. Same card shell,
// month calendar, duration badge, and select-then-confirm flow as the
// AI_VIDEO/PANEL/AUDIO_SCREENING scheduling page candidates reach from
// their invitation email, so the two look like one product rather than
// two different tools. Deliberately NOT reused wholesale: this page keeps
// its own existing candidate-service hooks (`useLazyGetIntakeCallSlotsQuery`/
// `useBookIntakeCallSlotMutation`) rather than switching to interview-
// service's client, and skips features that don't apply to a resume-first
// public apply (the AI-voice consent modal, "call me now instead", the
// language/timezone-search dropdowns) — this round is a plain phone call,
// not an AI-conducted interview, and never carried those before either.

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export const CareersIntakeCallSchedulePage = () => {
  const { organizationId } = useParams<{ organizationId: string; jobId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { companyName, logoUrl } = usePublicCareersBranding(organizationId);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const today = dayjs().startOf('day');
  const maxDate = today.add(AI_SCHEDULE_WINDOW_DAYS, 'day');

  const [currentMonth, setCurrentMonth] = useState<Dayjs>(today);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start_time: string; end_time: string } | null>(
    null
  );
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [booked, setBooked] = useState<{ start_time: string; end_time: string } | null>(null);

  const [fetchSlots, { data: slotsData, isFetching: isLoadingSlots }] =
    useLazyGetIntakeCallSlotsQuery();
  const [bookSlot, { isLoading: isBooking }] = useBookIntakeCallSlotMutation();

  useEffect(() => {
    if (!token || !selectedDate) return;
    void fetchSlots({ token, date: selectedDate.format('YYYY-MM-DD'), timezone });
  }, [token, selectedDate, fetchSlots]);

  const handleDateSelect = (date: Dayjs): void => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setBookingError(null);
  };

  const handleBook = async (): Promise<void> => {
    if (!selectedSlot) return;
    setBookingError(null);
    try {
      const res = await bookSlot({
        token,
        start_time: selectedSlot.start_time,
        timezone,
      }).unwrap();
      setBooked(res.data);
    } catch (e) {
      // A slot going stale between fetch and book (someone else took it) is
      // the expected failure mode here — surface the server's own message.
      const message = getCandidateErrorMessage(e, 'Could not book that slot. Please pick another.');
      setBookingError(message);
      if (selectedDate) {
        void fetchSlots({ token, date: selectedDate.format('YYYY-MM-DD'), timezone });
      }
    }
  };

  const startOfMonth = currentMonth.startOf('month');
  const endOfMonth = currentMonth.endOf('month');
  const leadingBlanks = startOfMonth.day();
  const calendarDays: (Dayjs | null)[] = [
    ...Array.from<null>({ length: leadingBlanks }).fill(null),
    ...Array.from({ length: endOfMonth.date() }, (_, i) => currentMonth.date(i + 1)),
  ];
  const isDateSelectable = (date: Dayjs): boolean =>
    (date.isSame(today, 'day') || date.isAfter(today, 'day')) &&
    (date.isSame(maxDate, 'day') || date.isBefore(maxDate, 'day'));
  const canPrevMonth = currentMonth.isAfter(today, 'month');
  const canNextMonth = currentMonth.isBefore(maxDate, 'month');

  const earliest = dayjs().add(AI_SLOT_MIN_LEAD_MINUTES, 'minute');
  const slots = (slotsData?.data.slots ?? []).filter((slot) =>
    dayjs(slot.start_time).isAfter(earliest)
  );
  const durationMinutes = slotsData?.data.duration_minutes ?? null;

  if (!token) {
    return (
      <div className="public-page min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <p className="text-sm text-gray-500 text-center max-w-sm">
          This scheduling link is missing its token. Please use the link from your application
          confirmation instead of navigating here directly.
        </p>
      </div>
    );
  }

  if (booked) {
    return (
      <div className="public-page min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-gray-900 shadow-md text-white px-4 h-12 flex items-center justify-center shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt={companyName ?? 'Company logo'} className="h-9 object-contain" />
          ) : (
            <span className="text-white font-bold text-xl tracking-widest">CFP</span>
          )}
        </header>
        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
            <LuCircleCheck className="text-green-500 w-16 h-16 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-gray-800 mb-2">Call Scheduled!</h1>
            <div className="bg-gray-50 rounded-xl p-4 text-left text-sm text-gray-700 space-y-3 mt-4">
              <div className="flex items-center gap-2">
                <LuCalendarDays className="text-(--primary) w-4 h-4 shrink-0" />
                <span>{dayjs(booked.start_time).format('dddd, MMM D, YYYY')}</span>
              </div>
              <div className="flex items-center gap-2">
                <RxClock className="text-(--primary) w-4 h-4 shrink-0" />
                <span>{dayjs(booked.start_time).format('h:mm A')}</span>
              </div>
            </div>
            <p className="text-gray-400 text-xs mt-6">We&apos;ll call you at the time above.</p>
            <button
              type="button"
              onClick={() => navigate(`/careers/${organizationId}`)}
              className="mt-8 rounded-full border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Browse More Roles
            </button>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="public-page min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-gray-900 shadow-md text-white px-4 h-12 flex items-center justify-center shrink-0">
        {logoUrl ? (
          <img src={logoUrl} alt={companyName ?? 'Company logo'} className="h-9 object-contain" />
        ) : (
          <span className="text-white font-bold text-xl tracking-widest">CFP</span>
        )}
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-3xl flex flex-col">
          <div className="px-6 pt-5 pb-3 border-b border-gray-100 shrink-0">
            <h1 className="text-lg font-bold text-gray-900 mb-1">Pick a Time to Talk</h1>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <RxClock className="w-4 h-4" />
              <span>
                {durationMinutes ?? 15} minutes · shown in your local time ({timezone})
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row">
            {/* LEFT: Calendar */}
            <div className="md:w-[52%] p-6 border-b md:border-b-0 md:border-r border-gray-100">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-800">
                  {currentMonth.format('MMMM')}{' '}
                  <span className="font-normal text-gray-500">{currentMonth.format('YYYY')}</span>
                </h2>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentMonth((m) => m.subtract(1, 'month'))}
                    disabled={!canPrevMonth}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <LuChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentMonth((m) => m.add(1, 'month'))}
                    disabled={!canNextMonth}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <LuChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 mb-2">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-1">
                {calendarDays.map((date, idx) => {
                  if (!date) return <div key={`blank-${idx}`} />;
                  const selectable = isDateSelectable(date);
                  const isSelected = selectedDate?.isSame(date, 'day') ?? false;
                  const isToday = date.isSame(today, 'day');
                  return (
                    <button
                      key={date.format('YYYY-MM-DD')}
                      type="button"
                      disabled={!selectable}
                      onClick={() => handleDateSelect(date)}
                      className={clsx(
                        'relative mx-auto w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all',
                        isSelected && 'bg-(--primary) text-white',
                        !isSelected &&
                          selectable &&
                          'text-gray-800 font-semibold hover:bg-gray-100',
                        !selectable && 'text-gray-300 cursor-not-allowed font-normal'
                      )}
                    >
                      {date.date()}
                      {isToday && !isSelected && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-(--primary)" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: Slots / Confirm */}
            <div className="md:w-[48%] flex flex-col">
              {!selectedDate ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm px-6 py-10">
                  <div className="text-center">
                    <LuCalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Select a date to see available times</p>
                  </div>
                </div>
              ) : selectedSlot ? (
                <div className="flex-1 flex flex-col p-6">
                  <p className="text-xs text-gray-400 tracking-wide font-semibold mb-1">
                    Confirm Your Call
                  </p>
                  <h3 className="text-base font-semibold text-gray-800 mb-6">
                    {selectedDate.format('dddd, MMM D, YYYY')}
                  </h3>

                  <div className="border border-(--primary) rounded-xl px-5 py-4 text-center">
                    <p className="text-(--primary) font-bold text-base">
                      {dayjs(selectedSlot.start_time).format('h:mm A')}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      {dayjs(selectedSlot.start_time).format('h:mm A')} to{' '}
                      {dayjs(selectedSlot.end_time).format('h:mm A')}
                    </p>
                  </div>

                  {bookingError && (
                    <p className="text-red-500 text-xs text-center mt-3">{bookingError}</p>
                  )}

                  <div className="mt-auto pt-6 flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => void handleBook()}
                      disabled={isBooking}
                      className="w-full py-3 rounded-full bg-(--primary) text-white font-semibold text-sm hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isBooking ? <Loader /> : 'Confirm Call'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSlot(null);
                        setBookingError(null);
                      }}
                      className="w-full py-3 rounded-full border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition cursor-pointer"
                    >
                      Back
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className="px-5 pt-5 pb-2 shrink-0">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <LuCalendarDays className="w-4 h-4 text-(--primary)" />
                      {selectedDate.format('dddd, MMM D')}
                    </h3>
                  </div>
                  <div className="flex-1 px-5 pb-5 pt-2 space-y-2 max-h-80 overflow-y-auto">
                    {isLoadingSlots ? (
                      <div className="flex justify-center items-center h-40">
                        <Loader />
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="text-center text-sm text-gray-400 py-10">
                        No times available on this day. Try another date.
                      </div>
                    ) : (
                      slots.map((slot) => (
                        <button
                          key={slot.start_time}
                          type="button"
                          disabled={slot.remaining <= 0}
                          onClick={() => setSelectedSlot(slot)}
                          className="w-full py-3 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-(--primary) hover:text-(--primary) transition-all text-center disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          {dayjs(slot.start_time).format('h:mm A')}
                          {slot.remaining <= 0 ? ' (Full)' : ` (${slot.remaining} left)`}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default CareersIntakeCallSchedulePage;
