import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Header from '../components/Header';
import Sidebar, { SIDEBAR_WIDTH } from '../components/Sidebar';
import {
  clearLocalStorage,
  clearImpersonationStorage,
  getLocalStorageItem,
} from '../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../constants/webAPI';

interface MainLayoutProps {
  children: React.ReactNode;
  /**
   * When true, locks the page to the viewport height (h-screen + overflow
   * hidden) instead of the default min-h-screen scrolling page, so the
   * content area must fit without a page-level vertical scrollbar.
   */
  fullHeight?: boolean;
}

const MainLayout = ({ children, fullHeight = false }: MainLayoutProps) => {
  const navigate = useNavigate();
  const hideNavbarPaths = ['/profile', '/change-password'];
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performLogout = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    clearImpersonationStorage();
    navigate('/logout', { state: { inactivity: true } });
  };

  const resetTimer = () => {
    // Update the last activity timestamp
    lastActivityRef.current = Date.now();

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Calculate time remaining until logout
    const timeSinceLastActivity = Date.now() - lastActivityRef.current;
    const timeRemaining = Math.max(INACTIVITY_TIMEOUT - timeSinceLastActivity, 0);

    timerRef.current = setTimeout(() => {
      performLogout();
    }, timeRemaining);
  };

  const handleUserActivity = () => {
    resetTimer();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // Page became visible again - check if we should logout
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        performLogout();
      } else {
        resetTimer();
      }
    }
  };

  // useEffect(() => {
  //   const token = getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS)
  //   if (!token) {
  //     navigate('/login')
  //     return
  //   }

  useEffect(() => {
    const sessionToken = sessionStorage.getItem(LOCALSTORAGE_KEYS.ACCESS);
    const localStorageToken = getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);

    // If no session token exists but localStorage token exists,
    // it means the browser was closed and reopened
    if (!sessionToken && localStorageToken) {
      clearLocalStorage();
      navigate('/login');
      return;
    }

    // If no token at all, redirect to login
    if (!sessionToken && !localStorageToken) {
      navigate('/login');
      return;
    }
    // Initialize timer
    lastActivityRef.current = Date.now();
    resetTimer();

    // User activity events
    const activityEvents = [
      'mousemove',
      'keydown',
      'wheel',
      'scroll',
      'touchstart',
      'click',
      'mousedown',
      'keypress',
      'input',
    ];

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity);
    });

    // Visibility and focus events
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleUserActivity);
    window.addEventListener('pageshow', handleUserActivity);

    // Check immediately on page load if we should logout
    const timeSinceLastActivity = Date.now() - lastActivityRef.current;
    if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
      performLogout();
    }

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleUserActivity);
      window.removeEventListener('pageshow', handleUserActivity);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [navigate]);

  const hideSidebar = hideNavbarPaths.includes(window.location.pathname);

  return (
    <div
      className={clsx(
        'w-full bg-surface-gray',
        fullHeight ? 'h-screen overflow-hidden' : 'min-h-screen'
      )}
    >
      {!hideSidebar && <Sidebar />}
      <div
        className={clsx('flex flex-col', fullHeight ? 'h-screen overflow-hidden' : 'min-h-screen')}
        style={{ marginLeft: hideSidebar ? 0 : SIDEBAR_WIDTH }}
      >
        <Header />
        <div
          className={clsx('w-full', fullHeight ? 'flex-1 min-h-0 overflow-hidden' : 'flex-grow')}
        >
          {children}
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default MainLayout;
