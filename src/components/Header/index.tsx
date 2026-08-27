import { Avatar, Dropdown, Modal, Select } from 'antd';
import { DownOutlined, CheckOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { RootState } from '../../redux/provider/store';
import { useDispatch, useSelector } from 'react-redux';
import { makeFirstLetterUpperCase } from '../../shared/utils/methods';
import {
  getLocalStorageItem,
  isImpersonationActive,
} from '../../shared/utils/auth/localstorage.helpers';
import { useGetOwnUserProfileQuery } from '../../api/organization-service/Users/users';
import { useGetOwnPlatformProfileQuery } from '../../api/organization-service/Platform/staff';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import './header.css';
import { Search, showToast } from '../shared';
import { MdOutlineFilterAlt } from 'react-icons/md';
import { useState, useEffect } from 'react';
import GlobalSearch from '../shared/GlobalSearch';
import { useGetCategoriesQuery } from '../../api/search-service/Dashboard/GlobalSearch';
import {
  useLazyGetNylasAuthUrlQuery,
  useGetNylasGrantStatusQuery,
  useDisconnectNylasGrantMutation,
} from '../../api/interview-service/Nylas/index';
import { isMultiLocationRoleName } from '../../shared/utils/business-logic';
import {
  clearGlobalSearch,
  clearGlobalSearchCategorySelection,
  setGlobalSearchCategorySelection,
  setGlobalSearchQuery,
} from '../../redux/slices/globalSearchSlice';
import { api } from '../../api';
import NotificationBell from './NotificationBell';
import LocationSwitcher from '../Navbar/LocationSwitcher';
import { useGetTenantProfileQuery } from '../../api/organization-service/Tenants/profile';

const { Option, OptGroup } = Select;

interface CategoryItem {
  uiName: string;
  entityField: string;
  dbColumn: string;
}

interface CategoriesResponse {
  [key: string]: CategoryItem[];
}

interface SearchParams {
  query: string;
  category?: string;
  field?: string;
}

const resolveSearchSelection = (
  value: string | null,
  categoriesData?: CategoriesResponse
): { category?: string; field?: string } => {
  if (!value || !categoriesData) {
    return {};
  }

  if (value.startsWith('CATEGORY_')) {
    const category = value.replace('CATEGORY_', '');
    return { category };
  }

  for (const [category, items] of Object.entries(categoriesData)) {
    const item = items.find((i) => `${category}_${i.entityField}` === value);
    if (item) {
      return { category, field: item.dbColumn };
    }
  }

  return {};
};

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const persistedGlobalQuery = useSelector((state: RootState) => state.globalSearchSlice.query);
  const persistedCategoryValue = useSelector(
    (state: RootState) => state.globalSearchSlice.selectedCategoryValue
  );
  const [searchQuery, setSearchQuery] = useState(persistedGlobalQuery || '');
  const [selectedValue, setSelectedValue] = useState<string | null>(persistedCategoryValue || null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams>({ query: '' });
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [shouldFetchCategories, setShouldFetchCategories] = useState(false);
  const [showSwitchCalendarModal, setShowSwitchCalendarModal] = useState(false);
  const [showDisconnectCalendarModal, setShowDisconnectCalendarModal] = useState(false);

  // getLocalStorageItem now falls back to sessionStorage for this key (see
  // that helper's own comment) — this used to read straight from
  // localStorage, which Login/index.tsx only populates via a second call
  // (`setTokens`) after its own unconditional sessionStorage write. `token`
  // going stale here meant `skip: !token` below always skipped BOTH profile
  // queries, `userData` never resolved, and the avatar/"Welcome"/Logout
  // dropdown this whole block gates on (`{userData && (...)}`, further
  // down) silently never rendered.
  const token = getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);
  const autoLogin = location?.state?.autoLogin;

  const role = useSelector((state: RootState) => state.LoginSlice.role);
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);
  const callerKind = useSelector((state: RootState) => state.LoginSlice.callerKind);
  const isPlatformCaller = callerKind === 'platform';

  // Company branding for the profile card below — only a tenant session has
  // a company at all (mirrors the tenantId checks already used throughout
  // this file and Sidebar.tsx for the same tenant-vs-platform distinction).
  // RTK Query dedupes this against any other screen already fetching the
  // same tenant's profile (e.g. MyCompany), so this is not an extra request
  // beyond what's already in flight for a Company Admin.
  const { data: tenantProfile } = useGetTenantProfileQuery(tenantId ?? '', {
    skip: !tenantId,
  });

  const isNylasFeatureEnabled = import.meta.env.VITE_NYLAS_FEATURE === 'true';
  const isCalendarUser = isMultiLocationRoleName(role?.name);
  const shouldFetchGrantStatus = isNylasFeatureEnabled && isCalendarUser;

  const [triggerGetNylasAuthUrl, { isFetching: isConnectingCalendar }] =
    useLazyGetNylasAuthUrlQuery();

  const { data: grantStatus, isLoading: isGrantStatusLoading } = useGetNylasGrantStatusQuery(
    undefined,
    {
      skip: !shouldFetchGrantStatus,
    }
  );

  const [disconnectGrant, { isLoading: isDisconnecting }] = useDisconnectNylasGrantMutation();

  // /v1/users/me self-identifies from the Bearer token server-side, no
  // userId needed as a query arg. Decided upfront by callerKind, same as
  // /profile — a platform caller has no `users` row at all, so there's no
  // reason to fire that query for them; /v1/platform/staff/me is the real
  // source for their name instead.
  const { data: tenantProfileData, error: tenantProfileError } = useGetOwnUserProfileQuery(
    undefined,
    {
      skip: autoLogin || !token || isPlatformCaller,
      refetchOnMountOrArgChange: true,
    }
  );
  const { data: platformProfileData, error: platformProfileError } = useGetOwnPlatformProfileQuery(
    undefined,
    {
      skip: autoLogin || !token || !isPlatformCaller,
      refetchOnMountOrArgChange: true,
    }
  );
  const profileError = isPlatformCaller ? platformProfileError : tenantProfileError;

  // Both OrgUser (snake_case, tenant `users` table) and OwnPlatformProfile
  // (`memberships`) mapped to the one shape this component's JSX already
  // expects below. profilePicture stays permanently null either way —
  // neither table has one today.
  const userData = profileError
    ? { firstName: 'User', lastName: null as string | null, profilePicture: null, roleName: null }
    : isPlatformCaller
      ? platformProfileData
        ? {
            firstName: platformProfileData.first_name || 'User',
            lastName: platformProfileData.last_name,
            profilePicture: null,
            roleName: platformProfileData.role,
          }
        : undefined
      : tenantProfileData
        ? {
            firstName: tenantProfileData.first_name,
            lastName: tenantProfileData.last_name,
            profilePicture: null,
            roleName: null,
          }
        : undefined;

  const { data: categoriesRes } = useGetCategoriesQuery(undefined, {
    skip: !shouldFetchCategories,
    refetchOnMountOrArgChange: true,
  });

  const categoriesData = categoriesRes as CategoriesResponse | undefined;

  useEffect(() => {
    setSearchQuery(persistedGlobalQuery || '');
  }, [persistedGlobalQuery]);

  useEffect(() => {
    setSelectedValue(persistedCategoryValue || null);
  }, [persistedCategoryValue]);

  useEffect(() => {
    if (persistedCategoryValue) {
      setShouldFetchCategories(true);
    }
  }, [persistedCategoryValue]);

  useEffect(() => {
    const params: SearchParams = { query: searchQuery };

    if (selectedValue) {
      const resolvedSelection = resolveSearchSelection(selectedValue, categoriesData);
      if (resolvedSelection.category) {
        params.category = resolvedSelection.category;
      }
      if (resolvedSelection.field) {
        params.field = resolvedSelection.field;
      }
    }

    setSearchParams(params);
  }, [selectedValue, searchQuery, categoriesData]);

  const handleSelect = (value: string) => {
    setSelectedValue(value);
    const resolvedSelection = resolveSearchSelection(value, categoriesData);
    dispatch(
      setGlobalSearchCategorySelection({
        value,
        field: resolvedSelection.field || '',
      })
    );
    setDropdownOpen(false);

    if (!searchQuery) {
      setSearchQuery('');
    }
  };

  const handleCategoryHeaderClick = (category: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const categoryValue = `CATEGORY_${category}`;

    if (selectedValue === categoryValue) {
      setSelectedValue(null);
      dispatch(clearGlobalSearchCategorySelection());
    } else {
      setSelectedValue(categoryValue);
      dispatch(
        setGlobalSearchCategorySelection({
          value: categoryValue,
          field: category,
        })
      );
      if (!searchQuery) {
        setSearchQuery('');
      }
    }

    setDropdownOpen(false);
  };

  const isCategorySelected = (category: string) => {
    return selectedValue === `CATEGORY_${category}`;
  };

  const shouldShowTickForItem = (category: string, entityField: string) => {
    const itemValue = `${category}_${entityField}`;

    if (isCategorySelected(category)) {
      return true;
    }

    if (selectedValue === itemValue) {
      return true;
    }

    return false;
  };

  const getDisplayValue = () => {
    if (!selectedValue) return undefined;

    if (selectedValue.startsWith('CATEGORY_')) {
      const category = selectedValue.replace('CATEGORY_', '');
      return `All ${makeFirstLetterUpperCase(category.toLowerCase().replace('_', ' '))}`;
    }

    if (!categoriesData) return undefined;

    for (const [category, items] of Object.entries(categoriesData)) {
      const item = items.find((i) => `${category}_${i.entityField}` === selectedValue);
      if (item) return item.uiName;
    }

    return selectedValue;
  };

  const handleClear = () => {
    setSelectedValue(null);
    dispatch(clearGlobalSearchCategorySelection());
  };

  const handleDropdownVisibleChange = (open: boolean) => {
    setDropdownOpen(open);
    if (open) {
      setShouldFetchCategories(true);
    }
  };

  const renderCategoryOptions = () => {
    if (!categoriesData) {
      return (
        <div className="flex items-center justify-center p-4">
          <span>Loading categories...</span>
        </div>
      );
    }

    return Object?.entries(categoriesData)?.map(([category, items]) => {
      const isCategorySelectedFlag = isCategorySelected(category);

      return (
        <OptGroup
          key={category}
          label={
            <div
              className="flex items-center justify-between cursor-pointer hover:text-primary py-1"
              onClick={(e) => handleCategoryHeaderClick(category, e)}
            >
              <span className="font-semibold text-lg text-gray-900">
                {makeFirstLetterUpperCase(category.toLowerCase().replace('_', ' '))}
              </span>
              {isCategorySelectedFlag && <CheckOutlined className="text-primary mr-2" />}
            </div>
          }
        >
          {items.map((item: CategoryItem) => {
            const itemValue = `${category}_${item.entityField}`;
            const showTick = shouldShowTickForItem(category, item.entityField);

            return (
              <Option key={itemValue} value={itemValue}>
                <div className="flex items-center justify-between pr-2">
                  <span>{item.uiName}</span>
                  {showTick && <CheckOutlined className="text-primary" />}
                </div>
              </Option>
            );
          })}
        </OptGroup>
      );
    });
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleLogoutClick = () => {
    const isImpersonating = isImpersonationActive();
    if (isImpersonating) {
      showToast({
        message: 'To logout you need to exit the Impersonation mode',
        type: 'warning',
      });
      return;
    }

    navigate('/logout');
  };

  const handleChangePasswordClick = () => {
    navigate('/change-password');
  };

  const handleConnectCalendar = async () => {
    try {
      const result = await triggerGetNylasAuthUrl().unwrap();
      window.location.href = result;
    } catch {
      showToast({ message: 'Failed to connect calendar. Please try again.', type: 'error' });
    }
  };

  const handleSwitchCalendar = () => {
    setShowSwitchCalendarModal(true);
  };

  const confirmSwitchCalendar = async () => {
    setShowSwitchCalendarModal(false);
    try {
      await disconnectGrant().unwrap();
      const result = await triggerGetNylasAuthUrl().unwrap();
      window.location.href = result;
    } catch (err: unknown) {
      const msg =
        (err as { data?: { message?: string } })?.data?.message ??
        'Failed to switch calendar. Please try again.';
      showToast({ message: msg, type: 'error' });
    }
  };

  const handleDisconnectCalendar = () => {
    setShowDisconnectCalendarModal(true);
  };

  const confirmDisconnectCalendar = async () => {
    setShowDisconnectCalendarModal(false);
    try {
      await disconnectGrant().unwrap();
      showToast({ message: 'Calendar disconnected successfully.', type: 'success' });
    } catch (err: unknown) {
      const msg =
        (err as { data?: { message?: string } })?.data?.message ??
        'Failed to disconnect calendar. Please try again.';
      showToast({ message: msg, type: 'error' });
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    dispatch(setGlobalSearchQuery(value));

    if (!value.trim()) {
      setSelectedValue(null);
      dispatch(clearGlobalSearchCategorySelection());
    }

    const params: SearchParams = { query: value };

    if (selectedValue) {
      const resolvedSelection = resolveSearchSelection(selectedValue, categoriesData);
      if (resolvedSelection.category) {
        params.category = resolvedSelection.category;
      }
      if (resolvedSelection.field) {
        params.field = resolvedSelection.field;
      }
    }

    setSearchParams(params);
  };

  const calendarMenuItems = (() => {
    if (!isNylasFeatureEnabled) return [];
    if (!isCalendarUser) return [];
    if (isGrantStatusLoading) {
      return [{ key: 'calendar-loading', label: 'Loading calendar...', disabled: true }];
    }
    if (grantStatus?.connected) {
      return [
        {
          key: 'switch-calendar',
          label: isConnectingCalendar || isDisconnecting ? 'Redirecting...' : 'Switch Calendar',
          onClick: handleSwitchCalendar,
          disabled: isConnectingCalendar || isDisconnecting,
        },
        {
          key: 'disconnect-calendar',
          label: isDisconnecting ? 'Disconnecting...' : 'Disconnect Calendar',
          onClick: handleDisconnectCalendar,
          disabled: isDisconnecting,
        },
      ];
    }
    return [
      {
        key: 'connect-calendar',
        label: isConnectingCalendar ? 'Connecting...' : 'Connect Calendar',
        onClick: handleConnectCalendar,
        disabled: isConnectingCalendar,
      },
    ];
  })();

  const showGlobal = isSearchFocused && !dropdownOpen;
  const isOrgAdmin =
    role?.name?.trim().toLowerCase() === 'super admin' &&
    (role?.type?.toLowerCase() === 'owner' || role?.type?.toLowerCase() === 'organization');

  const normalizeRoleIdentifier = (value?: string): string => {
    return (value || '').replace(/[\s_-]+/g, '').toLowerCase();
  };

  const normalizedRoleName = normalizeRoleIdentifier(role?.name);
  const normalizedRoleType = normalizeRoleIdentifier(role?.type);
  const isOrganizationUser = normalizedRoleType === 'organization';
  const isCompanySuperAdmin = isOrganizationUser && normalizedRoleName === 'superadmin';
  const isCompanyAdmin = isOrganizationUser && normalizedRoleName === 'admin';
  const isHiringManager = normalizedRoleName === 'hiringmanager';
  const isRecruiter = normalizedRoleName === 'recruiter';
  const isInterviewer = normalizedRoleName === 'interviewer';

  // Platform callers (Super Admin, internal staff) have no tenant but still
  // get an in-app feed from notification-service (invite-accepted, MFA/
  // security alerts, etc. — see feed_router.py's module docstring). Gate on
  // isPlatformCaller directly rather than role name/type, since platform
  // sessions carry role.type === 'owner' and role.name === PLATFORM_CALLER_
  // ROLE_NAME, neither of which the tenant-role checks above match.
  const canShowNotificationBell =
    isPlatformCaller ||
    isCompanySuperAdmin ||
    isCompanyAdmin ||
    isHiringManager ||
    isRecruiter ||
    isInterviewer;

  const globalSearchNavigationConfig = {
    candidatesViewAllPath: '/candidates',
    jobsViewAllPath: '/jobs',
    usersViewAllPath: '/organisation-users',
    companiesViewAllPath: '/company',
    getCandidateDetailPath: (item: { extraJson?: { job_opening_id?: number; id?: number } }) =>
      `/jobs/view/${item?.extraJson?.job_opening_id}/candidates/${item?.extraJson?.id}/details`,
    getJobDetailPath: (item: { extraJson?: { id?: number } }) =>
      `/jobs/view/${item?.extraJson?.id}/candidates`,
    // CFP Users (the platform staff section on the Users page) has no
    // per-staff detail page (flat list + inline offboard action) — a
    // platform/staff search hit routes back to the Users page itself
    // rather than a dead /view-user link.
    getUserDetailPath: (item: { extraJson?: { id?: number } }) =>
      isOrgAdmin
        ? `/view-organisation-user?orgUserId=${item?.extraJson?.id}`
        : '/organisation-users',
    getCompanyDetailPath: (item: { extraJson?: { id?: number } }) =>
      `/view-company?companyId=${item?.extraJson?.id}`,
  };

  return (
    <>
      <header
        className="sticky top-0 z-30 bg-white px-7 py-3.5 flex justify-end items-center w-full border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-end gap-4">
          <Dropdown
            open={showGlobal}
            placement="bottomLeft"
            trigger={[]}
            dropdownRender={() => (
              <div
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(16, 26, 58, 0.12)',
                }}
              >
                <GlobalSearch
                  query={searchParams}
                  onQueryChange={(value) => {
                    setSearchQuery(value);
                    dispatch(setGlobalSearchQuery(value));
                  }}
                  onClose={(clearSearch = true) => {
                    if (clearSearch) {
                      setSearchQuery('');
                      setSelectedValue(null);
                      dispatch(clearGlobalSearch());
                      dispatch(
                        api.util.invalidateTags([
                          { type: 'SearchResults', id: 'Users' },
                          { type: 'SearchResults', id: 'OrgUsers' },
                          { type: 'SearchResults', id: 'Companies' },
                          { type: 'SearchResults', id: 'JobOpenings' },
                        ])
                      );
                    }
                    setIsSearchFocused(false);
                  }}
                  isInputFocused={isSearchFocused}
                  onSearchTrigger={handleSearchChange}
                  navigationConfig={globalSearchNavigationConfig}
                />
              </div>
            )}
          >
            <div className="w-[180px] sm:w-[250px] lg:w-[350px]">
              <Search
                appname="Search"
                placeholder="Search..."
                allowClear
                className="my-search"
                value={searchQuery}
                onChange={handleSearchChange}
                onSearch={handleSearchChange}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => {
                  setTimeout(() => setIsSearchFocused(false), 200);
                }}
              />
            </div>
          </Dropdown>

          <div
            className="border border-[var(--border)] p-1 rounded-lg w-40 sm:w-50 gap-1 flex items-center"
            style={{ backgroundColor: 'white' }}
          >
            <Select
              placeholder="Categories"
              prefix={<MdOutlineFilterAlt className="ml-2 text-lg text-primary self-center" />}
              allowClear
              className="w-full custom-select my-select-with-divider"
              popupClassName="rounded-xl"
              value={getDisplayValue()}
              onChange={(value) => {
                if (!value) {
                  handleClear();
                } else {
                  handleSelect(value);
                }
              }}
              onClear={handleClear}
              suffixIcon={<DownOutlined />}
              open={dropdownOpen}
              onDropdownVisibleChange={handleDropdownVisibleChange}
              dropdownMatchSelectWidth={false}
              dropdownStyle={{ minWidth: '200px' }}
              loading={!categoriesData && shouldFetchCategories}
            >
              {renderCategoryOptions()}
            </Select>
          </div>

          <LocationSwitcher />

          <NotificationBell disabled={!canShowNotificationBell} />

          {userData && (
            <div className="flex items-center gap-2">
              <div onClick={handleProfileClick} className="cursor-pointer">
                {userData?.profilePicture ? (
                  <Avatar
                    size={40}
                    src={userData?.profilePicture}
                    alt={userData?.firstName}
                    onError={() => false}
                  >
                    <span>{userData?.firstName.charAt(0).toUpperCase()}</span>
                  </Avatar>
                ) : (
                  <Avatar size={40} style={{ backgroundColor: 'var(--primary)' }}>
                    {userData?.firstName.charAt(0).toUpperCase()}
                  </Avatar>
                )}
              </div>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'profile',
                      label: 'User Profile',
                      onClick: handleProfileClick,
                    },
                    {
                      key: 'change-password',
                      label: 'Change Password',
                      onClick: handleChangePasswordClick,
                    },
                    ...calendarMenuItems,
                    {
                      type: 'divider' as const,
                      className: 'custom-divider',
                    },
                    {
                      key: 'logout',
                      label: 'Logout',
                      onClick: handleLogoutClick,
                    },
                  ],
                }}
                // The menu items/onClick handlers above are untouched — this
                // only adds a richer header above them (user + company
                // branding) when the dropdown opens.
                dropdownRender={(menu) => (
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{
                      backgroundColor: '#fff',
                      boxShadow: '0 8px 24px rgba(16, 26, 58, 0.12)',
                    }}
                  >
                    <div className="flex items-center gap-3 p-4">
                      {userData?.profilePicture ? (
                        <Avatar size={48} src={userData.profilePicture} alt={userData.firstName}>
                          <span>{userData?.firstName.charAt(0).toUpperCase()}</span>
                        </Avatar>
                      ) : (
                        <Avatar size={48} style={{ backgroundColor: 'var(--primary)' }}>
                          {userData?.firstName?.charAt(0).toUpperCase()}
                        </Avatar>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-neutral-900 truncate">
                          {makeFirstLetterUpperCase(userData?.firstName)}
                          {userData?.lastName ? ` ${userData.lastName}` : ''}
                        </span>
                        {userData?.roleName && (
                          <span className="text-xs text-neutral-500 truncate">
                            {userData.roleName}
                          </span>
                        )}
                      </div>
                    </div>

                    {tenantId && tenantProfile && (
                      <>
                        <div className="border-t" style={{ borderColor: 'var(--border)' }} />
                        <div className="flex items-center gap-3 px-4 py-3">
                          <div className="relative w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                            {tenantProfile.logo_url ? (
                              <img
                                src={tenantProfile.logo_url}
                                alt={tenantProfile.company_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-semibold text-gray-500">
                                {tenantProfile.company_name?.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-neutral-700 truncate">
                            {tenantProfile.company_name}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="border-t" style={{ borderColor: 'var(--border)' }} />
                    {menu}
                  </div>
                )}
                trigger={['click']}
              >
                <div className="flex items-center gap-3 px-1 py-1 text-sm cursor-pointer">
                  <div className="flex flex-col">
                    <span className="text-xs text-neutral-500">Welcome</span>
                    <span className="font-semibold text-neutral-900">
                      {makeFirstLetterUpperCase(userData?.firstName)}{' '}
                      <DownOutlined className="text-xs text-neutral-500 cursor-pointer" />
                    </span>
                  </div>
                </div>
              </Dropdown>
            </div>
          )}
        </div>
      </header>

      <Modal
        open={showSwitchCalendarModal}
        onCancel={() => setShowSwitchCalendarModal(false)}
        onOk={confirmSwitchCalendar}
        okText="Yes, Switch"
        cancelText="Cancel"
        okButtonProps={{
          loading: isDisconnecting || isConnectingCalendar,
          danger: true,
        }}
        title="Switch Calendar"
        centered
        maskClosable={false}
      >
        <p className="text-gray-600 text-sm">
          Your current calendar connection will be <strong>disconnected</strong> before linking a
          new one. Any scheduled interviews tied to the existing calendar may be affected.
        </p>
        <p className="text-gray-500 text-sm mt-2">Are you sure you want to continue?</p>
      </Modal>

      <Modal
        open={showDisconnectCalendarModal}
        onCancel={() => setShowDisconnectCalendarModal(false)}
        onOk={confirmDisconnectCalendar}
        okText="Yes, Disconnect"
        cancelText="Cancel"
        okButtonProps={{
          loading: isDisconnecting,
          danger: true,
        }}
        title="Disconnect Calendar"
        centered
        maskClosable={false}
      >
        <p className="text-gray-600 text-sm">
          Your calendar will be <strong>disconnected</strong>. Any scheduled interviews tied to this
          calendar may be affected.
        </p>
        <p className="text-gray-500 text-sm mt-2">Are you sure you want to disconnect?</p>
      </Modal>
    </>
  );
};

export default Header;
