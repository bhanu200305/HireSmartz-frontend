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
import { formatEnumString } from '../../shared/utils/methods';
import { StatusFilters } from '../shared/ui/tableHeadbar';
import { PeekDeck, StatCardRow } from '../shared';
import type { PeekDeckPanel } from '../shared';
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

  const interviewBreakdown =
    interviewData?.interviewRounds && interviewData.interviewRounds.length > 0 ? (
      <div>
        {interviewData.interviewRounds.map((round, index) => (
          <span key={round?.roundType} className="text-xs font-medium text-neutral-500">
            {index > 0 && <span className="text-accent-400"> | </span>}
            {formatEnumString(round?.roundType)} - {round?.totalInterviews}
          </span>
        ))}
      </div>
    ) : undefined;

  const panels: PeekDeckPanel[] = [
    {
      key: 'company-interviews',
      label: 'Company & Interviews',
      content: (
        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0">
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
            />
          </div>
          <div className="min-w-0">
            <InterviewDashboard
              interviewData={interviewData}
              filters={interviewFilters}
              isLoading={isLoading}
              handleFilterChange={handleFilterChange}
              isOwner={role?.type === 'owner' ? true : false}
            />
          </div>
        </div>
      ),
    },
    ...(canViewRevenue
      ? [
          {
            key: 'revenue',
            label: 'Revenue',
            content: (
              <div className="grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <RevenueGenerated />
                </div>
                <div className="min-w-0">
                  <UpcomingRevenue />
                </div>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <MainLayout>
      <div className="w-full px-8 py-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900 tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {greeting}. Here&apos;s what&apos;s happening across careerforce pro today.
          </p>
        </div>

        <StatCardRow
          cards={[
            {
              icon: <BankOutlined />,
              label: (
                <>
                  Total Onboarded <br />
                  CFP Company
                </>
              ),
              value: dashboardData?.totalElements,
              variant: 'neutral',
              href: '/company',
            },
            {
              icon: <AuditOutlined />,
              label: (
                <>
                  Total Interviews
                  <br /> Conducted
                </>
              ),
              value: interviewData?.allInterviews?.totalInterviews,
              variant: 'orange',
              footer: interviewBreakdown,
            },
            ...(canViewRevenue
              ? [
                  {
                    icon: <DollarOutlined />,
                    label: (
                      <>
                        Revenue <br /> Generated
                      </>
                    ),
                    value: 'N/A',
                    variant: 'blue' as const,
                    href: '/finances',
                  },
                  {
                    icon: <RiseOutlined />,
                    label: 'Predicted Upcoming Revenue',
                    value: 'N/A',
                    variant: 'green' as const,
                    href: '/finances',
                  },
                ]
              : []),
          ]}
        />

        <PeekDeck panels={panels} />
      </div>
    </MainLayout>
  );
};

export default Dashboard;
