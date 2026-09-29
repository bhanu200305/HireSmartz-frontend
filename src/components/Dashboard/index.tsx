import MainLayout from '../../layouts/MainLayout';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/provider/store';
import RevenueGenerated from './RevenueGenerated';
import UpcomingRevenue from './UpcomingRevenue';
import DashboardCarousel, { DashboardSlide } from './DashboardCarousel';
import { BankOutlined, DollarOutlined, RiseOutlined } from '@ant-design/icons';
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
  // Same authority the Platform Metrics/Audit Log/Book a Demo Leads nav
  // items already gate on (menuItem.tsx) — this slide calls the exact same
  // GET /v1/platform/metrics/* routes those pages do, so a caller who can't
  // see those pages shouldn't see this slide either. Previously shown to
  // EVERY platform caller unconditionally, which is what made it always
  // read "Not enough data yet" for cfp_admin/cfp_support (a real 403, not
  // actually missing data) rather than a permission problem.
  const canViewPlatformOverview = useHasAccess(Authorities.PLATFORM_VIEW);

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
  // CFP-company/revenue slides. A platform caller without PLATFORM_VIEW
  // (cfp_admin/cfp_support) gets neither — there's no tenant-scoped hiring
  // data for them to show instead, so the slide is dropped from the
  // carousel entirely rather than rendered to always show a permission
  // error.
  const overviewSlide: DashboardSlide | null = tenantId
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
    : canViewPlatformOverview
      ? {
          key: 'platform-overview',
          label: 'Platform Overview',
          icon: <MdOutlineInsights />,
          content: (
            <WidgetErrorBoundary label="Platform Overview">
              <PlatformOverviewSlide fillHeight />
            </WidgetErrorBoundary>
          ),
        }
      : null;

  // Each slide gets its OWN WidgetErrorBoundary — the whole point of the
  // isolation is per-widget, not one boundary around the carousel as a
  // whole. A single shared boundary would still let one broken slide take
  // out every OTHER slide along with it, since React unmounts everything
  // under the nearest boundary above the crash, not just the offending node.
  const slides: DashboardSlide[] = [
    ...(overviewSlide ? [overviewSlide] : []),
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
            {greeting}. Here&apos;s what&apos;s happening across Careerforce Pro today.
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
