import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Routes, useLocation } from 'react-router-dom';
import { renderRoutes, Routes as AllRoutes } from './routes';
import { ToastContainer } from 'react-toastify';
import { useInternetConnection } from './hooks/useInternetConnection';
import NotificationStreamListener from './components/Header/NotificationStreamListener';
import {
  clearLegacyImpersonationLocalStorage,
  validateImpersonationSessionOwnership,
  getLocalStorageItem,
} from './shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from './constants/webAPI';
import {
  isDevAuthBypassEnabled,
  createDevBypassToken,
  getDevBypassLoginPayload,
} from './shared/utils/auth/devAuthBypass';
import { loginStore } from './redux/slices/loginSlice';
import type { RootState } from './redux/provider/store';

const App = () => {
  // Monitor internet connection globally
  useInternetConnection();

  const { pathname } = useLocation();
  const isPublicPage = pathname.startsWith('/public/');

  const dispatch = useDispatch();
  const loginToken = useSelector((state: RootState) => state.LoginSlice?.loginToken);

  useEffect(() => {
    clearLegacyImpersonationLocalStorage();

    validateImpersonationSessionOwnership();
  }, []);

  useEffect(() => {
    // DEV-ONLY: hydrate Redux with a fake "logged in" session when the backend
    // login isn't available yet. See src/shared/utils/auth/devAuthBypass.ts.
    if (!isDevAuthBypassEnabled() || loginToken) {
      return;
    }
    const existingToken = getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);
    const token = existingToken || createDevBypassToken();
    dispatch(loginStore(getDevBypassLoginPayload(token)));
  }, [dispatch, loginToken]);

  return (
    <div className="w-full min-h-screen flex-col items-center justify-center">
      <ToastContainer />
      {!isPublicPage && <NotificationStreamListener />}
      <Routes>{renderRoutes(AllRoutes)}</Routes>
    </div>
  );
};

export default App;
