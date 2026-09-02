import React from 'react';
import { Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { MdOutlineArrowBack, MdEmail, MdPhone } from 'react-icons/md';
import { useSelector } from 'react-redux';
import MainLayout from '../../layouts/MainLayout';
import { RootState } from '../../redux/provider/store';
import { Loader } from '../shared/ui/loader';
import CompanyProfileTab from './CompanyProfileTab';
import CompanyLocationsTab from './CompanyLocationsTab';
import DepartmentsTab from './DepartmentsTab';
import EntitlementsTab from './EntitlementsTab';
import TeamTab from './Team';
import TenantActivityFeedTab from './TenantActivityFeedTab';
import InterviewQuestionsTab from './InterviewQuestionsTab';
import ScoringCriteriaOwnerTab from './ScoringCriteriaOwnerTab';
import QrManagementTab from './QrManagementTab';
import NotificationSettingsTab from './NotificationSettingsTab';
import JobSettingsTab from './JobSettingsTab';
import OnboardingChecklist from './OnboardingChecklist';
import { useGetTenantProfileQuery } from '../../api/organization-service/Tenants/profile';
import { useListTenantOfficesQuery } from '../../api/organization-service/Tenants/offices';
import { useListTenantDepartmentsQuery } from '../../api/organization-service/Tenants/departments';
import { useListTenantInvitationsQuery } from '../../api/organization-service/Tenants/teamInvitations';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';

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
  const { data: offices } = useListTenantOfficesQuery(
    { tenantId: tenantId ?? '' },
    { skip: !tenantId }
  );
  const { data: departments } = useListTenantDepartmentsQuery(tenantId ?? '', { skip: !tenantId });
  // Real signal for the "invite your team" checklist step — whether this
  // tenant has ever sent an invite (pending or since-accepted), not a
  // per-browser localStorage flag that forgot the moment you cleared storage
  // or invited from a different device. `limit: 1` since only `total` is
  // read; both the single-invite and bulk-import mutations invalidate the
  // 'TenantInvitations' tag, so this refetches the instant either succeeds.
  const { data: invitations } = useListTenantInvitationsQuery(
    { tenantId: tenantId ?? '', limit: 1 },
    { skip: !tenantId }
  );

  // Location-resolved (useEffectivePermissions already varies by
  // useActiveLocation) — a tab a user can't view at their active location
  // is filtered out of `items` below entirely, not just its buttons.
  const canViewCompanyDetails = useHasAccess(Authorities.COMPANY_SETTINGS_VIEW);
  const canViewLocations = useHasAccess(Authorities.LOCATION_VIEW);
  const canViewDepartments = useHasAccess(Authorities.DEPARTMENT_VIEW);
  const canViewFeatureSettings = useHasAccess(Authorities.COMPANY_SETTINGS_VIEW);
  const canViewTeam = useHasAccess(Authorities.INVITATION_VIEW);
  const canViewActivity = useHasAccess(Authorities.COMPANY_SETTINGS_VIEW);
  const canViewInterviewQuestions = useHasAccess(Authorities.INTERVIEW_QUESTIONS_VIEW);
  const canViewEmailTemplates = useHasAccess(Authorities.EMAIL_TEMPLATE_VIEW);
  // QR Management has no dedicated catalog permission — job-workflow-adjacent,
  // so it shares JOB_OPENING_VIEW. Job Settings (job types/shifts/education
  // preferences feeding the Job Details form) is the same kind of
  // job-workflow-adjacent catalogue.
  const canViewQrManagement = useHasAccess(Authorities.JOB_OPENING_VIEW);
  const canViewJobSettings = useHasAccess(Authorities.JOB_OPENING_VIEW);

  const handleTabChange = (key: string) => {
    setSearchParams({ tab: key });
    // `?tab=` doesn't change the route pathname, so App.tsx's route-level
    // scroll reset never fires for it — without this, switching tabs while
    // scrolled down leaves you scrolled down on the new tab's content too.
    window.scrollTo(0, 0);
  };

  if (!tenantId) {
    // A platform caller (Super Admin / internal staff) has no tenant of
    // their own — this screen has nothing to show them.
    return <Navigate to="/" replace />;
  }

  // Intake Questions (InterviewQuestionsTab) was parked behind a
  // "coming soon" placeholder pending two things: the job posting workflow
  // it hangs off of, and a way for a company that never customized its own
  // set to still see something sensible. Both are done — Add Job Opening's
  // Questions step already shows this company's current questions
  // read-only (AiQuestionsSetup.tsx), and organization-service now
  // live-inherits the Super Admin's platform default for any company that
  // hasn't diverged (ListJobQuestionsUseCase) rather than requiring one
  // seeded copy per tenant up front. Swapped back in below.
  //
  // Scoring Criteria, QR Management and Notification Settings aren't
  // job-workflow-adjacent in that sense — each configures something that
  // already exists independent of any job posting, and each has a real tab
  // wired below:
  //  - Scoring Criteria / QR Management: mirror the Super Admin's
  //    per-company ScoringCriteriaPanel/QrCodePanel (see
  //    CustomerDashboard/ViewCustomer), just tenant-scoped to the signed-in
  //    session instead of an arbitrary tenant_id from the URL.
  //  - Notification Settings: one tab collecting Email Templates,
  //    Notification Copy, and SMS Templates as sub-tabs — those three used
  //    to be separate top-level tabs here, each real and independently
  //    working, just sitting side by side with every other My Company
  //    section instead of grouped under the one thing they're all actually
  //    about. See NotificationSettingsTab's own doc comment for what each
  //    sub-tab is and why they're distinct systems, not one feature split
  //    three ways.

  const items: TabsProps['items'] = [
    canViewCompanyDetails && {
      key: '1',
      label: 'Company Details',
      children: <CompanyProfileTab tenantId={tenantId} />,
    },
    canViewLocations && {
      key: '2',
      label: 'Locations',
      children: <CompanyLocationsTab tenantId={tenantId} />,
    },
    canViewDepartments && {
      key: '3',
      label: 'Departments',
      children: <DepartmentsTab tenantId={tenantId} />,
    },
    canViewFeatureSettings && {
      key: '4',
      label: 'Feature Settings',
      children: <EntitlementsTab tenantId={tenantId} />,
    },
    canViewTeam && { key: '5', label: 'Team', children: <TeamTab tenantId={tenantId} /> },
    canViewActivity && {
      key: '6',
      label: 'Activity',
      children: <TenantActivityFeedTab tenantId={tenantId} />,
    },
    canViewInterviewQuestions && {
      key: '7',
      label: 'Intake Questions',
      children: <InterviewQuestionsTab tenantId={tenantId} />,
    },
    {
      key: '8',
      label: 'Scoring Criteria',
      children: <ScoringCriteriaOwnerTab tenantId={tenantId} />,
    },
    canViewQrManagement && {
      key: '9',
      label: 'QR Management',
      children: <QrManagementTab tenantId={tenantId} />,
    },
    canViewJobSettings && {
      key: '11',
      label: 'Job Settings',
      children: <JobSettingsTab />,
    },
    // Not gated on canViewEmailTemplates itself — "SMS Templates" (one of
    // this tab's 3 sub-tabs) never had a permission gate of its own before
    // this consolidation, so hiding the whole tab behind EMAIL_TEMPLATE_VIEW
    // would take that access away from anyone who held it without also
    // holding EMAIL_TEMPLATE_VIEW. The gate applies per sub-tab instead —
    // see NotificationSettingsTab's own canViewEmailTemplates prop.
    {
      key: '10',
      label: 'Notification Settings',
      children: (
        <NotificationSettingsTab
          tenantId={tenantId}
          canViewEmailTemplates={canViewEmailTemplates}
        />
      ),
    },
  ].filter(Boolean) as TabsProps['items'];

  return (
    <MainLayout>
      <div className="w-full px-6 py-5 max-w-[1400px] mx-auto">
        <div
          className="flex items-center gap-2 text-sm text-gray-500 mb-3 cursor-pointer hover:text-primary-600 transition-colors w-fit"
          onClick={() => navigate('/')}
        >
          <MdOutlineArrowBack />
          <span>Back</span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl shadow-xs">
          <div className="p-6">
            {isProfileLoading && <Loader />}

            <div className="flex items-center gap-4 mb-6">
              <div className="relative w-14 h-14 shrink-0 bg-gradient-to-br from-primary-600 to-accent-500 text-white rounded-full flex items-center justify-center shadow-sm text-xl font-bold overflow-hidden">
                {profile?.logo_url ? (
                  <img
                    src={profile.logo_url}
                    alt={profile.company_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{profile?.company_name?.toUpperCase()?.[0] || ''}</span>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-bold text-gray-900">
                  {profile?.company_name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <MdEmail size={14} />
                    {profile?.admin_contact || '-'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MdPhone size={14} />
                    {profile?.website_url || '-'}
                  </span>
                </div>
              </div>
            </div>

            <OnboardingChecklist
              companyId={tenantId}
              status={{
                // `culture_intro` used to be read straight off this profile
                // object, but it was never really there — the real GET
                // /profile response doesn't include it at all (it's its own
                // resource, see Tenants/cultureIntro.ts), so this check was
                // silently always just `logo_url` alone at runtime. `description`
                // is a real field on this response and same-spirit signal
                // ("has the admin put in any profile content yet").
                profileReviewed: Boolean(profile?.logo_url || profile?.description),
                hasOffice: (offices?.length ?? 0) > 0,
                hasDepartment: (departments?.length ?? 0) > 0,
                hasInvitedTeam: (invitations?.total ?? 0) > 0,
              }}
              onNavigateToTab={handleTabChange}
            />

            <Tabs
              activeKey={currentTab}
              onChange={handleTabChange}
              items={items}
              className="my-company-tabs"
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default MyCompany;
