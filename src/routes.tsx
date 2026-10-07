import { Suspense, lazy } from 'react';
import type { Route as RouteType } from './types';
import { Outlet, Route } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import PublicRoute from './components/PublicRoute';
import { Loader } from './components/shared/ui/loader';
// import MainLayout from './layouts/MainLayout.jsx';

const lazyImport = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ [key: string]: any }>,
  name: string
): React.LazyExoticComponent<T> => {
  return lazy(() =>
    factory().then((module) => {
      // Handle both default export with named properties and direct named exports
      const exportedModule = module.default || module;
      if (!exportedModule[name]) {
        throw new Error(`Component ${name} not found in module`);
      }
      return { default: exportedModule[name] };
    })
  );
};

// Lazy load all page components
const AddCustomers = lazy(() => import('./pages/AddCustomerPage'));
const AddInterviewRoundPage = lazy(() => import('./pages/AddInterviewRound'));
const AddJobDescriptionPage = lazy(() => import('./pages/AddJobDescription'));
const AddOrganisationUserPage = lazyImport(
  () => import('./pages/AddOrganisationUserPage'),
  'AddOrganisationUserPage'
);
const AiQuestionsPage = lazyImport(() => import('./pages/AIQuestions'), 'AiQuestionsPage');
const AIQuestionsSetupPage = lazyImport(
  () => import('./pages/AIQuestions'),
  'AIQuestionsSetupPage'
);
const CustomersPage = lazy(() => import('./pages/CustomerPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const BookDemoPage = lazy(() => import('./pages/BookDemoPage'));
const EditAiJobDescriptionPage = lazy(() => import('./pages/EditAiJobDescriptionPage'));
const EditDetailedInterviewRoundPage = lazy(() => import('./pages/EditDetailedInterviewPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ConfirmRecoveryEmailPage = lazy(() => import('./pages/ConfirmRecoveryEmailPage'));
const StartAccountRecoveryPage = lazy(() => import('./pages/StartAccountRecoveryPage'));
const CompleteAccountRecoveryPage = lazy(() => import('./pages/CompleteAccountRecoveryPage'));
const SecuritySettingsPage = lazy(() => import('./pages/SecuritySettingsPage'));
const ActiveSessionsPage = lazy(() => import('./pages/ActiveSessionsPage'));
const NotificationSettingsPage = lazy(() => import('./pages/NotificationSettingsPage'));
const AdminToolsPage = lazy(() => import('./pages/AdminToolsPage'));
const AcceptInvitationPage = lazy(() => import('./pages/AcceptInvitationPage'));
const ActivityFeedPage = lazy(() => import('./pages/ActivityFeedPage'));
const MyActivityPage = lazy(() => import('./pages/MyActivityPage'));
const MySupportAccessPage = lazy(() => import('./pages/MySupportAccessPage'));
const JobsOpeningPage = lazyImport(() => import('./pages/JobsOpening'), 'JobsOpeningPage');
const LoginPage = lazy(() => import('./pages/LoginPage'));
const LogOutPage = lazy(() => import('./pages/LogOutPage'));
const OrganisationUserPage = lazy(() => import('./pages/OrganisationUserPage'));
const RolesPage = lazy(() => import('./pages/RolesPage'));
const SyncAtsPage = lazyImport(() => import('./pages/JobsOpening'), 'SyncAtsPage');
const UpdateInterviewRoundPage = lazy(() => import('./pages/UpdateInterviewRoundPage'));
const ViewCompanyPage = lazy(() => import('./pages/ViewCompanyPage'));
const ViewDetailJdPage = lazyImport(() => import('./pages/ViewDetailJdPage'), 'ViewDetailJdPage');
const ViewInterviewRoundPage = lazy(() => import('./pages/ViewInterviewRoundPage'));
const ViewJobDescriptionPage = lazy(() => import('./pages/ViewJobDescriptionPage'));
const ViewJobDetailsPage = lazy(() => import('./pages/ViewJobDetails'));
const AtsJobIdPage = lazy(() => import('./pages/AtsJobId'));
const SearchCandidateListingPage = lazyImport(
  () => import('./pages/Candidates'),
  'SearchCandidateListingPage'
);
const VeiwOrganisationUserPage = lazyImport(
  () => import('./pages/AddOrganisationUserPage'),
  'VeiwOrganisationUserPage'
);
const EditOrganisationUserPage = lazyImport(
  () => import('./pages/AddOrganisationUserPage'),
  'EditOrganisationUserPage'
);
const MeetingAccessScreenLiveKit = lazy(
  () => import('./pages/MeetingAccessScreen/MeetingAccessScreenLiveKit')
);
const UserProfilePage = lazyImport(() => import('./pages/UserProfile'), 'UserProfilePage');
const changePasswordPage = lazyImport(() => import('./pages/UserProfile'), 'changePasswordPage');
const FinancesPage = lazy(() => import('./pages/FinancesPage'));
const InterviewEndedPage = lazy(() => import('./pages/InterviewEnded'));
const AiCallBookingPage = lazy(() => import('./pages/AiCallBookingPage'));
const InterviewsPage = lazy(() => import('./pages/InterviewsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const EditInterviewRoundPage = lazy(() => import('./pages/EditInterviewRoundPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const InterviewLiveKit = lazy(() => import('./components/Interview/InterviewLiveKit'));
const CandidateJoinPage = lazyImport(
  () => import('./components/Interview/SessionJoinScreen'),
  'CandidateJoinPage'
);
const InterviewerJoinPage = lazyImport(
  () => import('./components/Interview/SessionJoinScreen'),
  'InterviewerJoinPage'
);
const CandidateFeedbackPage = lazyImport(
  () => import('./components/Interview/CandidateActionScreens'),
  'CandidateFeedbackPage'
);
const WithdrawalPage = lazyImport(
  () => import('./components/Interview/CandidateActionScreens'),
  'WithdrawalPage'
);
const RecordingPlaybackPage = lazyImport(
  () => import('./components/Interview/CandidateActionScreens'),
  'RecordingPlaybackPage'
);
const MyCompanyPage = lazy(() => import('./pages/MyCompanyPage'));
const CompanyMetricsPage = lazy(() => import('./pages/CompanyMetricsPage'));
const CompanySettingsPage = lazy(() => import('./pages/CompanySettingsPage'));
const PlatformAuditPage = lazy(() => import('./pages/PlatformAuditPage'));
const PlatformActivityPage = lazy(() => import('./pages/PlatformActivityPage'));
const PlatformMetricsPage = lazy(() => import('./pages/PlatformMetricsPage'));
const GuestOrganizationsPage = lazy(() => import('./pages/GuestOrganizationsPage'));
const CalendarSettingsPage = lazy(() => import('./pages/CalendarSettingsPage'));
const ScheduleCalendarPage = lazy(() => import('./pages/ScheduleCalendarPage'));
const AiCallSchedulePage = lazy(() => import('./pages/AiCallSchedulePage'));
const JobScoringCriteriaPage = lazy(() => import('./pages/JobScoringCriteriaPage'));
const PublicInterviewConsentPage = lazy(() => import('./pages/PublicInterviewConsentPage'));
const CareersListingPage = lazy(() => import('./pages/CareersListingPage'));
const CareersJobDetailPage = lazy(() => import('./pages/CareersJobDetailPage'));
const CareersApplyPage = lazy(() => import('./pages/CareersApplyPage'));
const CareersApplyChoicePage = lazy(() => import('./pages/CareersApplyChoicePage'));
const CareersInstantCallPage = lazy(() => import('./pages/CareersInstantCallPage'));
const CareersIntakeCallSchedulePage = lazy(() => import('./pages/CareersIntakeCallSchedulePage'));
const CareersApplySuccessPage = lazy(() => import('./pages/CareersApplySuccessPage'));
const CareersResumeUploadPage = lazy(() => import('./pages/CareersResumeUploadPage'));
const CareersSmsConsentPage = lazy(() => import('./pages/CareersSmsConsentPage'));
const VerificationCallbackPage = lazy(() => import('./pages/VerificationCallbackPage'));

// Lazy load components
const JobDetails = lazy(() => import('./components/JobsOpening/AddJobDescription/jobdetails'));
const JobDescriptionStep = lazy(
  () => import('./components/JobsOpening/AddJobDescription/JobDescriptionStep')
);
const AiQuestionsSetup = lazy(
  () => import('./components/JobsOpening/AddJobDescription/AiQuestionsSetup')
);
const InterviewSetup = lazy(
  () => import('./components/JobsOpening/AddJobDescription/InterviewSetup')
);
const JobsOpening = lazy(() => import('./components/JobsOpening/JobsOpening'));
const EditJobDetail = lazy(() => import('./components/JobsOpening/EditJobOpening/EditJobDetail'));
const CandidatesListing = lazy(
  () => import('./components/JobsOpening/Candidates/CandidatesListing')
);
const CandidateDetails = lazy(() => import('./components/JobsOpening/Candidates/CandidateDetails'));
const AddNewPackage = lazy(
  () => import('./components/CustomerDashboard/Subscriptions/addNewPackage')
);
const UpdatePackage = lazy(
  () => import('./components/CustomerDashboard/Subscriptions/updatePackage')
);
const UpdatePayment = lazy(
  () => import('./components/CustomerDashboard/Subscriptions/updatePayment')
);

export const Routes: RouteType[] = [
  {
    name: 'Home',
    path: '/',
    component: HomePage,
    isOpen: true,
  },
  {
    name: 'BookDemo',
    path: '/book-demo',
    component: BookDemoPage,
    isOpen: true,
  },
  {
    name: 'Login',
    path: '/login',
    component: LoginPage,
    isPublic: true,
  },
  {
    name: 'Logout',
    path: '/logout',
    component: LogOutPage,
    isPrivate: true,
  },
  {
    name: 'ForgotPassword',
    path: '/forgot-password',
    component: ForgotPasswordPage,
    isPublic: true,
  },
  {
    name: 'ResetPassword',
    // Must match notification-service's LinkBuilder.password_reset_url()
    // exactly (services/notification-service/app/core/links.py) — the token
    // is placed in the path there, not the query string.
    path: '/reset-password/:token',
    component: ResetPasswordPage,
    // isOpen, not isPublic: this is a token-based action link and must work
    // regardless of whatever session happens to already be in the browser
    // (see AcceptInvitation below for the full reasoning).
    isOpen: true,
  },
  {
    name: 'VerifyEmail',
    // Must match notification-service's LinkBuilder.email_verification_url()
    // exactly, same reasoning as ResetPassword above.
    path: '/verify-email/:token',
    component: VerifyEmailPage,
    // isOpen, not isPublic — same reasoning as ResetPassword above.
    isOpen: true,
  },
  {
    name: 'ConfirmRecoveryEmail',
    // Must match notification-service's LinkBuilder.recovery_email_confirmation_url()
    // exactly, same reasoning as VerifyEmail above.
    path: '/confirm-recovery-email/:token',
    component: ConfirmRecoveryEmailPage,
    // isOpen, not isPublic — same reasoning as ResetPassword above.
    isOpen: true,
  },
  {
    name: 'StartAccountRecovery',
    path: '/account-recovery',
    component: StartAccountRecoveryPage,
    isPublic: true,
  },
  {
    name: 'CompleteAccountRecovery',
    // Must match notification-service's LinkBuilder.account_recovery_url()
    // exactly, same reasoning as ResetPassword above.
    path: '/account-recovery/:token/complete',
    component: CompleteAccountRecoveryPage,
    // isOpen, not isPublic — same reasoning as ResetPassword above.
    isOpen: true,
  },
  {
    name: 'SecuritySettings',
    path: '/settings/security',
    component: SecuritySettingsPage,
    isPrivate: true,
  },
  {
    name: 'ActiveSessions',
    path: '/settings/sessions',
    component: ActiveSessionsPage,
    isPrivate: true,
  },
  {
    name: 'NotificationSettings',
    path: '/settings/notifications',
    component: NotificationSettingsPage,
    isPrivate: true,
  },
  {
    name: 'AdminTools',
    path: '/settings/admin',
    component: AdminToolsPage,
    isPrivate: true,
  },
  {
    name: 'AcceptInvitation',
    // Must match notification-service's LinkBuilder.setup_url() exactly
    // (services/notification-service/app/core/links.py) — that's the only
    // place invite emails' link is built, and it always points here.
    path: '/invitations/:token/accept',
    component: AcceptInvitationPage,
    // isOpen, not isPublic: PublicRoute redirects away whenever the browser
    // holds ANY unexpired token, even one from an unrelated/stale session —
    // e.g. the admin who just sent the invite opening it in their own
    // logged-in tab. That bounced them to '/' (or, if that session turned out
    // invalid server-side, all the way to /login) before the invite form ever
    // rendered. An invite link must work no matter what session is sitting in
    // the browser, so this gets no auth gate at all.
    isOpen: true,
  },
  {
    name: 'userProfile',
    path: '/profile',
    component: UserProfilePage,
  },
  {
    name: 'changePassword',
    path: '/change-password',
    component: changePasswordPage,
    isPrivate: true,
  },
  {
    name: '404',
    path: '*',
    component: NotFoundPage,
  },
  {
    name: 'CompanySettings',
    path: '/company-settings',
    component: CompanySettingsPage,
  },
  {
    name: 'PlatformAudit',
    path: '/platform-audit',
    component: PlatformAuditPage,
  },
  {
    name: 'PlatformActivity',
    path: '/platform-activity',
    component: PlatformActivityPage,
  },
  {
    name: 'PlatformMetrics',
    path: '/platform-metrics',
    component: PlatformMetricsPage,
  },
  {
    name: 'GuestOrganizations',
    path: '/guest-organizations',
    component: GuestOrganizationsPage,
  },
  {
    name: 'CalendarSettings',
    path: '/settings/calendar',
    component: CalendarSettingsPage,
  },
  {
    name: 'ScheduleCalendar',
    path: '/schedule-calendar',
    component: ScheduleCalendarPage,
    isOpen: true,
  },
  {
    name: 'AiCallSchedule',
    path: '/ai-schedule',
    component: AiCallSchedulePage,
    isOpen: true,
  },
  {
    // interview-service emails the candidate a scheduling link as
    // `${CANDIDATE_SCHEDULING_BASE_URL}?token=…` — configured as
    // `.../schedule`. Same page as /ai-schedule (it resolves the token via
    // GET /scheduling/{token} and branches on interview_type itself).
    name: 'CandidateSchedule',
    path: '/schedule',
    component: AiCallSchedulePage,
    isOpen: true,
  },
  {
    // The `/public/q/:qrCode/...` tree (PublicJobListingPage/
    // PublicJobDetailPage/PublicJobApplyPage/PublicJobSuccessPage) that used
    // to live here was removed — it rode `api/candidate-service/PublicQr`,
    // which called `${VITE_BACKEND_ENDPOINT}/v1/public/q/...`, a route that
    // exists on no real service. The `/careers/:organizationId/...` tree
    // below is the genuine replacement (real job-service public board + real
    // candidate-service apply) — see CANDIDATE_SERVICE_INTEGRATION.md.
    name: 'PublicInterviewConsent',
    path: '/public/interview/consent',
    component: PublicInterviewConsentPage,
    isOpen: true,
  },
  {
    // Where organization-service's tenant QR code (GenerateTenantQrCodeUseCase)
    // sends a candidate — :organizationId is the same UUID as the tenant_id
    // the QR was generated for. Backed by job-service's new public router
    // (GET /public/organizations/{organization_id}/jobs), not the old
    // PublicQr/candidate-service flow above.
    name: 'CareersListing',
    path: '/careers/:organizationId',
    component: CareersListingPage,
    isOpen: true,
  },
  {
    name: 'CareersJobDetail',
    path: '/careers/:organizationId/jobs/:jobId',
    component: CareersJobDetailPage,
    isOpen: true,
  },
  {
    name: 'CareersApply',
    path: '/careers/:organizationId/jobs/:jobId/apply',
    component: CareersApplyPage,
    isOpen: true,
  },
  {
    name: 'CareersApplyChoice',
    path: '/careers/:organizationId/jobs/:jobId/apply-choice',
    component: CareersApplyChoicePage,
    isOpen: true,
  },
  {
    name: 'CareersInstantCall',
    path: '/careers/:organizationId/jobs/:jobId/apply/call',
    component: CareersInstantCallPage,
    isOpen: true,
  },
  {
    // `?token=` is the signed `intake_call_booking_token` from a resume
    // apply's response — see CareersApplyPage's post-submit routing.
    name: 'CareersIntakeCallSchedule',
    path: '/careers/:organizationId/jobs/:jobId/apply/schedule',
    component: CareersIntakeCallSchedulePage,
    isOpen: true,
  },
  {
    name: 'CareersApplySuccess',
    path: '/careers/:organizationId/jobs/:jobId/apply/success',
    component: CareersApplySuccessPage,
    isOpen: true,
  },
  {
    // Where notification-service's "upload your resume within 24 hours"
    // mail actually points — `LinkBuilder.resume_upload_url`, PATH segment
    // not `/careers/...` (this candidate has no organizationId/jobId in
    // hand, only the signed token, see the page's own module comment).
    // MUST be `isOpen: true` — this route previously did not exist at all,
    // so it fell through to the `path: '*'` 404 entry below, which (having
    // neither isOpen nor isPublic set) defaults to auth-required and sent
    // an unauthenticated candidate straight to /login before they ever saw
    // a 404, let alone the upload form.
    name: 'CareersResumeUpload',
    path: '/resume-upload/:token',
    component: CareersResumeUploadPage,
    isOpen: true,
  },
  {
    // The "Get text updates" button in a recruiter-uploaded candidate's
    // application-received email — `{frontend}/sms-consent/{token}`. Same
    // reasoning as the resume-upload route above: no account, signed token
    // only, so it MUST be `isOpen: true` or it falls through to the
    // auth-required 404 and bounces the candidate to /login.
    name: 'CareersSmsConsent',
    path: '/sms-consent/:token',
    component: CareersSmsConsentPage,
    isOpen: true,
  },
  {
    // ID.me's own redirect target — see VerificationCallbackPage's module
    // comment for why this is the one real piece of that flow this
    // frontend can build.
    name: 'VerificationCallback',
    path: '/verification/callback',
    component: VerificationCallbackPage,
    isOpen: true,
  },
  {
    name: 'Customers',
    path: '/company',
    component: CustomersPage,
  },
  {
    name: 'MyCompany',
    path: '/my-company',
    component: MyCompanyPage,
  },
  {
    name: 'CompanyMetrics',
    path: '/company-metrics',
    component: CompanyMetricsPage,
  },
  {
    name: 'Finances',
    path: '/finances',
    component: FinancesPage,
  },
  {
    name: 'Subscriptions',
    path: '/Subscriptions',
    component: SubscriptionPage,
  },
  {
    name: 'AddNewPackage',
    path: '/add-new-package',
    component: AddNewPackage,
  },
  {
    name: 'UpdatePackage',
    path: '/update-package',
    component: UpdatePackage,
  },
  {
    name: 'UpdatePayment',
    path: '/update-payment',
    component: UpdatePayment,
  },
  {
    name: 'AddCustomers',
    path: '/add-company',
    component: AddCustomers,
  },
  {
    name: 'ViewCompany',
    path: '/view-company',
    component: ViewCompanyPage,
  },
  {
    name: 'Roles',
    path: '/roles',
    component: RolesPage,
  },
  {
    name: 'Jobs',
    path: '/jobs',
    component: JobsOpeningPage,
  },
  {
    name: 'ActivityFeed',
    path: '/activityFeed',
    component: ActivityFeedPage,
  },
  {
    name: 'AddJobDescription',
    path: '/add-job-description',
    component: AddJobDescriptionPage,
  },
  {
    name: 'JobDetails',
    path: '/job-details',
    component: JobDetails,
  },
  {
    name: 'AtsJobId',
    path: '/ats-job-id',
    component: AtsJobIdPage,
  },
  {
    name: 'JobsOpening',
    path: '/job-description',
    component: JobsOpening,
    children: [
      {
        path: '',
        component: JobDescriptionStep,
        name: 'JobDescriptionStep',
      },
    ],
  },
  {
    name: 'AiQuestionsSetup',
    path: '/ai-questions',
    component: JobsOpening,
    children: [
      {
        path: '',
        component: AiQuestionsSetup,
        name: 'AiQuestionsSetup',
      },
    ],
  },
  {
    name: 'ScoringCriteriaSetup',
    path: '/scoring-criteria',
    component: JobsOpening,
    children: [
      {
        path: '',
        component: JobScoringCriteriaPage,
        name: 'ScoringCriteriaSetup',
      },
    ],
  },
  {
    name: 'ViewJobDescriptionPage',
    path: 'ai-job-description',
    component: ViewJobDescriptionPage,
    children: [
      {
        name: 'syncats',
        path: 'sync-ats',
        component: SyncAtsPage,
      },
    ],
  },
  {
    name: 'viewJobOpenings',
    path: '/jobs/view/:id',
    component: JobsOpening,
    children: [
      {
        name: 'viewJobDetails',
        path: 'details',
        component: ViewJobDetailsPage,
      },
      {
        name: 'viewJobDescription',
        path: 'description',
        component: ViewJobDetailsPage,
      },
      {
        name: 'viewAIJobDescription',
        path: 'AiJobDescription',
        component: ViewDetailJdPage,
      },
      {
        name: 'viewCandidatesOutlet',
        path: 'candidates',
        component: Outlet,
        children: [
          {
            name: 'viewCandidates',
            path: '',
            component: CandidatesListing,
          },
          {
            name: 'CandidateDetails',
            path: ':candidateId/details',
            component: CandidateDetails,
          },
        ],
      },
      {
        name: 'viewInterviewRounds',
        path: 'interview',
        component: ViewInterviewRoundPage,
      },
      {
        name: 'CandidateDetails',
        path: 'candidateDetails/:candidateId',
        component: CandidateDetails,
      },
      {
        name: 'viewAiQuestions',
        path: 'aiQuestions',
        component: AiQuestionsPage,
      },
      {
        name: 'viewScoringCriteria',
        path: 'scoring-criteria',
        component: JobScoringCriteriaPage,
      },
    ],
  },
  {
    name: 'editJobOpenings',
    path: '/jobs/edit/:id',
    component: JobsOpening,
    children: [
      {
        name: 'editJobDetails',
        path: 'details',
        component: EditJobDetail,
      },
      {
        name: 'aiJobDescription',
        path: 'AiJobDescription/:aiJobDescriptionId',
        component: EditAiJobDescriptionPage,
        children: [
          {
            name: 'editAiJobDescription',
            path: 'sync-ats',
            component: SyncAtsPage,
          },
        ],
      },
      {
        name: 'editInterviewRounds',
        path: 'interview',
        component: EditDetailedInterviewRoundPage,
        children: [
          {
            name: 'AddNewRound',
            path: 'addNewRound',
            component: AddInterviewRoundPage,
          },
          {
            name: 'editInterviewRound',
            // :roundId, not :id — avoids shadowing the parent job id param.
            path: 'edit-interview-round/:roundId',
            component: UpdateInterviewRoundPage,
          },
        ],
      },
      {
        name: 'editAiQuestions',
        path: 'editAiQuestions',
        component: AIQuestionsSetupPage,
      },
      {
        name: 'editScoringCriteria',
        path: 'scoring-criteria',
        component: JobScoringCriteriaPage,
      },
    ],
  },
  {
    name: 'InterviewSetup',
    path: '/interview-setup',
    component: InterviewSetup,
    children: [
      {
        name: 'AddNewRound',
        path: 'add-new-round',
        component: AddInterviewRoundPage,
      },
      {
        name: 'EditInterviewRound',
        path: 'edit-interview-round/:id',
        component: EditInterviewRoundPage,
      },
    ],
  },
  {
    name: 'AddOrganisationUsers',
    path: '/add-organisation-users',
    component: AddOrganisationUserPage,
  },
  {
    name: 'OrganisationUsers',
    path: '/organisation-users',
    component: OrganisationUserPage,
  },
  {
    name: 'OrganisationUsers',
    path: '/view-organisation-user',
    component: VeiwOrganisationUserPage,
  },
  {
    name: 'OrganisationUsers',
    path: '/edit-organisation-user',
    component: EditOrganisationUserPage,
  },
  {
    name: 'MeetingAccessScreen',
    path: '/meeting-access-screen',
    component: MeetingAccessScreenLiveKit,
    isOpen: true,
  },
  {
    name: 'InterviewEnded',
    path: '/interview-ended',
    component: InterviewEndedPage,
  },
  { name: 'InterviewPage', path: '/interview', component: InterviewLiveKit, isOpen: true },
  {
    // One-click join links emailed by interview-service when a video/panel
    // round is scheduled: CANDIDATE_JOIN_BASE_URL=/join,
    // INTERVIEWER_JOIN_BASE_URL=/interviewer-join, each carrying `?token=`.
    // Public — the candidate/interviewer is not logged in; the token in the
    // URL is the whole credential (see SessionJoinScreen).
    name: 'CandidateJoin',
    path: '/join',
    component: CandidateJoinPage,
    isOpen: true,
  },
  {
    name: 'InterviewerJoin',
    path: '/interviewer-join',
    component: InterviewerJoinPage,
    isOpen: true,
  },
  {
    // CANDIDATE_FEEDBACK_BASE_URL — post-round rating link.
    name: 'CandidateFeedback',
    path: '/feedback',
    component: CandidateFeedbackPage,
    isOpen: true,
  },
  {
    // CANDIDATE_WITHDRAWAL_BASE_URL — carried on every candidate email.
    name: 'CandidateWithdraw',
    path: '/withdraw',
    component: WithdrawalPage,
    isOpen: true,
  },
  {
    // Booking-scoped recording playback link (GET /recordings/{token}).
    name: 'RecordingPlayback',
    path: '/recordings',
    component: RecordingPlaybackPage,
    isOpen: true,
  },
  {
    name: 'Interviews',
    path: '/interviews',
    component: InterviewsPage,
  },
  {
    name: 'MyActivity',
    path: '/my-activity',
    component: MyActivityPage,
  },
  {
    name: 'MySupportAccess',
    path: '/my-support-access',
    component: MySupportAccessPage,
  },
  {
    name: 'AiCallBooking',
    path: '/ai-call-booking',
    component: AiCallBookingPage,
  },
  {
    name: 'searchCandidateListing',
    path: '/candidates',
    component: SearchCandidateListingPage,
  },
];

// Create a Loading component for Suspense fallback
const RouteLoading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader />
  </div>
);

export const renderRoutes = (routes: RouteType[]) => {
  return (
    <>
      {routes.map(
        ({
          name,
          path,
          component: Component,
          isPrivate = false,
          isPublic = false,
          isOpen = false,
          children,
        }) => {
          let element: React.ReactNode;
          const requiresAuth = isPrivate || !isPublic;

          if (isOpen) {
            // Truly public: no auth check, no redirect — accessible to everyone
            element = (
              <Suspense fallback={<RouteLoading />}>
                <Component />
              </Suspense>
            );
          } else if (isPublic) {
            element = (
              <PublicRoute>
                <Suspense fallback={<RouteLoading />}>
                  <Component />
                </Suspense>
              </PublicRoute>
            );
          } else if (requiresAuth) {
            const authenticatedElement = (
              // <MainLayout>
              <Suspense fallback={<RouteLoading />}>
                <Component />
              </Suspense>
              // </MainLayout>
            );

            element = <PrivateRoute>{authenticatedElement}</PrivateRoute>;
          } else {
            element = (
              <Suspense fallback={<RouteLoading />}>
                <Component />
              </Suspense>
            );
          }

          return (
            <Route key={name} path={path} element={element}>
              {children && children.length > 0 ? renderRoutes(children) : null}
            </Route>
          );
        }
      )}
    </>
  );
};
