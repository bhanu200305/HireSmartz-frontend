import { Suspense, lazy } from 'react';
import type { Route as RouteType } from './types';
import { Outlet, Route } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import PublicRoute from './components/PublicRoute';
import { Loader } from './components/shared/ui/loader';
import { LogOutPage } from './pages';
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
const AddNewQuestionPage = lazyImport(() => import('./pages/AIQuestions'), 'AddNewQuestionPage');
const AddOrganisationUserPage = lazyImport(
  () => import('./pages/AddOrganisationUserPage'),
  'AddOrganisationUserPage'
);
const AiQuestionsPage = lazyImport(() => import('./pages/AIQuestions'), 'AiQuestionsPage');
const AIQuestionsSetupPage = lazyImport(
  () => import('./pages/AIQuestions'),
  'AIQuestionsSetupPage'
);
const VideoInterviewQuestionsPage = lazyImport(
  () => import('./pages/VideoInterviewQuestionPage'),
  'VideoInterviewQuestionsPage'
);
const VideoInterviewQuestionsSetupPage = lazyImport(
  () => import('./pages/VideoInterviewQuestionPage'),
  'VideoInterviewQuestionsSetupPage'
);
const ConfrimNewJDModalPage = lazy(() => import('./pages/ConfirmNewJDModal'));
const CustomersPage = lazy(() => import('./pages/CustomerPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const BookDemoPage = lazy(() => import('./pages/BookDemoPage'));
const EditAiJobDescriptionPage = lazy(() => import('./pages/EditAiJobDescriptionPage'));
const EditAiQuestionPage = lazyImport(() => import('./pages/AIQuestions'), 'EditAiQuestionPage');
const EditDetailedInterviewRoundPage = lazy(() => import('./pages/EditDetailedInterviewPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const SecuritySettingsPage = lazy(() => import('./pages/SecuritySettingsPage'));
const NotificationSettingsPage = lazy(() => import('./pages/NotificationSettingsPage'));
const AdminToolsPage = lazy(() => import('./pages/AdminToolsPage'));
const AcceptInvitationPage = lazy(() => import('./pages/AcceptInvitationPage'));
const ActivityFeedPage = lazy(() => import('./pages/ActivityFeedPage'));
const JobsOpeningPage = lazyImport(() => import('./pages/JobsOpening'), 'JobsOpeningPage');
const LoginPage = lazy(() => import('./pages/LoginPage'));
const OrganisationUserPage = lazy(() => import('./pages/OrganisationUserPage'));
const RolesPage = lazy(() => import('./pages/RolesPage'));
const SyncAtsPage = lazyImport(() => import('./pages/JobsOpening'), 'SyncAtsPage');
const JobConfigurationPage = lazyImport(
  () => import('./pages/JobsOpening'),
  'JobConfigurationPage'
);
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
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const EditInterviewRoundPage = lazy(() => import('./pages/EditInterviewRoundPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const InterviewLiveKit = lazy(() => import('./components/Interview/InterviewLiveKit'));
const MyCompanyPage = lazy(() => import('./pages/MyCompanyPage'));
const CompanyMetricsPage = lazy(() => import('./pages/CompanyMetricsPage'));
const CompanySettingsPage = lazy(() => import('./pages/CompanySettingsPage'));
const PlatformAuditPage = lazy(() => import('./pages/PlatformAuditPage'));
const PlatformMetricsPage = lazy(() => import('./pages/PlatformMetricsPage'));
const GuestOrganizationsPage = lazy(() => import('./pages/GuestOrganizationsPage'));
const CalendarSettingsPage = lazy(() => import('./pages/CalendarSettingsPage'));
const ScheduleCalendarPage = lazy(() => import('./pages/ScheduleCalendarPage'));
const AiCallSchedulePage = lazy(() => import('./pages/AiCallSchedulePage'));
const JobScoringCriteriaPage = lazy(() => import('./pages/JobScoringCriteriaPage'));
const PublicJobListingPage = lazy(() => import('./pages/PublicJobListingPage'));
const PublicJobDetailPage = lazy(() => import('./pages/PublicJobDetailPage'));
const PublicJobApplyPage = lazy(() => import('./pages/PublicJobApplyPage'));
const PublicJobSuccessPage = lazy(() => import('./pages/PublicJobSuccessPage'));
const PublicInterviewConsentPage = lazy(() => import('./pages/PublicInterviewConsentPage'));

// Lazy load components
const JobDetails = lazy(() => import('./components/JobsOpening/AddJobDescription/jobdetails'));
const JobDescription = lazy(
  () => import('./components/JobsOpening/AddJobDescription/JobDescription')
);
const AiQuestionsSetup = lazy(
  () => import('./components/JobsOpening/AddJobDescription/AiQuestionsSetup')
);
const VideoQuestionsSetup = lazy(
  () => import('./components/JobsOpening/AddJobDescription/VideoQuestionsSetup')
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
    name: 'SecuritySettings',
    path: '/settings/security',
    component: SecuritySettingsPage,
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
    name: 'PublicJobListing',
    path: '/public/q/:qrCode',
    component: PublicJobListingPage,
    isOpen: true,
  },
  {
    name: 'PublicJobDetail',
    path: '/public/q/:qrCode/jobs/:jobId',
    component: PublicJobDetailPage,
    isOpen: true,
  },
  {
    name: 'PublicJobApply',
    path: '/public/q/:qrCode/jobs/:jobId/apply',
    component: PublicJobApplyPage,
    isOpen: true,
  },
  {
    name: 'PublicJobSuccess',
    path: '/public/q/:qrCode/jobs/:jobId/success',
    component: PublicJobSuccessPage,
    isOpen: true,
  },
  {
    name: 'PublicInterviewConsent',
    path: '/public/interview/consent',
    component: PublicInterviewConsentPage,
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
        component: JobDescription,
        name: 'JobDescription',
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
    name: 'VideoQuestionsSetup',
    path: '/video-questions',
    component: JobsOpening,
    children: [
      {
        path: '',
        component: VideoQuestionsSetup,
        name: 'VideoQuestionsSetup',
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
        name: 'videoInterviewQuestions',
        path: 'video-interview-questions',
        component: VideoInterviewQuestionsPage,
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
        name: 'editJobDescription',
        path: 'description',
        component: EditJobDetail,
        children: [
          {
            name: 'confirmNewJD',
            path: 'confirm-new-jd',
            component: ConfrimNewJDModalPage,
          },
        ],
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
            path: 'edit-interview-round/:id',
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
        name: 'editVideoQuestions',
        path: 'editVideoQuestions',
        component: VideoInterviewQuestionsSetupPage,
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
    name: 'AiCallBooking',
    path: '/ai-call-booking',
    component: AiCallBookingPage,
  },
  {
    name: 'jobFieldsConfiguration',
    path: '/job-fields-configuration',
    component: JobConfigurationPage,
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
