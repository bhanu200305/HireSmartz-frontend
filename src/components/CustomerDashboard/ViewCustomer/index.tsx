import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Dropdown, Tabs, Tooltip, Upload, type MenuProps } from 'antd';
import { BsArrowLeft } from 'react-icons/bs';
import {
  MdEmail,
  MdOutlineCalendarToday,
  MdOutlineAccessTime,
  MdOutlineCampaign,
  MdOutlineTune,
  MdLock,
  MdEdit,
  MdOutlineFileUpload,
  MdOutlineCropRotate,
  MdOutlineSupportAgent,
} from 'react-icons/md';
import MainLayout from '../../../layouts/MainLayout';
import { Button, Typography, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import ImageCropModal from '../../shared/ui/ImageCropModal';
import { Badge, BadgeStatus } from '../../shared/ui/badge';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import CorrectAdminEmailModal from '../CorrectAdminEmailModal';
import SupportAccessModal from './SupportAccessModal';
import {
  useGetPlatformTenantQuery,
  useGetPlatformTenantEntitlementsQuery,
  useUpdatePlatformTenantEntitlementsMutation,
} from '../../../api/organization-service/Platform/tenants';
import {
  useGetPlatformTenantProfileQuery,
  useUpdatePlatformTenantProfileMutation,
  useUploadPlatformTenantLogoMutation,
} from '../../../api/organization-service/Platform/tenantProfile';
import { useSuspendTenantMutation } from '../../../api/organization-service/Tenants/tenants';
import { useListMySupportAccessGrantsQuery } from '../../../api/organization-service/Platform/supportAccess';
import { useGetOwnPlatformProfileQuery } from '../../../api/organization-service/Platform/staff';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
import { isCfpSupportRole } from '../../../shared/utils/auth/permission.helpers';
import { useExpiryCountdown } from '../../../hooks/useExpiryCountdown';
import { RootState } from '../../../redux/provider/store';
import {
  ALLOWED_LOGO_TYPES,
  MAX_LOGO_FILE_SIZE_BYTES,
  LOGO_FILE_SIZE_ERROR_MESSAGE,
  LOGO_FILE_TYPE_ERROR_MESSAGE,
} from '../../../constants/file.constants';
import EntitlementsPanel from './EntitlementsPanel';
import MetricsPanel from './panels/MetricsPanel';
import CompanyProfilePanel from './panels/CompanyProfilePanel';
import LocationsPanel from './panels/LocationsPanel';
import DepartmentsPanel from './panels/DepartmentsPanel';
import UsersPanel from './panels/UsersPanel';
import DesignationsPanel from './panels/DesignationsPanel';
import AudioQuestionsPanel from './panels/AudioQuestionsPanel';
import ScoringCriteriaPanel from './panels/ScoringCriteriaPanel';
import QrCodePanel from './panels/QrCodePanel';
import EmailTemplatesPanel from './panels/EmailTemplatesPanel';
import NotificationCopyPanel from './panels/NotificationCopyPanel';
import TenantActivityFeedTab from '../../MyCompany/TenantActivityFeedTab';

const STATUS_BADGE: Record<string, BadgeStatus> = {
  draft: 'neutral',
  pre_approved: 'warning',
  active: 'success',
  suspended: 'danger',
};

/** One "icon + label + value" tile in the company summary strip below the
 * header — same shape for all four fields so the row stays visually even
 * regardless of which values are missing. */
const MetaTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <span className="shrink-0 w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
      {icon}
    </span>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p
        className="text-sm font-medium text-gray-800 truncate"
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </p>
    </div>
  </div>
);

