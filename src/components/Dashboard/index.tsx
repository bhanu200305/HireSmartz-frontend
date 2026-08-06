import { useEffect, useState, ReactNode } from 'react';
import MainLayout from '../../layouts/MainLayout';
import customerImage from '../../assets/svgs/customers.svg';
import interviewsImage from '../../assets/svgs/interviews.svg';
import revenueGeneratedImage from '../../assets/svgs/revenueGenerated.svg';
import upcomingRevenueImage from '../../assets/svgs/upcomingRevenue.svg';
import { cfpCustomersHeaders } from '../../constants/dashboardConstants';
import { Link, useNavigate } from 'react-router-dom';
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

// Presentational-only KPI tile shared by the four Dashboard summary cards.
// Keeps the existing circular badge icon assets, just gives every card a
// consistent white/bordered surface and a value color drawn from the
// CareerForce Pro brand tokens (see DESIGN_SYSTEM.md) instead of one-off
// pastel backgrounds/hex values per card.
const KpiCard = ({
  icon,
  label,
  value,
  href,
  accent,
  extra,
}: {
  icon: string;
  label: ReactNode;
  value: ReactNode;
  href?: string;
  accent: string;
  extra?: ReactNode;
}) => {
  const valueNode = (
    <p className="heading-font text-2xl font-bold" style={{ color: accent }}>
      {value}
    </p>
  );

  return (
    <div
      className="relative bg-white rounded-xl p-5 pt-10 border flex flex-col gap-2"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="absolute -top-6 left-5 w-14 h-14 flex items-center justify-center">
        <img src={icon} alt="" className="w-full h-full" />
      </div>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm text-gray-600 heading-font leading-snug">{label}</h3>
        {href ? (
          <Link to={href} className="hover:opacity-70 transition-opacity">
            {valueNode}
          </Link>
        ) : (
          valueNode
        )}
      </div>
      {extra}
    </div>
  );
};

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

  return (
    <MainLayout>
      <div className="w-full px-7 py-6 space-y-5">
        <div className="grid grid-cols-4 gap-4">
          <KpiCard
            icon={customerImage}
            label={
              <>
                Total Onboarded <br />
                CFP Company
              </>
            }
            value={dashboardData?.totalElements}
            href="/company"
            accent="#263d92"
          />

          <KpiCard
            icon={interviewsImage}
            label={
              <>
                Total Interviews
                <br /> Conducted
              </>
            }
            value={interviewData?.allInterviews?.totalInterviews ?? 'N/A'}
            accent="#11b7dd"
            extra={
              interviewData?.interviewRounds && interviewData.interviewRounds.length > 0 ? (
                <div>
                  {interviewData.interviewRounds.map((round, index) => (
                    <span key={round?.roundType} className="text-xs font-medium text-gray-500">
                      {index > 0 && <span className="text-[#11b7dd]"> | </span>}
                      {formatEnumString(round?.roundType)} - {round?.totalInterviews}
                    </span>
                  ))}
                </div>
              ) : undefined
            }
          />

          {role.name === 'Admin' || role.name === 'User' ? null : (
            <>
              <KpiCard
                icon={revenueGeneratedImage}
                label={
                  <>
                    Revenue <br /> Generated
                  </>
                }
                value="N/A"
                href="/finances"
                accent="#059669"
              />

              <KpiCard
                icon={upcomingRevenueImage}
                label="Predicted Upcoming Revenue"
                value="N/A"
                href="/finances"
                accent="#263d92"
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
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
          <InterviewDashboard
            interviewData={interviewData}
            filters={interviewFilters}
            isLoading={isLoading}
            handleFilterChange={handleFilterChange}
            isOwner={role?.type === 'owner' ? true : false}
          />
        </div>

        {role.name === 'Admin' || role?.name === 'User' ? null : (
          <div className="grid grid-cols-2 gap-4">
            <RevenueGenerated />
            <UpcomingRevenue />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Dashboard;
