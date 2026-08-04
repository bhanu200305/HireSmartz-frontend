import { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import customerImage from '../../assets/svgs/customers.svg';
import { CommonCard } from '../shared';
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

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const filters = useSelector((state: RootState) => state.cfpDashboardFiltersSlice);
  const { role } = useSelector((state: RootState) => state.LoginSlice);
  const { roles, loading: rolesLoading } = useFetchRoles();

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
      <div className="w-full p-8 justify-start pt-16">
        <div className="mt-6 grid grid-cols-4 gap-x-4">
          <CommonCard className="!bg-[#EBF0ED]">
            <div className="relative">
              <div className="absolute -top-12 left-0 w-16 h-16 flex items-center justify-center">
                <img src={customerImage} />
              </div>
              <div className="pt-4 flex justify-between items-start">
                <div>
                  <h3 className="text-lg">
                    Total Onboarded <br />
                    CFP Company
                  </h3>
                </div>
                <div>
                  <Link to="/company" className="text-3xl ">
                    <p className="hover:underline hover:opacity-50 text-lg text-black font-bold">
                      {dashboardData?.totalElements}
                    </p>
                  </Link>
                </div>
              </div>
            </div>
          </CommonCard>

          <CommonCard className="!bg-amber-50">
            <div className="relative">
              <div className="absolute -top-12 left-0 w-16 h-16 flex items-center justify-center">
                <img src={interviewsImage} />
              </div>
              <div className="pt-4 flex justify-between items-start">
                <div>
                  <h3 className="text-lg">
                    Total Interviews
                    <br /> Conducted
                  </h3>
                </div>
                <p className="text-lg text-[#F58220] font-bold">
                  {interviewData?.allInterviews?.totalInterviews ?? 'N/A'}
                </p>
              </div>
              <div>
                {interviewData?.interviewRounds?.map((round, index) => (
                  <span key={round?.roundType} className="text-xs font-medium text-gray-700">
                    {index > 0 && <span className="text-[#F58220]"> | </span>}
                    {formatEnumString(round?.roundType)} - {round?.totalInterviews}
                  </span>
                ))}
              </div>
            </div>
          </CommonCard>

          {role.name === 'Admin' || role.name === 'User' ? null : (
            <>
              <CommonCard className="!bg-green-100">
                <div className="relative">
                  <div className="absolute -top-12 left-0 w-16 h-16 flex items-center justify-center">
                    <img src={revenueGeneratedImage} />
                  </div>
                  <div className="pt-4 flex justify-between items-start">
                    <div>
                      <h3 className="text-lg">
                        Revenue <br /> Generated
                      </h3>
                    </div>
                    <div>
                      <Link to="/finances" className="text-3xl ">
                        <p className="hover:underline hover:opacity-70 text-lg text-[#2B934E] font-bold">
                          N/A
                        </p>
                      </Link>
                    </div>
                  </div>
                </div>
              </CommonCard>

              <CommonCard className="!bg-blue-100">
                <div className="relative">
                  <div className="absolute -top-12 left-0 w-16 h-16 flex items-center justify-center">
                    <img src={upcomingRevenueImage} />
                  </div>
                  <div className="pt-4 flex justify-between items-start">
                    <div>
                      <h3 className="text-lg">Predicted Upcoming Revenue</h3>
                    </div>
                    <div>
                      <Link to="/finances" className="text-3xl ">
                        <p className="hover:underline hover:opacity-70 text-lg text-[#6495EC] font-bold">
                          N/A
                        </p>
                      </Link>
                      {/* <p className="text-3xl text-[#6495EC] font-bold">$900K</p> */}
                    </div>
                  </div>
                </div>
              </CommonCard>
            </>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-4">
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
          <div className="mt-6 grid grid-cols-2 gap-x-4">
            <RevenueGenerated />
            <UpcomingRevenue />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Dashboard;