/**
 * Super Admin's single-company view — now a full mirror of the Company
 * Admin's own "My Company" page (src/components/MyCompany/index.tsx),
 * scoped to an arbitrary tenant instead of the logged-in session's own.
 *
 * Every tab below reads/writes real, already-mounted
 * /v1/platform/tenants/{tenant_id}/... routes (organization-service) or
 * /v1/notification-platform/template-settings/tenants/{tenant_id}/... (notification-
 * service) — see the panels/ directory. Activity Feed, Interview Questions
 * and SMS Templates are deliberately left out of this pass: their
 * platform-route equivalents (if any) haven't been verified, and SMS has no
 * per-tenant override endpoint on either side of the fleet yet.
 *
 * Users (direct create, via users_platform_router.py's
 * POST /v1/platform/tenants/{tenant_id}/users) IS included — same shape as
 * Roles' platform surface: tenant_id from the path, require_platform_permission
 * instead of require_permission. Invite-based Team management (send-an-email,
 * they-set-their-own-password) is a SEPARATE backend surface
 * (tenants/api/platform_router.py's /invitations + bulk-import routes) not
 * wired up here yet.
 *
 * Layout mirrors CompanySettings/index.tsx (the platform master-data hub) —
 * same page shell (back link, white card, max-w-[1400px]) — so the two
 * platform screens read as one consistent system rather than two.
 */
