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

const Dashboard = () => {
  const { role, tenantId, callerKind } = useSelector((state: RootState) => state.LoginSlice);
  const isPlatformCaller = callerKind === 'platform';

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
    if (isPlatformCaller) return;
    fetchInterviewData({
      year: interviewFilters.year,
      month: interviewFilters.month,
      isOwner: role?.type === 'owner' ? true : false,
    });
  }, [interviewFilters.year, interviewFilters.month, isPlatformCaller, role?.type]);

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
        content: <HiringOverviewSlide fillHeight />,
      }
    : {
        key: 'platform-overview',
        label: 'Platform Overview',
        icon: <MdOutlineInsights />,
        content: <PlatformOverviewSlide fillHeight />,
      };

  const slides: DashboardSlide[] = [
    overviewSlide,
    {
      key: 'cfp-company',
      label: 'CFP Company',
      icon: <BankOutlined />,
      content: <TenantsPreviewCard fillHeight />,
    },
    {
      key: 'interviews',
      label: 'Interviews',
      icon: <AuditOutlined />,
      content: (
        <InterviewDashboard
          interviewData={interviewData}
          filters={interviewFilters}
          isLoading={isLoading}
          handleFilterChange={handleFilterChange}
          isOwner={role?.type === 'owner' ? true : false}
          fillHeight
        />
      ),
    },
    ...(canViewRevenue
      ? [
          {
            key: 'revenue-generated',
            label: 'Revenue Generated',
            icon: <DollarOutlined />,
            content: <RevenueGenerated />,
          },
          {
            key: 'upcoming-revenue',
            label: 'Predicted Upcoming Revenue',
            icon: <RiseOutlined />,
            content: <UpcomingRevenue />,
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
