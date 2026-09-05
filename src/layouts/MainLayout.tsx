import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Header from '../components/Header';
import Sidebar, { SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED } from '../components/Sidebar';
import { useMediaQuery } from '../hooks/useMediaQuery';
import {
  clearLocalStorage,
  clearImpersonationStorage,
  getLocalStorageItem,
  setLocalStorageItem,
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
  // Owned here, not inside Sidebar — this component renders both Sidebar
  // and the content column that has to shift by the exact same amount, so
  // one shared value (not two components each tracking their own) is what
  // keeps them from drifting apart. Persisted so the choice survives a
  // reload/new tab instead of silently re-expanding every navigation.
  //
  // `=== 'true'` (a string), not `=== true`: setLocalStorageItem always
  // JSON.stringifies its value before storing, and getLocalStorageItem's
  // own JSON.parse(JSON.stringify(...)) round-trip is a no-op identity for
  // a string — passing the real boolean `true` in ends up stored as the
  // 4-character string `true`, read back as that same string, never as an
  // actual boolean.
  const [collapsed, setCollapsed] = useState<boolean>(
    () => getLocalStorageItem(LOCALSTORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true'
  );
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      setLocalStorageItem(LOCALSTORAGE_KEYS.SIDEBAR_COLLAPSED, next);
      return next;
    });
  };

  // Below `lg` (1024px) the fixed rail has nowhere to go, so Sidebar renders
  // an off-canvas drawer instead — this is that drawer's open/close state,
  // owned here (not in Sidebar or Header) since both Header (the hamburger
  // button that opens it) and Sidebar (the drawer itself) need to share it.
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // Resizing/rotating across the breakpoint into desktop width should never
  // leave the mobile drawer's overlay+mask stuck open behind the now-visible
  // fixed rail.
  useEffect(() => {
    if (isDesktop) setMobileSidebarOpen(false);
  }, [isDesktop]);

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
      {!hideSidebar && (
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
      )}
      <div
        className={clsx(
          'flex flex-col transition-[margin-left] duration-200 ease-in-out',
          fullHeight ? 'h-screen overflow-hidden' : 'min-h-screen'
        )}
        style={{
          // No reserved gutter below `lg` — Sidebar is an overlay drawer
          // there, not a permanent rail, so content should use the full
          // width exactly like the hideSidebar case does.
          marginLeft:
            hideSidebar || !isDesktop
              ? 0
              : collapsed
                ? SIDEBAR_WIDTH_COLLAPSED
                : SIDEBAR_WIDTH_EXPANDED,
        }}
      >
        <Header onOpenMobileMenu={hideSidebar ? undefined : () => setMobileSidebarOpen(true)} />
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
