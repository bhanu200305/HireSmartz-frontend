import { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import InterviewDashboard from './InterviewDashboard';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/provider/store';
import RevenueGenerated from './RevenueGenerated';
import UpcomingRevenue from './UpcomingRevenue';
import { useInterviewSummaryDashboardMutation } from '../../api/job-service/Dashboard/JobOpening';
import DashboardCarousel, { DashboardSlide } from './DashboardCarousel';
import { BankOutlined, AuditOutlined, DollarOutlined, RiseOutlined } from '@ant-design/icons';
import { MdOutlineInsights } from 'react-icons/md';
import PlatformOverviewSlide from './PlatformOverviewSlide';
import HiringOverviewSlide from './HiringOverviewSlide';
import TenantsPreviewCard from './TenantsPreviewCard';
import WidgetErrorBoundary from '../shared/ui/WidgetErrorBoundary';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';

const Dashboard = () => {
  const { role, tenantId, callerKind } = useSelector((state: RootState) => state.LoginSlice);
  const isPlatformCaller = callerKind === 'platform';
  // Resolved against whichever location is currently active (see
  // useEffectivePermissions) — a role's location override can drop
  // interview:read at one office while keeping it everywhere else, so this
  // is re-checked on every location switch, not just once at login.
  const canViewInterviews = useHasAccess(Authorities.INTERVIEW_QUESTIONS_VIEW);

  // Interview Dashboard
  const [fetchInterviewData, { data: interviewData, isLoading }] =
    useInterviewSummaryDashboardMutation();
  const date = new Date();
  const [interviewFilters, setInterviewFilters] = useState({
    month: date.getMonth() + 1,
    year: date.getFullYear(),
    roundType: null,
  });

  const handleFilterChange = (field: 'month' | 'year' | 'roundType', value: number | string) => {
    const updatedFilters = {
      ...interviewFilters,
      [field]: value,
    };
    setInterviewFilters(updatedFilters);
  };

  useEffect(() => {
    if (isPlatformCaller || !canViewInterviews) return;
    fetchInterviewData({
      year: interviewFilters.year,
      month: interviewFilters.month,
      isOwner: role?.type === 'owner' ? true : false,
    });
  }, [interviewFilters.year, interviewFilters.month, isPlatformCaller, canViewInterviews, role?.type]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const canViewRevenue = role.name !== 'Admin' && role.name !== 'User';

  // A no-tenant caller is platform staff (Super Admin/internal) — same test
  // `CustomerPage`/`CompanyMetrics` already use to tell the two apart. Each
  // sees their own top-line KPI slide first, before the existing
  // CFP-company/interview/revenue slides.
  const overviewSlide: DashboardSlide = tenantId
    ? {
        key: 'hiring-overview',
        label: 'Hiring Overview',
        icon: <MdOutlineInsights />,
        content: (
          <WidgetErrorBoundary label="Hiring Overview">
            <HiringOverviewSlide fillHeight />
          </WidgetErrorBoundary>
        ),
      }
    : {
        key: 'platform-overview',
        label: 'Platform Overview',
        icon: <MdOutlineInsights />,
        content: (
          <WidgetErrorBoundary label="Platform Overview">
            <PlatformOverviewSlide fillHeight />
          </WidgetErrorBoundary>
        ),
      };

  // Each slide gets its OWN WidgetErrorBoundary — the whole point of the
  // isolation is per-widget, not one boundary around the carousel as a
  // whole. A single shared boundary would still let one broken slide take
  // out every OTHER slide along with it, since React unmounts everything
  // under the nearest boundary above the crash, not just the offending node.
  const slides: DashboardSlide[] = [
    overviewSlide,
    // "CFP Company" lists every tenant on the platform (GET
    // /v1/platform/tenants) — Super Admin's own view, per
    // TenantsPreviewCard's own docstring. It was previously shown to every
    // caller regardless of `isPlatformCaller`, so an ordinary tenant user
    // (Recruiter, Hiring Manager, ...) got a slide calling a platform-only
    // endpoint they have no permission for.
    ...(isPlatformCaller
      ? [
          {
            key: 'cfp-company',
            label: 'CFP Company',
            icon: <BankOutlined />,
            content: (
              <WidgetErrorBoundary label="CFP Company">
                <TenantsPreviewCard fillHeight />
              </WidgetErrorBoundary>
            ),
          },
        ]
      : []),
    ...(canViewInterviews
      ? [
          {
            key: 'interviews',
            label: 'Interviews',
            icon: <AuditOutlined />,
            content: (
              <WidgetErrorBoundary label="Interviews">
                <InterviewDashboard
                  interviewData={interviewData}
                  filters={interviewFilters}
                  isLoading={isLoading}
                  handleFilterChange={handleFilterChange}
                  isOwner={role?.type === 'owner' ? true : false}
                  fillHeight
                />
              </WidgetErrorBoundary>
            ),
          },
        ]
      : []),
    ...(canViewRevenue
      ? [
          {
            key: 'revenue-generated',
            label: 'Revenue Generated',
            icon: <DollarOutlined />,
            content: (
              <WidgetErrorBoundary label="Revenue Generated">
                <RevenueGenerated />
              </WidgetErrorBoundary>
            ),
          },
          {
            key: 'upcoming-revenue',
            label: 'Predicted Upcoming Revenue',
            icon: <RiseOutlined />,
            content: (
              <WidgetErrorBoundary label="Predicted Upcoming Revenue">
                <UpcomingRevenue />
              </WidgetErrorBoundary>
            ),
          },
        ]
      : []),
  ];

  return (
    <MainLayout fullHeight>
      <div className="flex h-full min-h-0 w-full flex-col px-5 py-4 sm:px-8 sm:py-5">
        <div className="mb-3 shrink-0 sm:mb-4">
          <h1 className="font-display text-xl font-bold text-neutral-900 tracking-tight sm:text-2xl">
            Dashboard
          </h1>
          <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
            {greeting}. Here&apos;s what&apos;s happening across careerforce pro today.
          </p>
        </div>

        <div className="min-h-0 flex-1">
          <DashboardCarousel slides={slides} />
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
