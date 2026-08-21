import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, Tooltip } from 'antd';
import { BsArrowLeft } from 'react-icons/bs';
import {
  MdEmail,
  MdOutlineCalendarToday,
  MdOutlineAccessTime,
  MdOutlineCampaign,
  MdOutlineTune,
  MdLock,
} from 'react-icons/md';
import MainLayout from '../../../layouts/MainLayout';
import { Button, Typography, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import { Badge, BadgeStatus } from '../../shared/ui/badge';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import {
  useGetPlatformTenantQuery,
  useGetPlatformTenantEntitlementsQuery,
  useUpdatePlatformTenantEntitlementsMutation,
} from '../../../api/organization-service/Platform/tenants';
import { useSuspendTenantMutation } from '../../../api/organization-service/Tenants/tenants';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
import EntitlementsPanel from './EntitlementsPanel';
import CompanyProfilePanel from './panels/CompanyProfilePanel';
import LocationsPanel from './panels/LocationsPanel';
import DepartmentsPanel from './panels/DepartmentsPanel';
import UsersPanel from './panels/UsersPanel';
import ScoringCriteriaPanel from './panels/ScoringCriteriaPanel';
import QrCodePanel from './panels/QrCodePanel';
import EmailTemplatesPanel from './panels/EmailTemplatesPanel';

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
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
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
 * /v1/platform/template-settings/tenants/{tenant_id}/... (notification-
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

  const { data: tenant, isLoading } = useGetPlatformTenantQuery(tenantId, { skip: !tenantId });
  const { data: entitlements, isLoading: isEntitlementsLoading } =
    useGetPlatformTenantEntitlementsQuery(tenantId, { skip: !tenantId });
  const [updateEntitlements, { isLoading: isSavingEntitlements }] =
    useUpdatePlatformTenantEntitlementsMutation();
  const [suspendTenant, { isLoading: isSuspending }] = useSuspendTenantMutation();
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);

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

  const handleTabChange = (key: string) => setSearchParams({ companyId: tenantId, tab: key });

  if (isLoading) return <Loader />;
  if (!tenant) return <div className="p-8 text-gray-500">Company not found.</div>;

  const items = [
    { key: '1', label: 'Company Details', children: <CompanyProfilePanel tenantId={tenantId} /> },
    { key: '2', label: 'Locations', children: <LocationsPanel tenantId={tenantId} /> },
    { key: '3', label: 'Departments', children: <DepartmentsPanel tenantId={tenantId} /> },
    { key: '8', label: 'Users', children: <UsersPanel tenantId={tenantId} /> },
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
    { key: '6', label: 'QR Management', children: <QrCodePanel tenantId={tenantId} /> },
    { key: '7', label: 'Email Templates', children: <EmailTemplatesPanel tenantId={tenantId} /> },
  ];

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
                <span className="shrink-0 w-14 h-14 bg-gradient-to-br from-primary-600 to-accent-500 text-white rounded-full flex items-center justify-center shadow-sm text-xl font-bold">
                  {tenant.company_name?.[0]?.toUpperCase() || '?'}
                </span>
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
              {tenant.status === 'active' && (
                <Button
                  className="rounded-full border border-red-300 text-red-600 px-5 py-2 hover:bg-red-50 transition-colors shrink-0"
                  onClick={() => setShowSuspendConfirm(true)}
                >
                  Suspend company
                </Button>
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
              activeKey={currentTab}
              onChange={handleTabChange}
              items={items}
              className="view-customer-tabs"
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
    </MainLayout>
  );
};

export default ViewCustomer;
