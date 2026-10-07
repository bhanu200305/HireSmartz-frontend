import { useLocation } from 'react-router-dom';

/**
 * Router state for a link that leaves the calendar popup for a candidate's
 * page: the page the calendar was opened from, the label of its Back button,
 * and a flag so that page reopens the calendar when Back is pressed. (The
 * calendar is a popup available from the header on every page, not a page of
 * its own.)
 */
export const useFromCalendar = () => {
  const location = useLocation();
  return {
    returnTo: `${location.pathname}${location.search}`,
    returnLabel: 'Back to Calendar',
    reopenCalendar: true,
  };
};
