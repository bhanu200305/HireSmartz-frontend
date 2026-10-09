import { useNavigate } from 'react-router-dom';
import { BsCalendar4Event } from 'react-icons/bs';
import { Button } from '../../components/shared';
import { MY_CALENDAR_PATH, OPEN_CALENDAR_PARAM } from '../InterviewsPage/openCalendarParam';

/**
 * Landing page for links to the signed-in user's own interview calendar
 * (`/my-calendar`, or `/my-calendar?openCalendar=<booking_id>` to jump to one
 * interview). The calendar itself is the popup the header opens; the header
 * opens it on arrival here, so this page is only what sits behind it.
 */
const MyCalendarPage = () => {
  const navigate = useNavigate();
  return (
    <div className="mx-auto mt-10 flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
        <BsCalendar4Event size={24} />
      </span>
      <h1 className="text-xl font-bold text-neutral-900">My Calendar</h1>
      <p className="text-sm text-neutral-500">
        Your own scheduled interviews open in a pop-up. If it was closed, you can open it again.
      </p>
      <Button
        type="button"
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white"
        onClick={() => navigate(`${MY_CALENDAR_PATH}?${OPEN_CALENDAR_PARAM}=1`, { replace: true })}
      >
        Open My Calendar
      </Button>
    </div>
  );
};

export default MyCalendarPage;
