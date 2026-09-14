import { useEffect, useState } from 'react';
import { Routes, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { renderRoutes, Routes as AllRoutes } from './routes';
import { ToastContainer } from 'react-toastify';
import { useInternetConnection } from './hooks/useInternetConnection';
import { useKeyboardShortcut } from './hooks/useKeyboardShortcut';
import NotificationStreamListener from './components/Header/NotificationStreamListener';
import {
  clearLegacyImpersonationLocalStorage,
  validateImpersonationSessionOwnership,
} from './shared/utils/auth/localstorage.helpers';
import DevRoleSwitcher from './components/DevRoleSwitcher';
import { requestGlobalSearchFocus } from './redux/slices/globalSearchSlice';
import ShortcutsHelpModal from './components/shared/ShortcutsHelpModal';

const App = () => {
  // Monitor internet connection globally
  useInternetConnection();

  const { pathname } = useLocation();
  const isPublicPage = pathname.startsWith('/public/');
  const dispatch = useDispatch();
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Mounted here (not MainLayout) because MainLayout isn't wrapped around
  // every route yet — App.tsx is the one component every page actually
  // renders through, so it's the only place a shortcut is guaranteed to
  // work everywhere. Skipped on public/unauthenticated pages (e.g. the
  // careers apply flow) the same way NotificationStreamListener already is
  // below, so a public visitor typing into a form isn't surprised by either
  // shortcut firing.
  useKeyboardShortcut('k', () => dispatch(requestGlobalSearchFocus()), {
    ctrlOrCmd: true,
    enabled: !isPublicPage,
  });
  useKeyboardShortcut('?', () => setShowShortcutsHelp((v) => !v), {
    enabled: !isPublicPage,
  });

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
      <ShortcutsHelpModal open={showShortcutsHelp} onClose={() => setShowShortcutsHelp(false)} />
    </div>
  );
};

export default App;
