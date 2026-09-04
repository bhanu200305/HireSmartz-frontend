import { useEffect } from 'react';
import { Routes, useLocation } from 'react-router-dom';
import { renderRoutes, Routes as AllRoutes } from './routes';
import { ToastContainer } from 'react-toastify';
import { useInternetConnection } from './hooks/useInternetConnection';
import NotificationStreamListener from './components/Header/NotificationStreamListener';
import {
  clearLegacyImpersonationLocalStorage,
  validateImpersonationSessionOwnership,
} from './shared/utils/auth/localstorage.helpers';
import DevRoleSwitcher from './components/DevRoleSwitcher';

const App = () => {
  // Monitor internet connection globally
  useInternetConnection();

  const { pathname } = useLocation();
  const isPublicPage = pathname.startsWith('/public/');

  useEffect(() => {
    clearLegacyImpersonationLocalStorage();

    validateImpersonationSessionOwnership();
  }, []);

  // React Router doesn't reset scroll on navigation the way a real page load
  // does — without this, clicking into a page while scrolled down on the
  // previous one lands you at that same scroll offset here, which can hide
  // everything above the fold (e.g. My Company's header/back-link) and look
  // like the page didn't load at all. Keyed on pathname only, not the full
  // search string, so switching tabs via `?tab=` within one page (MyCompany,
  // CompanySettings, ViewCustomer, etc.) doesn't yank the scroll position
  // back up every time.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="w-full min-h-screen flex-col items-center justify-center">
      <ToastContainer style={{ zIndex: 99999 }} />
      {!isPublicPage && <NotificationStreamListener />}
      <Routes>{renderRoutes(AllRoutes)}</Routes>
      <DevRoleSwitcher />
    </div>
  );
};

export default App;
