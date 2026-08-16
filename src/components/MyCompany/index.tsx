import React, { useCallback, useState } from 'react';
import { Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { MdOutlineArrowBack, MdEmail, MdPhone } from 'react-icons/md';
import { useSelector } from 'react-redux';
import MainLayout from '../../layouts/MainLayout';
import { RootState } from '../../redux/provider/store';
import { Loader } from '../shared/ui/loader';
import { ComingSoonTab } from '../shared';
import CompanyProfileTab from './CompanyProfileTab';
import CompanyLocationsTab from './CompanyLocationsTab';
import DepartmentsTab from './DepartmentsTab';
import EntitlementsTab from './EntitlementsTab';
import InterviewQuestionsTab from './InterviewQuestionsTab';
import ScoringCriteriaOwnerTab from './ScoringCriteriaOwnerTab';
import QrManagementTab from './QrManagementTab';
import TeamTab from './Team';
import TenantActivityFeedTab from './TenantActivityFeedTab';
import EmailTemplatesTab from './EmailTemplatesTab';
import OnboardingChecklist from './OnboardingChecklist';
import { useGetTenantProfileQuery } from '../../api/organization-service/Tenants/profile';
import { useListTenantOfficesQuery } from '../../api/organization-service/Tenants/offices';
import { useListTenantDepartmentsQuery } from '../../api/organization-service/Tenants/departments';

/**
 * Company Admin's own company management — every tab reads/writes
 * organization-service's `/v1/tenants/{tenant_id}/...` directly, scoped by
 * `tenantId` from the signed-in session (populated at login — see
 * Login/index.tsx's completeRealLogin). A caller with no tenant (a platform
 * user) has nothing to view here; that's the Super Admin's Companies screen
 * instead (CustomerDashboard).
 */
const MyCompany: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);
  const currentTab = searchParams.get('tab') || '1';

  const { data: profile, isLoading: isProfileLoading } = useGetTenantProfileQuery(tenantId ?? '', {
    skip: !tenantId,
  });
  const { data: offices } = useListTenantOfficesQuery(tenantId ?? '', { skip: !tenantId });
  const { data: departments } = useListTenantDepartmentsQuery(tenantId ?? '', { skip: !tenantId });

  const [hasInvitedTeam, setHasInvitedTeam] = useState<boolean>(
    () => Boolean(tenantId) && localStorage.getItem(`cfp_team_invited_${tenantId}`) === 'true'
  );
  const handleTeamInviteRecorded = useCallback(() => {
    if (tenantId) localStorage.setItem(`cfp_team_invited_${tenantId}`, 'true');
    setHasInvitedTeam(true);
  }, [tenantId]);

  const handleTabChange = (key: string) => {
    setSearchParams({ tab: key });
  };

  if (!tenantId) {
    // A platform caller (Super Admin / internal staff) has no tenant of
    // their own — this screen has nothing to show them.
    return <Navigate to="/" replace />;
  }

  const items: TabsProps['items'] = [
    { key: '1', label: 'Company Details', children: <CompanyProfileTab tenantId={tenantId} /> },
    { key: '2', label: 'Locations', children: <CompanyLocationsTab tenantId={tenantId} /> },
    { key: '3', label: 'Departments', children: <DepartmentsTab tenantId={tenantId} /> },
    { key: '4', label: 'Feature Settings', children: <EntitlementsTab tenantId={tenantId} /> },
    {
      key: '5',
      label: 'Interview Questions',
      children: <InterviewQuestionsTab tenantId={tenantId} />,
    },
    {
      key: '6',
      label: 'Scoring Criteria',
      children: <ScoringCriteriaOwnerTab tenantId={tenantId} />,
    },
    { key: '7', label: 'QR Management', children: <QrManagementTab tenantId={tenantId} /> },
    {
      key: '8',
      label: 'Team',
      children: <TeamTab tenantId={tenantId} onTeamInviteRecorded={handleTeamInviteRecorded} />,
    },
    { key: '9', label: 'Activity', children: <TenantActivityFeedTab tenantId={tenantId} /> },
    // Template CRUD lives in notification-service (`/v1/template-settings/...`)
    // — organization-service's copy of these tables was removed
    // (docs/API_CONTRACT.md's footer note). Email is wired for real below.
    { key: '10', label: 'Email Templates', children: <EmailTemplatesTab /> },
    // SMS has no per-tenant override endpoint on notification-service — only
    // a platform-wide default (see PlatformTemplateSettings, Super Admin
    // only). Left as an honest placeholder rather than a fake control; not a
    // gap in this integration, a real limit of the current backend contract.
    {
      key: '11',
      label: 'SMS Templates',
      children: (
        <ComingSoonTab label="SMS templates aren't customisable per organisation yet — CareerForce Pro's default wording is used for every tenant" />
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="flex flex-col items-center bg-white px-4 mt-4 relative pt-16">
        <div className="mb-4 self-start px-4 absolute">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4 cursor-pointer"
          >
            <MdOutlineArrowBack className="mr-2" />
            <span>Back</span>
          </button>
        </div>
        <div className="bg-[#FAFAFA] p-6 md:p-6 rounded-2xl shadow-lg w-full max-w-6xl flex flex-col">
          {isProfileLoading && <Loader />}

          <div className="flex gap-4 bg-white rounded-3xl p-4 mb-6 border border-gray-100">
            <div className="relative w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
              {profile?.logo_url ? (
                <img
                  src={profile.logo_url}
                  alt={profile.company_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-semibold text-white">
                  {profile?.company_name?.toUpperCase()?.[0] || ''}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{profile?.company_name}</h2>
              <div className="flex items-center text-sm gap-2">
                <MdEmail size={16} />
                <span>{profile?.admin_contact || '-'}</span>
              </div>
              <div className="flex items-center text-sm gap-2">
                <MdPhone size={16} />
                <span>{profile?.website_url || '-'}</span>
              </div>
            </div>
          </div>

          <OnboardingChecklist
            companyId={tenantId}
            status={{
              profileReviewed: Boolean(profile?.logo_url || profile?.culture_intro),
              hasOffice: (offices?.length ?? 0) > 0,
              hasDepartment: (departments?.length ?? 0) > 0,
              hasInvitedTeam,
            }}
            onNavigateToTab={handleTabChange}
          />

          <Tabs
            activeKey={currentTab}
            onChange={handleTabChange}
            items={items}
            className="my-company-tabs px-2 sm:px-6 py-2 sm:py-4"
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default MyCompany;
