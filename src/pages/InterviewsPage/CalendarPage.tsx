import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsCalendar4Event } from 'react-icons/bs';
import { MdOutlineArrowBack } from 'react-icons/md';

import MainLayout from '../../layouts/MainLayout';
import { BookingDetailDrawer } from './BookingDetailDrawer';
import { MyInterviewCalendar } from './MyInterviewCalendar';

// Split out of InterviewsPage's own List/My Calendar tab toggle — the
// calendar view now has its own entry point (the header's calendar icon,
// next to the notification bell) instead of living behind a tab on the
// list page, so it gets its own route/page rather than a `viewMode` state
// InterviewsPage had to carry.
export const InterviewCalendarPage = () => {
  const navigate = useNavigate();
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  return (
    <MainLayout>
      <div className="w-full p-8 pt-16">
        <button
          onClick={() => navigate('/interviews')}
          className="mb-4 flex w-fit items-center text-gray-600 hover:text-gray-800 cursor-pointer"
        >
          <MdOutlineArrowBack className="mr-2" />
          <span>Back</span>
        </button>
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
            <BsCalendar4Event size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">My Calendar</h1>
            <p className="text-sm text-neutral-500">
              Your own scheduled interviews, laid out by day.
            </p>
          </div>
        </div>

        <MyInterviewCalendar onSelectBooking={setSelectedBookingId} />
      </div>

      <BookingDetailDrawer
        bookingId={selectedBookingId}
        onClose={() => setSelectedBookingId(null)}
      />
    </MainLayout>
  );
};

export default InterviewCalendarPage;
