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

  return (
    <div className="w-full min-h-screen flex-col items-center justify-center">
      <ToastContainer />
      {!isPublicPage && <NotificationStreamListener />}
      <Routes>{renderRoutes(AllRoutes)}</Routes>
      <DevRoleSwitcher />
    </div>
  );
};

export default App;
