import { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import customerImage from '../../assets/svgs/customers.svg';
import { cfpCustomersHeaders } from '../../constants/dashboardConstants';
import { useNavigate } from 'react-router-dom';
import CustomerTable from './CustomerTable';
import InterviewDashboard from './InterviewDashboard';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/provider/store';
import RevenueGenerated from './RevenueGenerated';
import UpcomingRevenue from './UpcomingRevenue';
import useFetchRoles from '../../hooks/useRoles';
import { useCFPDashboardQuery } from '../../api/analytics-service/Dashboard/CFPDashboard';

import { setcfpDashboardFilters } from '../../redux/slices/CFPDashboardFilterSlice';
import { useInterviewSummaryDashboardMutation } from '../../api/job-service/Dashboard/JobOpening';
import { StatusFilters } from '../shared/ui/tableHeadbar';
import DashboardCarousel, { DashboardSlide } from './DashboardCarousel';
import { BankOutlined, AuditOutlined, DollarOutlined, RiseOutlined } from '@ant-design/icons';

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const filters = useSelector((state: RootState) => state.cfpDashboardFiltersSlice);
  const { role } = useSelector((state: RootState) => state.LoginSlice);
  const { roles } = useFetchRoles();

  const matchedRole = (roles as any)?.data?.find(
    (r: any) => r.roleName.toLowerCase() === role?.name?.toLowerCase()
  );

  const { data: dashboardData } = useCFPDashboardQuery(
    {
      page: filters.page,
      pageSize: filters.size,
      value: {
        roleTypeMappingId: matchedRole?.id || 0,
        searchQuery: filters.searchQuery,
        status: filters.status,
        isArchived: filters.isArchived,
        startDateTime: filters.startDateTime,
        endDateTime: filters.endDateTime,
      },
    },
    { skip: !matchedRole?.id, refetchOnMountOrArgChange: true }
  );
  const cfpuserCount = dashboardData?.totalElements || 0;

  const handleStatusChange = (filters: StatusFilters) => {
    dispatch(
      setcfpDashboardFilters({
        ...filters,
        status: filters.status,
        page: 0,
      })
    );
  };

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
    fetchInterviewData({
      year: interviewFilters.year,
      month: interviewFilters.month,
      isOwner: role?.type === 'owner' ? true : false,
    });
  }, [interviewFilters.year, interviewFilters.month]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const canViewRevenue = role.name !== 'Admin' && role.name !== 'User';

  const slides: DashboardSlide[] = [
    {
      key: 'cfp-company',
      label: 'CFP Company',
      icon: <BankOutlined />,
      content: (
        <CustomerTable
          headers={cfpCustomersHeaders}
          title="CFP Company"
          role={role.type}
          data={dashboardData}
          icon={customerImage}
          onStatusChange={handleStatusChange}
          count={cfpuserCount < 5 ? cfpuserCount : 5}
          onViewAll={() => navigate('/company')}
          onTitleClick={() => navigate('/company')}
          onIconClick={() => navigate('/company')}
          fillHeight
        />
      ),
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