const ViewCustomer = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tenantId = searchParams.get('companyId') || '';
  const currentTab = searchParams.get('tab') || '1';
  const [showSupportAccess, setShowSupportAccess] = useState(false);

  const callerKind = useSelector((state: RootState) => state.LoginSlice.callerKind);
  const { data: platformProfileData } = useGetOwnPlatformProfileQuery(undefined, {
    skip: callerKind !== 'platform',
  });
  // Real role (org-service's own /platform/staff/me), not the Redux
  // role.name every platform login hardcodes identically — see
  // isCfpSupportRole's own comment. Switches this whole page into a
  // read-only, grant-restricted mode below rather than the Super Admin's
  // normal full read/write view.
  const isSupportViewer = isCfpSupportRole(platformProfileData?.role);

  // Only fetched for a cfp_support viewer — this is how they reach this
  // page at all (My Support Access's own list), and re-fetched here too so
  // a direct/bookmarked `?companyId=` link still finds (or fails to find) a
  // live grant rather than trusting whatever the previous screen believed.
  const { data: myGrants, isFetching: isLoadingMyGrants } = useListMySupportAccessGrantsQuery(
    undefined,
    { skip: !isSupportViewer }
  );
  const myGrantForThisTenant = myGrants?.find((g) => g.tenant_id === tenantId);

  const exitSupportedTenant = (message: string) => {
    showToast({ message, type: 'error' });
    navigate('/my-support-access', { replace: true });
  };

  // Redirects out the moment this specific grant lapses — see
  // useExpiryCountdown's own comment on why the redirect is driven by a
  // setTimeout keyed on the deadline itself, not the display tick.
  const { label: supportTimeRemaining } = useExpiryCountdown(myGrantForThisTenant?.expires_at, () =>
    exitSupportedTenant('Your support access to this company has expired.')
  );

  useEffect(() => {
    if (!isSupportViewer || isLoadingMyGrants) return;
    if (!myGrantForThisTenant) {
      exitSupportedTenant('You do not have support access to this company.');
    }
    // Only re-run when the grant itself (or the tenant being viewed)
    // changes — re-running on every render would fire the redirect twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupportViewer, isLoadingMyGrants, myGrantForThisTenant, tenantId]);

  const { data: tenant, isLoading } = useGetPlatformTenantQuery(tenantId, { skip: !tenantId });
  const { data: entitlements, isLoading: isEntitlementsLoading } =
    useGetPlatformTenantEntitlementsQuery(tenantId, { skip: !tenantId });
  const [updateEntitlements, { isLoading: isSavingEntitlements }] =
    useUpdatePlatformTenantEntitlementsMutation();
  const [suspendTenant, { isLoading: isSuspending }] = useSuspendTenantMutation();
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [showCorrectEmail, setShowCorrectEmail] = useState(false);

  // Same profile query CompanyProfilePanel uses (shared cache — a logo
  // upload from either place invalidates the other's tag too), fetched here
  // as well purely for `logo_url`: `tenant` above is PlatformTenantSummary,
  // deliberately narrower than the profile view and has no logo field.
  const { data: profile } = useGetPlatformTenantProfileQuery(tenantId, { skip: !tenantId });
  const [updateProfile] = useUpdatePlatformTenantProfileMutation();
  const [uploadLogo] = useUploadPlatformTenantLogoMutation();
  const [logoPreview, setLogoPreview] = useState('');
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  // Controlled explicitly — see CompanyProfileTab.tsx's identical comment on
  // why tying the Dropdown's mount to hover state made the open menu
  // "vanish" the instant the mouse left the avatar circle on its way to a
  // menu item (the menu itself renders in a portal outside this div).
  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoUploadRef = useRef<HTMLButtonElement>(null);
  // The crop step sits between "file picked" and "uploaded" — same
  // ImageCropModal UserProfile's avatar upload and CompanyProfileTab's own
  // logo upload use, so this header's logo control isn't a third,
  // uncroppable copy of the same feature.
  const [isLogoCropModalOpen, setIsLogoCropModalOpen] = useState(false);
  const [logoCropImageSrc, setLogoCropImageSrc] = useState('');
  const [pendingCropFileName, setPendingCropFileName] = useState('company-logo.jpg');
  // Only set when THIS crop session created a fresh blob: URL for a
  // freshly-picked disk file — that's the only source that needs revoking
  // on cancel/confirm. Re-adjusting the already-displayed logoPreview (see
  // handleAdjustCurrentLogo) reuses that string as-is instead, since it's
  // still needed for the avatar afterward whether or not the crop is
  // applied.
  const [logoCropObjectUrl, setLogoCropObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    setLogoPreview(profile?.logo_url || '');
  }, [profile?.logo_url]);

  const handleLogoFileSelected = (file: File) => {
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      showToast({ message: LOGO_FILE_TYPE_ERROR_MESSAGE, type: 'error' });
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
      showToast({ message: LOGO_FILE_SIZE_ERROR_MESSAGE, type: 'error' });
      return Upload.LIST_IGNORE;
    }

    const objectUrl = URL.createObjectURL(file);
    setLogoCropImageSrc(objectUrl);
    setLogoCropObjectUrl(objectUrl);
    setPendingCropFileName(file.name);
    setIsLogoCropModalOpen(true);
    return Upload.LIST_IGNORE;
  };

  // Re-opens the crop step on the logo ALREADY showing instead of requiring
  // a brand new file first — the "adjust" half of the logo's click menu
  // below ("Select new image" is the other).
  const handleAdjustCurrentLogo = () => {
    if (!logoPreview) return;
    setLogoCropImageSrc(logoPreview);
    setLogoCropObjectUrl(null);
    setPendingCropFileName(pendingCropFileName || 'company-logo.jpg');
    setIsLogoCropModalOpen(true);
  };

  const logoMenuItems: MenuProps['items'] = [
    { key: 'select', label: 'Select new image', icon: <MdOutlineFileUpload /> },
    { key: 'adjust', label: 'Adjust current logo', icon: <MdOutlineCropRotate /> },
  ];
  const handleLogoMenuClick: NonNullable<MenuProps['onClick']> = ({ key }) => {
    if (key === 'select') logoUploadRef.current?.click();
    if (key === 'adjust') handleAdjustCurrentLogo();
  };

  const handleLogoCropCancel = () => {
    if (logoCropObjectUrl) URL.revokeObjectURL(logoCropObjectUrl);
    setLogoCropImageSrc('');
    setLogoCropObjectUrl(null);
    setIsLogoCropModalOpen(false);
  };

  const handleLogoCropConfirm = async (croppedBlob: Blob) => {
    if (logoCropObjectUrl) URL.revokeObjectURL(logoCropObjectUrl);
    setLogoCropImageSrc('');
    setLogoCropObjectUrl(null);
    setIsLogoCropModalOpen(false);

    const croppedFile = new File([croppedBlob], pendingCropFileName || 'company-logo.jpg', {
      type: croppedBlob.type,
    });
    const previewUrl = URL.createObjectURL(croppedFile);
    setLogoPreview(previewUrl);
    setIsUploadingLogo(true);
    try {
      const { storage_key } = await uploadLogo({ tenantId, file: croppedFile }).unwrap();
      await updateProfile({ tenantId, logo: storage_key }).unwrap();
      showToast({ message: 'Company logo updated.', type: 'success' });
    } catch (err) {
      setLogoPreview(profile?.logo_url || '');
      showToast({ message: getOrgErrorMessage(err, 'Failed to upload logo.'), type: 'error' });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  useEffect(() => {
    if (!tenantId) {
      showToast({ message: 'No company selected.', type: 'error' });
      navigate('/company');
    }
  }, [tenantId, navigate]);

  const handleSuspend = async () => {
    try {
      await suspendTenant({ tenantId }).unwrap();
      showToast({ message: 'Company suspended.', type: 'success' });
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to suspend company.'), type: 'error' });
    } finally {
      setShowSuspendConfirm(false);
    }
  };

  // `?tab=` doesn't change the route pathname, so App.tsx's route-level
  // scroll reset never fires for it.
  const handleTabChange = (key: string) => {
    setSearchParams({ companyId: tenantId, tab: key });
    window.scrollTo(0, 0);
  };

  if (isLoading) return <Loader />;
  if (!tenant) return <div className="p-8 text-gray-500">Company not found.</div>;

  // A cfp_support grant only authorizes org-service's platform-mirror
  // profile/departments/offices/designations/users/dashboard/activity/
  // audio-questions/qr-code routes — Feature Settings/Scoring Criteria/
  // Email Templates/Notification copy (keys '4'/'5'/'7'/'10') have no
  // matching grant at all, so they're filtered out of `items` entirely
  // below for a support viewer rather than merely disabled.
  const SUPPORT_ALLOWED_TAB_KEYS = new Set([
    '0', // Metrics -> dashboard
    '1', // Company Details -> profile
    '2', // Locations -> offices
    '3', // Departments -> departments
    '8', // Users -> users
    '9', // Activity -> activity
    '6', // QR Management -> qr-code
    '11', // Designations -> designations
    '12', // Audio Questions -> audio-questions
  ]);

  const items = [
    { key: '0', label: 'Metrics', children: <MetricsPanel tenantId={tenantId} /> },
    {
      key: '1',
      label: 'General',
      children: <CompanyProfilePanel tenantId={tenantId} readOnly={isSupportViewer} />,
    },
    {
      key: '2',
      label: 'Locations',
      children: <LocationsPanel tenantId={tenantId} readOnly={isSupportViewer} />,
    },
    {
      key: '3',
      label: 'Departments',
      children: <DepartmentsPanel tenantId={tenantId} readOnly={isSupportViewer} />,
    },
    {
      key: '8',
      label: 'Users',
      children: <UsersPanel tenantId={tenantId} readOnly={isSupportViewer} />,
    },
    {
      key: '4',
      label: 'Feature Settings',
      children: (
        <div className="p-4">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-primary-600 to-accent-500 text-white flex items-center justify-center shadow-sm">
              <MdOutlineTune size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <Typography variant="h5">Feature settings</Typography>
                <Tooltip title="Locking a flag here stops the company from changing it themselves.">
                  <MdLock className="text-gray-400" size={14} />
                </Tooltip>
              </div>
              <Typography variant="body2" className="text-gray-400 mt-0.5">
                Control which product features this company can access.
              </Typography>
            </div>
          </div>
          {isEntitlementsLoading ? (
            <Loader />
          ) : entitlements ? (
            <EntitlementsPanel
              tenantId={tenantId}
              entitlements={entitlements}
              isSaving={isSavingEntitlements}
              onSave={(body) => updateEntitlements({ tenantId, ...body }).unwrap()}
            />
          ) : (
            <div className="p-6 text-gray-500 border border-dashed rounded-xl">
              Feature toggles aren&apos;t available.
            </div>
          )}
        </div>
      ),
    },
    { key: '5', label: 'Scoring Criteria', children: <ScoringCriteriaPanel tenantId={tenantId} /> },
    { key: '6', label: 'QR Code', children: <QrCodePanel tenantId={tenantId} /> },
    { key: '7', label: 'Email Templates', children: <EmailTemplatesPanel tenantId={tenantId} /> },
    {
      key: '10',
      label: 'Notification Copy',
      children: <NotificationCopyPanel tenantId={tenantId} />,
    },
    {
      key: '9',
      label: 'Activity Feed',
      children: <TenantActivityFeedTab tenantId={tenantId} isMaster />,
    },
    {
      key: '11',
      label: 'Designations',
      children: <DesignationsPanel tenantId={tenantId} />,
    },
    {
      key: '12',
      label: 'Intake Questions',
      children: <AudioQuestionsPanel tenantId={tenantId} />,
    },
  ].filter((item) => !isSupportViewer || SUPPORT_ALLOWED_TAB_KEYS.has(item.key));

  // Same two-level layout as the Company Admin's own My Company page
  // (MyCompany/index.tsx): topic groups on top, that group's leaf tabs
  // below. Purely a navigation regrouping — leaf keys are unchanged, so
  // every existing `?tab=<key>` link still opens the same panel, and the
  // group is derived from the leaf rather than kept as its own URL param.
  // "Overview" is Super-Admin-only (the company has no Metrics tab of its
  // own); the other four mirror the Company Admin's group names.
  const GROUP_LAYOUT: { key: string; label: string; tabKeys: string[] }[] = [
    { key: 'overview', label: 'Overview', tabKeys: ['0'] },
    { key: 'profile', label: 'Company Profile', tabKeys: ['1', '2', '3', '11'] },
    { key: 'team', label: 'Team & Access', tabKeys: ['8', '9'] },
    { key: 'hiring', label: 'Hiring Configuration', tabKeys: ['12', '5'] },
    { key: 'tools', label: 'Tools & Settings', tabKeys: ['6', '4', '7', '10'] },
  ];
  const groups = GROUP_LAYOUT.map((group) => ({
    ...group,
    tabs: group.tabKeys
      .map((key) => items.find((item) => item.key === key))
      .filter((item): item is (typeof items)[number] => Boolean(item)),
  })).filter((group) => group.tabs.length > 0);

  // Default (no `?tab=`) stays '1' (General), same as before; anything not
  // in the (possibly support-filtered) list falls back to the first group's
  // first tab rather than leaving a blank tab strip.
  const activeGroup =
    groups.find((group) => group.tabs.some((tab) => tab.key === currentTab)) ?? groups[0];
  const effectiveCurrentTab = activeGroup?.tabs.some((tab) => tab.key === currentTab)
    ? currentTab
    : String(activeGroup?.tabs[0]?.key ?? currentTab);

  const handleGroupChange = (groupKey: string) => {
    const firstLeafTab = groups.find((group) => group.key === groupKey)?.tabs[0];
    if (firstLeafTab) handleTabChange(String(firstLeafTab.key));
  };

  return (
    <MainLayout>
      <div className="w-full px-6 py-5 max-w-[1400px] mx-auto">
        <div
          className="flex items-center gap-2 text-sm text-gray-500 mb-3 cursor-pointer hover:text-primary-600 transition-colors w-fit"
          onClick={() => navigate('/company')}
        >
          <BsArrowLeft />
          <span>Back</span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl shadow-xs">
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
              <div className="flex items-center gap-4">
                <div
                  className="relative shrink-0 w-14 h-14 rounded-full overflow-hidden group bg-gray-100"
                  onMouseEnter={() => setIsLogoHovered(true)}
                  onMouseLeave={() => setIsLogoHovered(false)}
                >
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt={`${tenant.company_name} logo`}
                      // object-contain, not object-cover — see
                      // CompanyProfileTab.tsx's identical fix for why cover
                      // was cropping most of a non-square scraped logo away.
                      className="w-full h-full object-contain p-1.5"
                      onError={() => setLogoPreview('')}
                    />
                  ) : (
                    <span className="w-full h-full bg-gradient-to-br from-primary-600 to-accent-500 text-white flex items-center justify-center shadow-sm text-xl font-bold">
                      {tenant.company_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  )}
                  <Upload
                    beforeUpload={handleLogoFileSelected}
                    showUploadList={false}
                    className="hidden"
                    accept="image/png, image/jpeg"
                  >
                    <button ref={logoUploadRef} className="hidden cursor-pointer"></button>
                  </Upload>
                  {!isUploadingLogo && !isSupportViewer && (
                    <Dropdown
                      menu={{ items: logoMenuItems, onClick: handleLogoMenuClick }}
                      trigger={['click']}
                      open={isLogoMenuOpen}
                      onOpenChange={setIsLogoMenuOpen}
                    >
                      <div
                        className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 cursor-pointer transition-opacity ${
                          isLogoHovered || isLogoMenuOpen ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        <MdEdit className="text-white text-lg" />
                      </div>
                    </Dropdown>
                  )}
                  {isUploadingLogo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
                      <span className="text-white text-xs">Uploading…</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="font-display text-2xl font-bold text-gray-900">
                      {tenant.company_name}
                    </h1>
                    <Badge status={STATUS_BADGE[tenant.status] || 'neutral'}>{tenant.status}</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Company overview and management</p>
                </div>
              </div>
              {isSupportViewer ? (
                <div className="shrink-0 flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                  <MdOutlineAccessTime size={16} />
                  <span>
                    Support access — <span className="font-mono">{supportTimeRemaining}</span>{' '}
                    remaining
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    className="rounded-full border border-gray-300 text-gray-700 px-5 py-2 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                    onClick={() => setShowSupportAccess(true)}
                  >
                    <MdOutlineSupportAgent size={16} />
                    Support access
                  </Button>
                  {(tenant.status === 'draft' || tenant.status === 'pre_approved') && (
                    <Button
                      className="rounded-full border border-primary-300 text-primary-600 px-5 py-2 hover:bg-primary-50 transition-colors"
                      onClick={() => setShowCorrectEmail(true)}
                    >
                      Correct admin email
                    </Button>
                  )}
                  {tenant.status === 'active' && (
                    <Button
                      className="rounded-full border border-red-300 text-red-600 px-5 py-2 hover:bg-red-50 transition-colors"
                      onClick={() => setShowSuspendConfirm(true)}
                    >
                      Suspend company
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 pb-6 border-b border-gray-100">
              <MetaTile
                icon={<MdEmail size={18} />}
                label="Admin email"
                value={tenant.admin_email}
              />
              <MetaTile
                icon={<MdOutlineCampaign size={18} />}
                label="Signup source"
                value={<span className="capitalize">{tenant.signup_source}</span>}
              />
              <MetaTile
                icon={<MdOutlineCalendarToday size={18} />}
                label="Joined"
                value={tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : '-'}
              />
              <MetaTile
                icon={<MdOutlineAccessTime size={18} />}
                label="Last active"
                value={
                  tenant.last_active_at
                    ? new Date(tenant.last_active_at).toLocaleDateString()
                    : 'Not available'
                }
              />
            </div>

            <Tabs
              activeKey={activeGroup?.key}
              onChange={handleGroupChange}
              items={groups.map((group) => ({
                key: group.key,
                label: group.label,
                children: null,
              }))}
              className="my-company-group-tabs many-tabs"
            />
            <Tabs
              activeKey={effectiveCurrentTab}
              onChange={handleTabChange}
              items={activeGroup?.tabs ?? []}
              className="my-company-tabs many-tabs mt-1"
            />
          </div>
        </div>
      </div>

      {showSuspendConfirm && (
        <ConfirmationModal
          title={`Suspend "${tenant.company_name}"? Every user in this company will immediately stop being able to work.`}
          confirmText="SUSPEND"
          isLoading={isSuspending}
          onConfirm={handleSuspend}
          onClose={() => setShowSuspendConfirm(false)}
        />
      )}

      {showCorrectEmail && (
        <CorrectAdminEmailModal
          tenantId={tenantId}
          companyName={tenant.company_name}
          currentEmail={tenant.admin_email}
          onClose={() => setShowCorrectEmail(false)}
        />
      )}

      {showSupportAccess && (
        <SupportAccessModal
          tenantId={tenantId}
          companyName={tenant.company_name}
          onClose={() => setShowSupportAccess(false)}
        />
      )}

      <ImageCropModal
        open={isLogoCropModalOpen}
        imageSrc={logoCropImageSrc}
        onCancel={handleLogoCropCancel}
        onConfirm={handleLogoCropConfirm}
        isSaving={isUploadingLogo}
        title="Adjust your logo"
        subtitle="Drag to reposition, then zoom or rotate to fit the frame"
      />
    </MainLayout>
  );
};

export default ViewCustomer;
