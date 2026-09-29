import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Drawer, Tooltip } from 'antd';
import { MdClose, MdExitToApp, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import MenuItems from '../Navbar/menuItem';
import useEffectivePermissions from '../../hooks/useEffectivePermissions';
import { Authorities } from '../../constants/authorities.constant';
import {
  isImpersonationActive,
  setLocalStorageItem,
} from '../../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import { exitImpersonation } from '../../services/AuthService';
import { showToast } from '../shared';
import { RootState } from '../../redux/provider/store';
import {
  isPlatformSuperAdminRole,
  isCfpSupportRole,
  isHiringManagerOrRecruiterRole,
} from '../../shared/utils/auth/permission.helpers';
import { useGetOwnUserProfileQuery } from '../../api/organization-service/Users/users';
import { useGetOwnPlatformProfileQuery } from '../../api/organization-service/Platform/staff';
import { systemRoleLabel } from '../RolesManagement/data/roleTemplates';

// Public-folder asset — referenced by URL, not imported (mirrors how Header
// previously referenced /cfpLogo.svg). This is the dedicated icon-only mark
// (also this app's favicon — see index.html), not a shrunk crop of the full
// wordmark. It keeps its real brand gradient at both collapsed and expanded
// widths — paired with a plain-text wordmark (below) when expanded, rather
// than swapping to `/white-logo.svg`, whose flattened all-white rendering
// stripped the "F" mark's gradient too, so the logo's colors used to change
// depending on whether the sidebar was collapsed.
const ICON_LOGO_SRC = '/logoSmall.svg';

// Both widths every page's content column needs to know, to reserve the
// right amount of space — kept here (not computed ad hoc) since MainLayout
// is the only other consumer and both need the exact same numbers, in
// sync, or the content column drifts out from under (or leaves a gap
// beside) the sidebar. COLLAPSED is wide enough for a centered 24px icon
// plus its own padding — narrower and the row's hover/active background
// stops looking like a deliberate rail and starts looking clipped.
export const SIDEBAR_WIDTH_EXPANDED = 240;
export const SIDEBAR_WIDTH_COLLAPSED = 80;

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** Mobile/tablet (below the `lg` breakpoint) off-canvas drawer state — the
   * desktop fixed rail above is untouched by these; below `lg` this
   * component instead renders an antd Drawer driven by these two props
   * (owned by MainLayout, same "single source of truth" reasoning as
   * `collapsed`, since Header's hamburger button also needs to open it). */
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

// This component reuses the exact permission-filtering and impersonation logic
// that previously lived in Navbar — only the visual container (horizontal bar
// -> vertical sidebar) has changed; no authority/routing behavior is new.
//
// `collapsed` is owned by MainLayout (not local state here) — MainLayout
// renders both this and the content column that has to react to the same
// value for its own `marginLeft`, so one is the single source of truth
// rather than two components independently tracking "is the sidebar
// collapsed" and risking drifting apart.
const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { loginToken, role, tenantId, callerKind } = useSelector(
    (state: RootState) => state.LoginSlice
  );
  const isPlatformCaller = callerKind === 'platform';

  const isImpersonating = isImpersonationActive(loginToken);

  // Mobile drawer auto-closes on every route change (a menu click, exit
  // impersonation's own redirect, the logo click — anything that changes
  // the URL) so it never lingers open over the page that navigation landed
  // on. No-op on desktop (mobileOpen is already false there) and no-op when
  // already closed, so this is safe to run unconditionally.
  useEffect(() => {
    onCloseMobile();
  }, [location.pathname]);

  // Same /v1/users/me · /v1/platform/staff/me split Header.tsx already uses
  // for this exact "current user's own name" need — this used to pull the
  // name out of the tenant roster list instead (a workaround from before
  // either /me endpoint existed), which never had a platform-caller path at
  // all (a Super Admin has no `users` row to be found in), and separately
  // never picked up a self-service profile edit — `updateOwnUserProfile`
  // invalidates a different tag than the roster list's `updateUser` does.
  const { data: tenantProfileData } = useGetOwnUserProfileQuery(undefined, {
    skip: isPlatformCaller,
  });
  const { data: platformProfileData } = useGetOwnPlatformProfileQuery(undefined, {
    skip: !isPlatformCaller,
  });
  const userData = isPlatformCaller ? platformProfileData : tenantProfileData;
  // The real role (org-service's own `/platform/staff/me`), not the
  // Redux `role.name` every platform login hardcodes to 'Master Super
  // Admin' regardless of actual role (see isMasterSuperAdminRole's comment
  // in permission.helpers.ts) — super_admin/cfp_admin/cfp_support all
  // reach this footer today, and previously all displayed identically.
  const footerRoleLabel = isPlatformCaller
    ? systemRoleLabel(platformProfileData?.role ?? '')
    : role?.name || '';

  const effectivePermissions = useEffectivePermissions();
  // Plain helper, not a hook — `useHasAccess` is just this same
  // `effectivePermissions.includes(...)` check wrapped around its own
  // `useEffectivePermissions()` call. Calling the real hook inside
  // `.filter()`'s callback (once per menu item, with early returns skipping
  // later ones) varies the hook count between renders and violates React's
  // rules of hooks.
  const hasAccess = (authority?: Authorities): boolean =>
    !!authority && effectivePermissions.includes(authority);

  // Also justifies showing Company without full COMPANY_SETTINGS_EDIT -
  // same list Navbar/index.tsx uses.
  const hasCatalogueManageAccess = [
    Authorities.TENANT_JOB_TITLE_ADD,
    Authorities.TENANT_JOB_TITLE_EDIT,
    Authorities.TENANT_JOB_TITLE_DELETE,
    Authorities.DEPARTMENT_ADD,
    Authorities.DEPARTMENT_EDIT,
    Authorities.DEPARTMENT_DELETE,
    Authorities.JOB_CATALOG_EDIT,
  ].some((authority) => effectivePermissions.includes(authority));

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
      return !tenantId && hasAccess(item.requiredAuthority);
    }

    if (item.name === 'Company') {
      return Boolean(tenantId) && (hasAccess(item.requiredAuthority) || hasCatalogueManageAccess);
    }

    if (item.name === 'CFP Users') {
      // One nav entry serves two different backend resources depending on
      // caller kind (see this item's own path list, and the "Users"/"CFP
      // Users" label swap below): a tenant caller's own team roster
      // (organization-service's GET /v1/organisation-users, gated on
      // USER_ADD — 'user:write' correctly implies "can manage this team"),
      // vs a platform caller's internal CFP staff roster
      // (GET /v1/platform/staff + /v1/platform/departments, both
      // `require_platform_permission(Permission.PLATFORM_READ)` on the
      // backend — see platform_router.py). USER_ADD has no relationship to
      // that second resource at all; a platform caller who holds it but not
      // PLATFORM_VIEW (cfp_admin, confirmed against a real login) saw this
      // item and landed on a page that just 403'd on every row, the same
      // "shown but broken" shape every other PLATFORM_VIEW-gated nav item
      // had before Login/index.tsx started resolving a platform caller's
      // real role.
      return tenantId ? hasAccess(item.requiredAuthority) : hasAccess(Authorities.PLATFORM_VIEW);
    }

    if (
      item.name === 'Company Metrics' ||
      item.name === 'Tenant Audit Log' ||
      item.name === 'Interviews'
    ) {
      // Mirror image of "Companies" above: a platform caller's static
      // permission set happens to include COMPANY_SETTINGS_EDIT (and, for
      // "Interviews", INTERVIEW_QUESTIONS_VIEW) too, but `/my-company`,
      // `/company-metrics`, `/activityFeed` and `/interviews` all either
      // redirect anyone with no tenant of their own straight back to `/`,
      // fetch against `tenantId ?? ''` (same dead end), or — `/interviews`'s
      // own case — hit an interview-service endpoint that outright requires
      // a tenant user. Tenant-only.
      //
      // Matched by "Tenant Audit Log", not "Audit Log" — the platform
      // Audit Log entry below (a different item, displayed with the exact
      // same label) shares that display text but must NOT share this gate;
      // see menuItem.tsx's own comment on the tenant entry for the bug this
      // once caused when both were literally named "Audit Log".
      return Boolean(tenantId) && hasAccess(item.requiredAuthority);
    }

    // Role-gated, not Authorities-gated — see menuItem.tsx's comment on
    // this entry. Checked against the REAL platform role
    // (platformProfileData, org-service's own /platform/staff/me), not the
    // Redux role.name every platform login hardcodes to 'Master Super
    // Admin' regardless of actual role — cfp_admin/cfp_support used to
    // wrongly pass this too. See isPlatformSuperAdminRole's own comment.
    if (item.name === 'Admin') {
      return isPlatformCaller && isPlatformSuperAdminRole(platformProfileData?.role);
    }

    // Role-gated, not Authorities-gated — same pattern and reasoning as
    // "Admin" just above. See isCfpSupportRole's own comment.
    if (item.name === 'My Support Access') {
      return isPlatformCaller && isCfpSupportRole(platformProfileData?.role);
    }

    // Role-gated, not Authorities-gated — see menuItem.tsx's comment on this
    // entry and isHiringManagerOrRecruiterRole's own comment. Tenant-only
    // (own activity has nowhere to come from for a platform caller), same
    // guard as "Company Metrics"/"Tenant Audit Log"/"Interviews" above.
    if (item.name === 'Activity') {
      return Boolean(tenantId) && isHiringManagerOrRecruiterRole(role);
    }

    return hasAccess(item.requiredAuthority);
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

  // Shared nav content for both the desktop rail and the mobile drawer —
  // parameterized on `isCollapsed` rather than closing over the `collapsed`
  // prop directly, since the mobile drawer always renders it expanded
  // (collapsing a temporary overlay serves no purpose) while the desktop
  // rail passes through the real user-toggled `collapsed` state unchanged.
  const renderNav = (isCollapsed: boolean) => (
    <>
      {/* Logo */}
      <div
        className={`flex items-center gap-2.5 py-5 cursor-pointer ${isCollapsed ? 'justify-center px-2' : 'px-5'}`}
        onClick={() => navigate('/')}
      >
        <img
          src={ICON_LOGO_SRC}
          alt="Careerforce Pro"
          className="h-8 w-8 shrink-0 object-contain"
        />
        {!isCollapsed && (
          <span className="font-display text-base font-bold tracking-tight whitespace-nowrap">
            <span style={{ color: '#11b7dd' }}>careerforce</span>{' '}
            <span style={{ color: '#0F40A2' }}>pro</span>
          </span>
        )}
      </div>

      <div className="mx-4 mb-4 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {isImpersonating &&
        (isCollapsed ? (
          <div className="px-3 mb-3 flex justify-center">
            <Tooltip title="Exit Impersonation" placement="right">
              <button
                onClick={handleExitImpersonation}
                aria-label="Exit Impersonation"
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-all cursor-pointer"
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239,68,68,0.25)',
                }}
              >
                <MdExitToApp size={16} />
              </button>
            </Tooltip>
          </div>
        ) : (
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
        ))}

      {/* Nav items — overflow-y-auto so a short browser window (or a role
          with a long menu) scrolls the item list internally rather than
          pushing the "Welcome"/role footer below off-screen. Left at the
          browser's own scrollbar by default, that's a big, unstyled native
          scrollbar with arrow buttons sitting right at the sidebar/content
          boundary — jarring against everything else in the app, which
          already gets the same `.thin-scrollbar` treatment (index.css) for
          exactly this failure mode elsewhere (see AntdCommonModal bodies,
          Company Settings' tab strips). */}
      <nav className="thin-scrollbar flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
        {accessibleMenuItems.map((item) => {
          const isActive = isItemActive(item.path);
          // Display-only relabel, this item's underlying `name` (used above
          // for permission filtering and as this list's `key`) is untouched.
          // "CFP Users" is accurate for the platform staff roster this same
          // nav entry links a Super Admin to (see menuItem.tsx's own
          // comment), but a Company Admin — identified by `tenantId` — only
          // ever sees their own tenant's roster at that link
          // (OrganisationUserPage renders OrganisationUserTable, titled
          // "Users", for them; CfpUsers never renders without PLATFORM_VIEW)
          // — "CFP Users" reads as someone else's team there.
          const label =
            item.name === 'CFP Users' && tenantId
              ? 'Users'
              : // Internal name only, kept distinct from the platform
                // "Audit Log" entry so the two can be gated separately (see
                // menuItem.tsx's comment on this entry) — both still show
                // "Audit Log" to whoever actually sees them.
                item.name === 'Tenant Audit Log'
                ? 'Audit Log'
                : item.name;
          const button = (
            <button
              key={item.name}
              onClick={() => handleNavigate(item.path)}
              className={`w-full flex items-center rounded-lg text-left transition-all cursor-pointer ${
                isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
              }`}
              style={{
                background: isActive ? 'rgba(17,183,221,0.12)' : 'transparent',
                color: isActive ? '#11b7dd' : 'rgba(255,255,255,0.45)',
              }}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!isCollapsed && (
                <span
                  className="text-sm flex-1 truncate heading-font"
                  style={{ fontWeight: isActive ? 500 : 400 }}
                >
                  {label}
                </span>
              )}
            </button>
          );
          return isCollapsed ? (
            <Tooltip key={item.name} title={label} placement="right">
              {button}
            </Tooltip>
          ) : (
            button
          );
        })}
      </nav>

      {/* Footer: current user */}
      <div className="mx-4 mb-3 mt-4 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className={isCollapsed ? 'px-3 pb-5' : 'px-4 pb-5'}>
        {isCollapsed ? (
          <Tooltip
            title={`Welcome${userData?.first_name ? `, ${userData.first_name}` : ''} · ${footerRoleLabel}`}
            placement="right"
          >
            <div className="flex justify-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 bg-brand-400"
                aria-hidden
              >
                {(userData?.first_name || 'U').charAt(0).toUpperCase()}
              </div>
            </div>
          </Tooltip>
        ) : (
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
                {footerRoleLabel}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop / large-tablet rail — identical to before: always rendered
          at `lg` and up, fixed position, user-toggled collapse width. Hidden
          below `lg` (1024px) in favor of the off-canvas drawer beneath,
          since a permanent 80–240px rail has nowhere to go on a phone-width
          screen. */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 h-full flex-col z-40 bg-brand-900 transition-[width] duration-200 ease-in-out"
        style={{
          width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Collapse/expand toggle — a small circular button straddling the
            sidebar's right edge, the same spot this pattern sits in most
            collapsible-sidebar apps, so it stays reachable and obvious
            regardless of collapsed/expanded width. */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-6 z-50 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border shadow-sm transition-colors hover:bg-brand-50"
          style={{ background: '#ffffff', borderColor: 'rgba(0,0,0,0.08)', color: '#4b5563' }}
        >
          {collapsed ? <MdChevronRight size={16} /> : <MdChevronLeft size={16} />}
        </button>

        {renderNav(collapsed)}
      </aside>

      {/* Mobile / portrait-tablet off-canvas drawer (below `lg`) — same nav
          content as the rail above, always rendered expanded, opened via the
          hamburger button Header renders below `lg`. Closes on backdrop
          click, its own close button, or (see the effect above) any route
          change. */}
      <Drawer
        open={mobileOpen}
        onClose={onCloseMobile}
        placement="left"
        width={SIDEBAR_WIDTH_EXPANDED}
        closable={false}
        styles={{ body: { padding: 0 } }}
      >
        <div className="relative h-full flex flex-col bg-brand-900">
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="absolute right-3 top-5 z-50 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors"
            style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.06)' }}
          >
            <MdClose size={18} />
          </button>
          {renderNav(false)}
        </div>
      </Drawer>
    </>
  );
};

export default Sidebar;
