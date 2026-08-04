import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useLogoutMutation } from '../../api/authentication-service/Logout/logout';
import {
  clearImpersonationStorage,
  clearLocalStorage,
  isImpersonationActive,
} from '../../shared/utils/auth/localstorage.helpers';
import { persistor } from '../../redux/provider/store';
import { resetJobOpeningFilters } from '../../redux/slices/jobOpeningFilterSlice';
import { useDispatch } from 'react-redux';
import { resetOrgUserFilters } from '../../redux/slices/OrgUserFilterSlice';
import { resetCompanyFilters } from '../../redux/slices/companyFilterSlice';
import { resetFilters } from '../../redux/slices/userFilterSlice';
import { resetState } from '../../redux/slices/loginSlice';
import { clearGlobalSearch } from '../../redux/slices/globalSearchSlice';
import { resetNotificationState } from '../../redux/slices/notificationSlice';
import { showToast } from '../../components';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { api } from '../../api';

const LogOutPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isInactivityLogout =
    (location.state as { inactivity?: boolean } | null)?.inactivity === true;
  const [logout, { isSuccess, isLoading }] = useLogoutMutation();

  const cleanupClientSession = async (): Promise<void> => {
    clearLocalStorage();

    await persistor.purge();
    await persistor.flush();

    localStorage.removeItem('persist:root');
    dispatch(api.util.resetApiState());
    dispatch(resetJobOpeningFilters());
    dispatch(resetOrgUserFilters());
    dispatch(resetCompanyFilters());
    dispatch(resetFilters());
    dispatch(clearGlobalSearch());
    dispatch(resetNotificationState());
    dispatch(resetState());
    sessionStorage.clear();
  };

  const handleLogout = async () => {
    const isImpersonating = isImpersonationActive();
    if (isImpersonating) {
      showToast({
        message: 'To logout you need to exit the Impersonation mode',
        type: 'warning',
      });
      navigate('/');
      return;
    }

    try {
      clearImpersonationStorage();

      const response = await logout().unwrap();
      await cleanupClientSession();

      const successMessage = isInactivityLogout
        ? 'You have been logged out successfully.'
        : response.message;
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
