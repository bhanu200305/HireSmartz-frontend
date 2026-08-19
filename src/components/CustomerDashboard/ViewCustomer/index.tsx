import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, Tooltip } from 'antd';
import { MdOutlineArrowBack, MdLock } from 'react-icons/md';
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
import ScoringCriteriaPanel from './panels/ScoringCriteriaPanel';
import QrCodePanel from './panels/QrCodePanel';
import EmailTemplatesPanel from './panels/EmailTemplatesPanel';

const STATUS_BADGE: Record<string, BadgeStatus> = {
  draft: 'neutral',
  pre_approved: 'warning',
  active: 'success',
  suspended: 'danger',
};

/**
 * Super Admin's single-company view — now a full mirror of the Company
 * Admin's own "My Company" page (src/components/MyCompany/index.tsx),
 * scoped to an arbitrary tenant instead of the logged-in session's own.
 *
 * Every tab below reads/writes real, already-mounted
 * /v1/platform/tenants/{tenant_id}/... routes (organization-service) or
 * /v1/platform/template-settings/tenants/{tenant_id}/... (notification-
 * service) — see the panels/ directory. Team, Activity Feed, Interview
 * Questions and SMS Templates are deliberately left out of this pass: their
 * platform-route equivalents (if any) haven't been verified, and SMS has no
 * per-tenant override endpoint on either side of the fleet yet.
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
    {
      key: '4',
      label: 'Feature Settings',
      children: (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Typography variant="subtitle1">Feature toggles</Typography>
            <Tooltip title="Locking a flag here stops the company from changing it themselves.">
              <MdLock className="text-gray-400" size={14} />
            </Tooltip>
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
      <div className="w-full max-w-5xl mx-auto p-8 pt-16">
        <button
          onClick={() => navigate('/company')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4 cursor-pointer"
        >
          <MdOutlineArrowBack className="mr-2" /> Back
        </button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Typography variant="h4">{tenant.company_name}</Typography>
            <Badge status={STATUS_BADGE[tenant.status] || 'neutral'}>{tenant.status}</Badge>
          </div>
          {tenant.status === 'active' && (
            <Button
              className="rounded-full border border-red-300 text-red-600 px-5 py-2"
              onClick={() => setShowSuspendConfirm(true)}
            >
              Suspend company
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div>
            <Typography variant="subtitle2">Admin email</Typography>
            <Typography variant="body1">{tenant.admin_email}</Typography>
          </div>
          <div>
            <Typography variant="subtitle2">Signup source</Typography>
            <Typography variant="body1" className="capitalize">
              {tenant.signup_source}
            </Typography>
          </div>
          <div>
            <Typography variant="subtitle2">Joined</Typography>
            <Typography variant="body1">
              {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : '-'}
            </Typography>
          </div>
          <div>
            <Typography variant="subtitle2">Last active</Typography>
            <Typography variant="body1">
              {tenant.last_active_at
                ? new Date(tenant.last_active_at).toLocaleDateString()
                : 'Not available'}
            </Typography>
          </div>
        </div>

        <Tabs
          activeKey={currentTab}
          onChange={handleTabChange}
          items={items}
          className="view-customer-tabs"
        />
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
