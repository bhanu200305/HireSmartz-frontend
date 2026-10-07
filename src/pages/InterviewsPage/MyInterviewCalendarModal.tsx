import { useEffect, useState } from 'react';
import { BsCalendar4Event } from 'react-icons/bs';
import AntdCommonModal from '../../components/shared/ui/AntdCommonModal';
import { BookingDetailDrawer } from './BookingDetailDrawer';
import { MyInterviewCalendar } from './MyInterviewCalendar';

type MyInterviewCalendarModalProps = {
  open: boolean;
  onClose: () => void;
};

// Popup instead of a route — `/interviews/calendar` used to be a full page
// opened from the header's calendar icon (available on every page), so its
// own "Back" button always landing on /interviews was wrong whenever the
// icon was clicked from somewhere else. A modal just closes back to
// whatever page was already open underneath it.
export const MyInterviewCalendarModal = ({ open, onClose }: MyInterviewCalendarModalProps) => {
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  // A booking's detail panel must not outlive the popup (it would stay open
  // over the page a link inside it navigated to).
  useEffect(() => {
    if (!open) setSelectedBookingId(null);
  }, [open]);

  return (
    <>
      <AntdCommonModal
        open={open}
        onClose={onClose}
        modalProps={{ width: '94vw', style: { maxWidth: 1560 } }}
      >
        {/* Right gutter clears AntdCommonModal's own close button, which
            sits absolutely positioned top-right regardless of this header
            row (see that component's own note on this). */}
        <div className="mb-6 flex items-center gap-3 pr-10">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
            <BsCalendar4Event size={20} />
          </span>
          <div>
            <h2 className="text-xl font-bold text-neutral-900">My Calendar</h2>
            <p className="text-sm text-neutral-500">
              Your own scheduled interviews, laid out by day.
            </p>
          </div>
        </div>

        <MyInterviewCalendar onSelectBooking={setSelectedBookingId} />
      </AntdCommonModal>

      <BookingDetailDrawer
        bookingId={selectedBookingId}
        onClose={() => setSelectedBookingId(null)}
      />
    </>
  );
};

export default MyInterviewCalendarModal;
