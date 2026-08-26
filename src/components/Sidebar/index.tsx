import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { useDispatch, useSelector } from 'react-redux';
import { MdExitToApp } from 'react-icons/md';
import MenuItems from '../Navbar/menuItem';
import useHasAccess from '../../hooks/useHasAccess';
import {
  getLocalStorageItem,
  isImpersonationActive,
  setLocalStorageItem,
} from '../../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import { exitImpersonation } from '../../services/AuthService';
import { showToast } from '../shared';
import { RootState } from '../../redux/provider/store';
import { isMasterSuperAdminRole } from '../../shared/utils/auth/permission.helpers';
import { useListUsersQuery } from '../../api/organization-service/Users/users';

// Public-folder asset — referenced by URL, not imported (mirrors how Header
// previously referenced /cfpLogo.svg).
const WHITE_LOGO_SRC = '/white-logo.svg';

// Same fixed offset every page's content column reserves for this sidebar —
// keep in sync with the `marginLeft` MainLayout applies to its content column.
export const SIDEBAR_WIDTH = 240;

// This component reuses the exact permission-filtering and impersonation logic
// that previously lived in Navbar — only the visual container (horizontal bar
// -> vertical sidebar) has changed; no authority/routing behavior is new.
const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { loginToken, role, tenantId } = useSelector((state: RootState) => state.LoginSlice);

  const isImpersonating = isImpersonationActive(loginToken);

  const token = getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);
  const userId =
    useSelector((state: RootState) => state.LoginSlice.userId) ||
    (token && (jwtDecode(token as string) as any)?.userId);

  // useGetUserProfileQuery (tenant-service/UserProfile) hit a dead,
  // pre-microservices path (`orguserservice/user/profile/getById`) that no
  // longer exists on organization-service — always 404'd, silently falling
  // back to "Welcome, User" for every real login. There's no single-user or
  // `/me` endpoint on the backend today, so this reuses the same
  // already-proven workaround EditOrganisationUser/index.tsx uses: pull the
  // current user out of the real tenant roster list instead. Same known
  // limitation as that call site — a tenant with >200 users whose current
  // user isn't on the first page still falls back to "User".
  const { data: usersData } = useListUsersQuery(
    { includeInactive: true, limit: 200 },
    { skip: !tenantId }
  );
  const userData = usersData?.items.find((u) => u.user_id === userId);

  const accessibleMenuItems = MenuItems.filter((item) => {
    // No requiredAuthority by design — see menuItem.tsx's comment on this
    // entry. Always visible to any authenticated session, matching the `/`
    // route itself having no permission gate.
    if (item.name === 'Dashboard') {
      return true;
    }

    if (item.name === 'Companies') {
      // COMPANY_VIEW ('tenant:read') is also a real permission a tenant's
      // own role can hold, for reading THEIR OWN tenant — so the permission
      // check alone can't tell a platform caller from a tenant one here.
      // This platform-only screen (lists every company) additionally
      // requires no tenant of their own, same principal-type guard
      // CustomerPage's own route already enforces.
      return !tenantId && useHasAccess(item.requiredAuthority);
    }

    if (item.name === 'Company' || item.name === 'Company Metrics') {
      // Mirror image of "Companies" above: a platform caller's static
      // permission set happens to include COMPANY_SETTINGS_VIEW too, but
      // `/my-company` (and `/company-metrics`) redirects anyone with no
      // tenant of their own straight back to `/` — a dead link for them.
      // Tenant-only.
      return Boolean(tenantId) && useHasAccess(item.requiredAuthority);
    }

    // Role-gated, not Authorities-gated — see menuItem.tsx's comment on this
    // entry and isMasterSuperAdminRole's own comment on why this reads
    // false for every real login today, not just non-admins.
    if (item.name === 'Admin') {
      return isMasterSuperAdminRole(role);
    }

    return useHasAccess(item.requiredAuthority);
  });

  const handleNavigate = (path: string | string[]) => {
    const target = typeof path === 'string' ? path : path[0];
    setLocalStorageItem(LOCALSTORAGE_KEYS.ACTIVE_TAB, target);
    navigate(target);
  };

  const isItemActive = (path: string | string[]) =>
    typeof path === 'string'
      ? location.pathname === path || location.pathname.startsWith(`${path}/`)
      : path.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`));

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

  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-40 bg-brand-900"
      style={{ width: SIDEBAR_WIDTH, borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-5 py-5 cursor-pointer"
        onClick={() => navigate('/')}
      >
        <img src={WHITE_LOGO_SRC} alt="careerforce pro" className="h-8 w-auto object-contain" />
      </div>

      <div className="mx-4 mb-4 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {isImpersonating && (
        <div className="px-3 mb-3">
          <button
            onClick={handleExitImpersonation}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer text-xs font-medium"
            style={{
              background: 'rgba(239,68,68,0.12)',
              color: '#fca5a5',
              border: '1px solid rgba(239,68,68,0.25)',
            }}
          >
            <MdExitToApp size={16} />
            <span className="truncate">Exit Impersonation</span>
          </button>
        </div>
      )}

      <p
        className="px-5 mb-2 text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'rgba(255,255,255,0.25)' }}
      >
        Main Menu
      </p>

      {/* Nav items */}
      <nav className="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto">
        {accessibleMenuItems.map((item) => {
          const isActive = isItemActive(item.path);
          return (
            <button
              key={item.name}
              onClick={() => handleNavigate(item.path)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer"
              style={{
                background: isActive ? 'rgba(17,183,221,0.12)' : 'transparent',
                color: isActive ? '#11b7dd' : 'rgba(255,255,255,0.45)',
              }}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span
                className="text-sm flex-1 truncate heading-font"
                style={{ fontWeight: isActive ? 500 : 400 }}
              >
                {item.name}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer: current user */}
      <div className="mx-4 mb-3 mt-4 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="px-4 pb-5">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 bg-brand-400"
            aria-hidden
          >
            {(userData?.first_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">
              Welcome{userData?.first_name ? `, ${userData.first_name}` : ''}
            </p>
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {role?.name || ''}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
