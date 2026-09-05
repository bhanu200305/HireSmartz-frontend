import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { PublicFooter } from '../../components/shared/PublicFooter';
import { usePublicCareersBranding } from '../../hooks/usePublicCareersBranding';
import {
  useLazyGetIntakeCallSlotsQuery,
  useBookIntakeCallSlotMutation,
} from '../../api/candidate-service/PublicApply/index';
import { getCandidateErrorMessage } from '../../shared/utils/auth/candidateError.helpers';

// New — Path A's Intake Call slot picker
// (FRONTEND_INTEGRATION_DETAILS.md §5.1 steps 3–4), reached only after a
// resume-first apply whose response carried a real
// `intake_call_booking_token` (`CareersApplyPage`'s own routing). The
// `token` is a signed, self-expiring value carried in the URL query string
// — never a raw candidate/booking id, per this whole service's public-link
// convention.
//
// Booking (`POST .../intake-call-slots/book`) reaches interview-service
// SYNCHRONOUSLY — the confirmation below only renders once the slot is
// actually locked, there's no separate "pending" state to design for.

const DAYS_AHEAD = 10;

const buildUpcomingDates = () =>
  Array.from({ length: DAYS_AHEAD }, (_, i) => dayjs().add(i, 'day'));

export const CareersIntakeCallSchedulePage = () => {
  const { organizationId } = useParams<{ organizationId: string; jobId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { companyName, logoUrl } = usePublicCareersBranding(organizationId);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const dates = buildUpcomingDates();
  const [selectedDate, setSelectedDate] = useState(dates[0].format('YYYY-MM-DD'));
  const [booked, setBooked] = useState<{ start_time: string; end_time: string } | null>(null);

  const [fetchSlots, { data: slotsData, isFetching: isLoadingSlots }] =
    useLazyGetIntakeCallSlotsQuery();
  const [bookSlot, { isLoading: isBooking }] = useBookIntakeCallSlotMutation();

  useEffect(() => {
    if (token && selectedDate) {
      fetchSlots({ token, date: selectedDate, timezone });
    }
  }, [token, selectedDate, timezone, fetchSlots]);

  const handleBook = async (startTime: string) => {
    try {
      const res = await bookSlot({ token, start_time: startTime, timezone }).unwrap();
      setBooked(res.data);
    } catch (e) {
      // A slot going stale between fetch and book (someone else took it) is
      // the expected failure mode here — surface the server's own message.
      alert(getCandidateErrorMessage(e, 'Could not book that slot — please pick another.'));
    }
  };

  if (!token) {
    return (
      <div className="public-page min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <p className="text-sm text-gray-500 text-center max-w-sm">
          This scheduling link is missing its token — please use the link from your application
          confirmation instead of navigating here directly.
        </p>
      </div>
    );
  }

  return (
    <div className="public-page min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-black text-white px-4 py-3 flex items-center justify-center relative shrink-0">
        {logoUrl ? (
          <img src={logoUrl} alt={companyName ?? 'Company logo'} className="h-10 object-contain" />
        ) : (
          <span className="text-white font-bold text-xl tracking-widest">CFP</span>
        )}
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-10">
        {booked ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 text-3xl flex items-center justify-center mx-auto mb-4">
              ✓
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Call Scheduled!</h1>
            <p className="text-sm text-gray-500 mb-1">
              {dayjs(booked.start_time).format('dddd, MMM D, YYYY · h:mm A')}
            </p>
            <p className="text-sm text-gray-400 mb-8">We&apos;ll call you at the time above.</p>
            <button
              type="button"
              onClick={() => navigate(`/careers/${organizationId}`)}
              className="rounded-full border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Browse more roles
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">
              Pick a time to talk
            </h1>
            <p className="text-sm text-gray-500 text-center mb-8">
              Choose a day and time that works for you — shown in your local time ({timezone}).
            </p>

            <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
              {dates.map((d) => {
                const value = d.format('YYYY-MM-DD');
                const isSelected = value === selectedDate;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedDate(value)}
                    className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold border ${
                      isSelected
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {d.format('ddd D')}
                  </button>
                );
              })}
            </div>

            {isLoadingSlots ? (
              <p className="text-sm text-gray-400 text-center py-8">Loading available times…</p>
            ) : (slotsData?.data.slots.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No times available on this day — try another date.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {slotsData?.data.slots.map((slot) => {
                  const isPast = dayjs(slot.start_time).isBefore(dayjs());
                  return (
                    <button
                      key={slot.start_time}
                      type="button"
                      disabled={slot.remaining <= 0 || isBooking || isPast}
                      onClick={() => void handleBook(slot.start_time)}
                      className="rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-800 hover:border-black disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {dayjs(slot.start_time).format('h:mm A')}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <PublicFooter />
    </div>
  );
};

export default CareersIntakeCallSchedulePage;
