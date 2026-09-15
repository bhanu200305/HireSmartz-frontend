import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useLogoutMutation } from '../../api/authentication-service/Logout/logout';
import {
  clearImpersonationStorage,
  clearLocalStorage,
  getLocalStorageItem,
  isImpersonationActive,
} from '../../shared/utils/auth/localstorage.helpers';
import { isDevBypassToken } from '../../shared/utils/auth/devAuthBypass';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import { persistor } from '../../redux/provider/store';
import { resetJobOpeningFilters } from '../../redux/slices/jobOpeningFilterSlice';
import { useDispatch } from 'react-redux';
import { resetOrgUserFilters } from '../../redux/slices/OrgUserFilterSlice';
import { resetCompanyFilters } from '../../redux/slices/companyFilterSlice';
import { resetState } from '../../redux/slices/loginSlice';
import { clearGlobalSearch } from '../../redux/slices/globalSearchSlice';
import { resetNotificationState } from '../../redux/slices/notificationSlice';
import { showToast } from '../../components';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { api } from '../../api';
import { interviewApi } from '../../api/interview-service/client';
import { publicApplyApi } from '../../api/candidate-service/PublicApply';
import { candidateApi } from '../../api/candidate-service/candidateApi';
import { authApi } from '../../api/authentication-service/authApi';
import { orgApi } from '../../api/organization-service/orgApi';
import { notifApi } from '../../api/notification-service/notifApi';
import { jobApi } from '../../api/job-service/jobApi';
import { aiApi } from '../../api/ai-service/aiApi';

const LogOutPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isInactivityLogout =
    (location.state as { inactivity?: boolean } | null)?.inactivity === true;
  const [logout, { isSuccess, isLoading }] = useLogoutMutation();
  // StrictMode (dev only) double-invokes this mount effect, running
  // handleLogout twice concurrently. The first call clears the session
  // synchronously (inside cleanupClientSession, before its first real await)
  // well before it settles, so an un-guarded second call would see no token
  // left, fall through to a doomed real /auth/logout call, and surface a
  // spurious "Logout failed" toast alongside the first call's real result.
  const hasStartedLogoutRef = useRef(false);

  const cleanupClientSession = async (): Promise<void> => {
    clearLocalStorage();

    await persistor.purge();
    await persistor.flush();

    localStorage.removeItem('persist:root');
    // Resets every RTK Query slice, not just the base one — avoids a
    // cross-tenant cache flash on the next login.
    dispatch(api.util.resetApiState());
    dispatch(jobApi.util.resetApiState());
    dispatch(orgApi.util.resetApiState());
    dispatch(candidateApi.util.resetApiState());
    dispatch(interviewApi.util.resetApiState());
    dispatch(publicApplyApi.util.resetApiState());
    dispatch(authApi.util.resetApiState());
    dispatch(notifApi.util.resetApiState());
    dispatch(aiApi.util.resetApiState());
    dispatch(resetJobOpeningFilters());
    dispatch(resetOrgUserFilters());
    dispatch(resetCompanyFilters());
    dispatch(clearGlobalSearch());
    dispatch(resetNotificationState());
    dispatch(resetState());
    sessionStorage.clear();
  };

  const handleLogout = async () => {
    if (hasStartedLogoutRef.current) return;
    hasStartedLogoutRef.current = true;

    const isImpersonating = isImpersonationActive();
    if (isImpersonating) {
      showToast({
        message: 'To logout you need to exit the Impersonation mode',
        type: 'warning',
      });
      navigate('/');
      return;
    }

    // A dev-bypass session (see devAuthBypass.ts) was never created on the
    // real backend — there is no server-side session for POST /auth/logout
    // to revoke, and the real authentication-service can't verify this
    // token's (fake) signature anyway, so it always 401s. That's not an
    // actual failure, so skip straight to clearing the local session instead
    // of surfacing a "Logout failed" toast for something that isn't broken.
    const currentToken = getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);
    if (isDevBypassToken(currentToken)) {
      clearImpersonationStorage();
      await cleanupClientSession();
      const successMessage = isInactivityLogout
        ? 'You have been logged out successfully.'
        : 'You have been logged out.';
      setTimeout(() => {
        navigate('/login', { state: { successMessage } });
      }, 100);
      return;
    }

    try {
      clearImpersonationStorage();

      // 204 No Content — there is no response body to read a message off,
      // success is "the promise resolved" (see api/authentication-service/Logout/logout.ts).
      await logout().unwrap();
      await cleanupClientSession();

      const successMessage = isInactivityLogout
        ? 'You have been logged out successfully.'
        : 'You have been logged out.';
      setTimeout(() => {
        navigate('/login', { state: { successMessage } });
      }, 100);
      // navigate('/login')
    } catch (error: any) {
      clearImpersonationStorage();
      await cleanupClientSession();

      showToast({
        message: error?.data?.message || 'Logout failed. Clearing session.',
        type: 'warning',
      });
      console.error('Logout Error:', error);

      setTimeout(() => {
        navigate('/login');
      }, 500);
    }
  };
  useEffect(() => {
    if (!isLoading && !isSuccess) {
      handleLogout();
    }
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-xl font-medium mb-4">Logging you out!</p>
        <div className="flex items-center justify-center">
          <Spin
            indicator={<LoadingOutlined style={{ fontSize: 36, color: 'var(--primary)' }} spin />}
          />
        </div>
      </div>
    </div>
  );
};

export default LogOutPage;
