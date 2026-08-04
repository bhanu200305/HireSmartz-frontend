import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MenuItems from './menuItem';
import useHasAccess from '../../hooks/useHasAccess';
import {
  getLocalStorageItem,
  isImpersonationActive,
  setLocalStorageItem,
} from '../../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import { exitImpersonation } from '../../services/AuthService';
import { useDispatch, useSelector } from 'react-redux';
import { showToast } from '../shared';
import { MdExitToApp } from 'react-icons/md';
import { RootState } from '../../redux/provider/store';
import { Authorities } from '../../constants/authorities.constant';
import {
  canViewCompanyTab,
  extractCanManageCompanySettings,
} from '../../shared/utils/auth/permission.helpers';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { loginToken, role, canManageCompanySettings } = useSelector(
    (state: RootState) => state.LoginSlice
  );

  const [activeTab, setActiveTab] = useState<string>('/');
  const isImpersonating = isImpersonationActive(loginToken);
  const tokenFromStorage = getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) as string | null;
  const effectiveCanManageCompanySettings =
    canManageCompanySettings || extractCanManageCompanySettings(loginToken || tokenFromStorage);
  const hasMyCompanyAuthority = useHasAccess(Authorities.MY_COMPANY_VIEW);

  useEffect(() => {
    if (activeTab !== '/') {
      setLocalStorageItem(LOCALSTORAGE_KEYS.ACTIVE_TAB, activeTab);
    }
  }, [activeTab]);

  const handleExitImpersonation = async () => {
    const success = await exitImpersonation(dispatch);
    if (success) {
      showToast({
        message: 'Impersonation exited successfully. You are back as the original user.',
        type: 'success',
      });
      navigate('/');
    } else {
      showToast({
        message: 'Failed to exit impersonation. Please try again.',
        type: 'error',
      });
    }
  };

  const accessibleMenuItems = MenuItems.filter((item) => {
    if (item.name === 'Company') {
      return canViewCompanyTab({
        role,
        canManageCompanySettings: effectiveCanManageCompanySettings,
        hasMyCompanyAuthority,
      });
    }

    return useHasAccess(item.requiredAuthority);
  });

  return (
    <nav className="bg-white shadow-sm px-6 flex items-center justify-between gap-6 ">
      <div className="flex items-center gap-6">
        {accessibleMenuItems.map((item) => {
          const isActive =
            typeof item.path === 'string'
              ? location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
              : item.path.some(
                  (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
                );
          return (
            <div
              key={item.name}
              onClick={() => {
                setActiveTab(location.pathname);
                navigate(typeof item.path === 'string' ? item.path : item.path[0]);
              }}
              className={`flex items-center gap-2 cursor-pointer py-3 transition-all ${
                isActive
                  ? 'text-primary font-medium border-b-1 border-primary'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              {item.icon}
              <span className="heading-font">{item.name}</span>
            </div>
          );
        })}
      </div>

      {isImpersonating && (
        <button
          onClick={handleExitImpersonation}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-all cursor-pointer border border-red-200"
        >
          <MdExitToApp size={18} />
          <span className="text-sm font-medium">Exit Impersonation</span>
        </button>
      )}
    </nav>
  );
};

export default Navbar;
