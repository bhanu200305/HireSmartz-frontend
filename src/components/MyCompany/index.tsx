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
import CultureIntroTab from './CultureIntroTab';
import ScoringCriteriaOwnerTab from './ScoringCriteriaOwnerTab';
import QrManagementTab from './QrManagementTab';
import NotificationSettingsTab from './NotificationSettingsTab';
import TenantJobTypesTab from './JobSettings/TenantJobTypesTab';
import TenantShiftsTab from './JobSettings/TenantShiftsTab';
import TenantJobModesTab from './JobSettings/TenantJobModesTab';
import TenantClosureReasonsTab from './JobSettings/TenantClosureReasonsTab';
import TenantEducationPreferencesTab from './JobSettings/TenantEducationPreferencesTab';
import TenantJobTitlesTab from './JobSettings/TenantJobTitlesTab';
import TenantDepartmentSettingsTab from './JobSettings/TenantDepartmentSettingsTab';
// import TenantAtsIntegrationTab from './JobSettings/TenantAtsIntegrationTab'; // hidden for now
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
  // COMPANY_SETTINGS_EDIT ('organization:update'), not COMPANY_SETTINGS_VIEW
  // ('organization:read') — read is a broad permission Recruiter/Hiring
  // Manager also legitimately hold, so these admin-only tabs need the
  // still-admin-exclusive update permission instead. Same gate as
  // MyCompanyPage's own.
  const canViewCompanyDetails = useHasAccess(Authorities.COMPANY_SETTINGS_EDIT);
  const canViewLocations = useHasAccess(Authorities.LOCATION_VIEW);
  const canViewDepartments = useHasAccess(Authorities.DEPARTMENT_VIEW);
  const canViewJobTitles = useHasAccess(Authorities.TENANT_JOB_TITLE_VIEW);
  const canViewFeatureSettings = useHasAccess(Authorities.COMPANY_SETTINGS_EDIT);
  const canViewTeam = useHasAccess(Authorities.INVITATION_VIEW);
  const canViewActivity = useHasAccess(Authorities.COMPANY_SETTINGS_EDIT);
  const canViewInterviewQuestions = useHasAccess(Authorities.INTERVIEW_QUESTIONS_VIEW);
  // Same permission string culture-intro's backend routes gate on
  // (`interview:read`) — organization-service reuses INTERVIEW_QUESTIONS_VIEW's
  // pair rather than minting a dedicated one, see CultureIntroTab.tsx.
  const canViewCultureIntro = useHasAccess(Authorities.INTERVIEW_QUESTIONS_VIEW);
  const canViewEmailTemplates = useHasAccess(Authorities.EMAIL_TEMPLATE_VIEW);
  // QR Management has no dedicated catalog permission — job-workflow-adjacent,
  // so it shares JOB_OPENING_VIEW. Job Settings (job types/shifts/education
  // preferences) is gated on COMPANY_SETTINGS_VIEW ('organization:read')
  // instead — that's what job-service's own catalogue GET routes require.
  const canViewQrManagement = useHasAccess(Authorities.JOB_OPENING_VIEW);
  // Both hooks must run unconditionally on every render — `||` short-circuits
  // the second call once the first is true, which varies the hook count
  // between renders and violates React's rules of hooks.
  const canViewCompanySettings = useHasAccess(Authorities.COMPANY_SETTINGS_VIEW);
  const canViewJobCatalog = useHasAccess(Authorities.JOB_CATALOG_VIEW);
  const canViewJobSettings = canViewCompanySettings || canViewJobCatalog;

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

  // With Notification Settings folded in, this page had grown to 12 flat
  // top-level tabs in one horizontally-scrolling row. Grouped here into 4
  // topic tabs instead, each opening its own short row of the real leaf
  // tabs below it (same two-level pattern Notification Settings already
  // used for its own 3 sub-tabs) — purely a navigation regrouping, nothing
  // below changed behavior, data, or backend calls. Leaf `key`s are
  // untouched on purpose: OnboardingChecklist's CHECKLIST_STEPS deep-links
  // by leaf key alone ('1', '2', '3', '5'), so `handleTabChange` resolving
  // a leaf key to its group below keeps those links (and any other
  // `?tab=<leaf key>` link) working exactly as before.
  const groups: { key: string; label: string; tabs: TabsProps['items'] }[] = [
    {
      key: 'profile',
      label: 'Company Profile',
      tabs: [
        canViewCompanyDetails && {
          key: '1',
          label: 'General',
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
        canViewJobTitles && {
          key: '19',
          label: 'Job Titles',
          children: <TenantJobTitlesTab tenantId={tenantId} />,
        },
        canViewDepartments && {
          key: '20',
          label: 'Department Settings',
          children: <TenantDepartmentSettingsTab tenantId={tenantId} />,
        },
      ].filter(Boolean) as TabsProps['items'],
    },
    {
      key: 'team',
      label: 'Team & Access',
      tabs: [
        canViewTeam && {
          key: '5',
          label: 'Invitations',
          children: <TeamTab tenantId={tenantId} />,
        },
        canViewActivity && {
          key: '6',
          label: 'Activity Feed',
          children: <TenantActivityFeedTab tenantId={tenantId} />,
        },
      ].filter(Boolean) as TabsProps['items'],
    },
    {
      key: 'hiring',
      label: 'Hiring Configuration',
      tabs: [
        canViewInterviewQuestions && {
          key: '7',
          label: 'Intake Questions',
          children: <InterviewQuestionsTab tenantId={tenantId} />,
        },
        // Key kept as '12' — not renumbered into the '7'/'8' gap, so
        // existing `?tab=` links to every other tab keep working.
        canViewCultureIntro && {
          key: '12',
          label: 'Culture Intro',
          children: <CultureIntroTab tenantId={tenantId} />,
        },
        {
          key: '8',
          label: 'Scoring Criteria',
          children: <ScoringCriteriaOwnerTab />,
        },
        // Job-workflow catalogues (job types/shifts/job modes/closure
        // reasons/education preferences) feeding the Job Details/Close Job
        // steps, flattened as direct leaves rather than nested one level
        // deeper behind their own "Job Settings" tab.
        canViewJobSettings && {
          key: '13',
          label: 'Job Types',
          children: <TenantJobTypesTab />,
        },
        canViewJobSettings && {
          key: '14',
          label: 'Shifts',
          children: <TenantShiftsTab />,
        },
        canViewJobSettings && {
          key: '15',
          label: 'Job Modes',
          children: <TenantJobModesTab />,
        },
        canViewJobSettings && {
          key: '16',
          label: 'Closure Reasons',
          children: <TenantClosureReasonsTab />,
        },
        canViewJobSettings && {
          key: '17',
          label: 'Education Preferences',
          children: <TenantEducationPreferencesTab />,
        },
        // Hidden for now - ATS integration isn't being rolled out yet.
        // canViewJobSettings && {
        //   key: '18',
        //   label: 'ATS Integration',
        //   children: <TenantAtsIntegrationTab />,
        // },
      ].filter(Boolean) as TabsProps['items'],
    },
    {
      key: 'tools',
      label: 'Tools & Settings',
      tabs: [
        canViewQrManagement && {
          key: '9',
          label: 'QR Code',
          children: <QrManagementTab tenantId={tenantId} />,
        },
        canViewFeatureSettings && {
          key: '4',
          label: 'Feature Settings',
          children: <EntitlementsTab tenantId={tenantId} />,
        },
        // Gated on canViewEmailTemplates: since SMS Templates was removed
        // (dead endpoint — see NotificationSettingsTab's own doc comment),
        // both of this tab's remaining sub-tabs already require
        // EMAIL_TEMPLATE_VIEW internally, so the whole entry would otherwise
        // render as an empty section for anyone without it.
        canViewEmailTemplates && {
          key: '10',
          label: 'Notification Settings',
          children: <NotificationSettingsTab canViewEmailTemplates={canViewEmailTemplates} />,
        },
      ].filter(Boolean) as TabsProps['items'],
    },
  ].filter((group) => (group.tabs?.length ?? 0) > 0);

  // Which group the current leaf tab lives in — derived from `currentTab`
  // rather than tracked as its own `?group=` param, so a leaf-level deep
  // link (OnboardingChecklist, or a bookmarked `?tab=2`) opens the right
  // group automatically instead of needing two URL params kept in sync.
  const activeGroup =
    groups.find((group) => group.tabs?.some((tab) => tab.key === currentTab)) ?? groups[0];

  const handleGroupChange = (groupKey: string) => {
    const firstLeafTab = groups.find((group) => group.key === groupKey)?.tabs?.[0];
    if (firstLeafTab) {
      handleTabChange(String(firstLeafTab.key));
    }
  };

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
              <div
                className={`relative w-14 h-14 shrink-0 text-white rounded-full flex items-center justify-center shadow-sm text-xl font-bold overflow-hidden ${
                  profile?.logo_url
                    ? 'bg-gray-100'
                    : 'bg-gradient-to-br from-primary-600 to-accent-500'
                }`}
              >
                {profile?.logo_url ? (
                  <img
                    src={profile.logo_url}
                    alt={profile.company_name}
                    // object-contain, not object-cover — see
                    // CompanyProfileTab.tsx's identical fix for why cover was
                    // cropping most of a non-square scraped logo away. This
                    // header is display-only (no upload control of its own —
                    // the logo is edited from the Company Profile tab), so
                    // just the framing fix, no crop modal here.
                    className="w-full h-full object-contain p-1.5"
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
                // `description` is a real field on this profile response,
                // same-spirit signal as `logo_url` for "has content".
                profileReviewed: Boolean(profile?.logo_url || profile?.description),
                hasOffice: (offices?.length ?? 0) > 0,
                hasDepartment: (departments?.length ?? 0) > 0,
                hasInvitedTeam: (invitations?.total ?? 0) > 0,
              }}
              onNavigateToTab={handleTabChange}
            />

            <Tabs
              activeKey={activeGroup.key}
              onChange={handleGroupChange}
              items={groups.map((group) => ({
                key: group.key,
                label: group.label,
                children: null,
              }))}
              className="my-company-group-tabs many-tabs"
            />
            <Tabs
              activeKey={currentTab}
              onChange={handleTabChange}
              items={activeGroup.tabs}
              className="my-company-tabs many-tabs mt-1"
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default MyCompany;
