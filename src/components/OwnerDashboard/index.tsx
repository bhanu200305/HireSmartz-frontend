import MainLayout from '../../layouts/MainLayout';
import { useEffect, useReducer, useState } from 'react';
import recruiterImage from '../../assets/svgs/recruiter.svg';
import { CommonCard } from '../shared';
import hiringManagerImage from '../../assets/svgs/hiringManager.svg';
import InterviewClosureImage from '../../assets/svgs/interviewClosure.svg';
import jobPostingImage from '../../assets/svgs/jobPosting.svg';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { RootState } from '../../redux/provider/store';
import InterviewDashboard from '../Dashboard/InterviewDashboard';
import CustomerTable from '../Dashboard/CustomerTable';
import { hiringManagersHeaders } from '../../constants/hiringManager';
import { recruitersHeaders } from '../../constants/recruiters';
import { jobOpeningsHeaders } from '../../constants/jobOpenings';
import useFetchRoles from '../../hooks/useRoles';
import { useOwnerDashboardMutation } from '../../api/analytics-service/Dashboard/OwnerDashboard';
import {
  useInterviewSummaryDashboardMutation,
  useJobOpeningFilterQuery,
} from '../../api/job-service/Dashboard/JobOpening';
import { setJobOpeningFilters } from '../../redux/slices/jobOpeningFilterSlice';

import { setOrgUserFilters } from '../../redux/slices/OrgUserFilterSlice';
import { StatusFilters } from '../shared/ui/tableHeadbar';
import ActivityFeed from '../Dashboard/ActivityFeed';
const OwnerDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [localState, setLocalState] = useReducer(
    (prevState, newState) => ({ ...prevState, ...newState }),
    {
      recruiterData: [],
      hiringManagerData: [],
      jobOpeningsData: [],
      totalRecruiters: 0,
      totalHiringManagers: 0,
      totalJobOpenings: 0,
      closureRate: 0,
    }
  );

  const { jobOpeningFilters, role } = useSelector(
    (state: RootState) => ({
      jobOpeningFilters: state.JobOpeningFiltersSlice,
      role: state.LoginSlice.role,
    }),
    shallowEqual
  );
  const dispatch = useDispatch();
  const { roles, loading: rolesLoading } = useFetchRoles();
  const [OwnerDashboard] = useOwnerDashboardMutation();

  const recruiterRole = Array.isArray(roles?.data)
    ? roles.data.find((r) => r.roleName.toLowerCase() === 'recruiter')
    : undefined;
  const hiringManagerRole = Array.isArray(roles?.data)
    ? roles.data.find((r) => r.roleName.toLowerCase() === 'hiring manager')
    : undefined;

  const recruiterRoleId = recruiterRole?.id;
  const hiringManagerRoleId = hiringManagerRole?.id;

  // Fetch recruiter or hiring manager data
  const getDashboardData = async (roleId: number, key: string, countKey: string) => {
    if (!roleId) return;

    try {
      const res = await OwnerDashboard({
        page: 0,
        pageSize: 5,
        value: {
          roleTypeMappingId: roleId,
          status: true,
          isArchived: undefined,
          searchQuery: '',
        },
      }).unwrap();

      setLocalState({
        [key]: res.data,
        [countKey]: res.totalElements || 0,
      });
    } catch (err) {
      console.error(`Error fetching data for role ID ${roleId}:`, err);
    }
  };
  const handleViewAllRecruiters = () => {
    dispatch(
      setOrgUserFilters({
        roleTypeMappingId: recruiterRoleId,
        page: 0,
        size: 10,
      })
    );
    navigate('/organisation-users');
  };

  const handleViewAllHiringManagers = () => {
    dispatch(
      setOrgUserFilters({
        roleTypeMappingId: hiringManagerRoleId,
        page: 0,
        size: 10,
      })
    );
    navigate('/organisation-users');
  };
  const { data: jobOpeningsData, refetch: refetchJobOpenings } = useJobOpeningFilterQuery(
    {
      page: jobOpeningFilters.page || 0,
      pageSize: 5,
      value: {
        status: jobOpeningFilters.status,
        isDraft: jobOpeningFilters.isDraft,
        isClosed: jobOpeningFilters.isClosed,
        isAll: jobOpeningFilters.isAll,
      },
    },
    {
      refetchOnMountOrArgChange: true,
    }
  );
  const jobCount = jobOpeningsData?.totalElements || 0;
  const handleJobStatusChange = (filters: StatusFilters) => {
    dispatch(
      setJobOpeningFilters({
        ...filters,
        page: 0,
      })
    );
  };
  const handleViewAllJobs = () => {
    dispatch(
      setJobOpeningFilters({
        status: undefined,
        isDraft: undefined,
        isClosed: undefined,
        isAll: true,
        page: 0,
        size: 10,
      })
    );
    navigate('/jobs');
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

  useEffect(() => {
    if (
      (role?.name === 'Super Admin' || role?.name === 'Admin') &&
      recruiterRoleId &&
      hiringManagerRoleId
    ) {
      getDashboardData(recruiterRoleId, 'recruiterData', 'totalRecruiters');
      getDashboardData(hiringManagerRoleId, 'hiringManagerData', 'totalHiringManagers');
    }
  }, [role, status, recruiterRoleId, hiringManagerRoleId]);

  return (
    <MainLayout>
      <div className="w-full p-8 justify-start pt-16">
        {/* Top 4 cards */}
        <div className="mt-6 grid grid-cols-4 gap-x-4">
          {(role.name === 'Super Admin' || role.name === 'Admin') && (
            <>
              <CommonCard className="!bg-[#EBF0ED]">
                <div className="relative">
                  <div className="absolute -top-12 left-0 w-16 h-16 flex items-center justify-center">
                    <img src={recruiterImage} />
                  </div>
                  <div className="pt-4 flex justify-between items-start">
                    <div>
                      <h3 className="text-lg">
                        Total Recruiters <br /> Onboarded
                      </h3>
                    </div>
                    <div className="cursor-pointer" onClick={handleViewAllRecruiters}>
                      <p className="hover:underline hover:opacity-50 text-lg text-black font-bold">
                        {localState.totalRecruiters}
                      </p>
                    </div>
                  </div>
                </div>
              </CommonCard>

              <CommonCard className="!bg-amber-50">
                <div className="relative">
                  <div className="absolute -top-12 left-0 w-16 h-16 flex items-center justify-center">
                    <img src={hiringManagerImage} />
                  </div>
                  <div className="pt-4 flex justify-between items-start">
                    <div>
                      <h3 className="text-lg">
                        Total Hiring <br /> Manager Onboarded
                      </h3>
                    </div>
                    <div className="cursor-pointer" onClick={handleViewAllHiringManagers}>
                      <p className="text-lg text-[#F58220] font-bold hover:underline hover:opacity-50">
                        {localState.totalHiringManagers}
                      </p>
                    </div>
                  </div>
                </div>
              </CommonCard>

              {/* <CommonCard className="!bg-blue-100">
            <div className="relative">
              <div className="absolute -top-12 left-0 w-16 h-16 flex items-center justify-center">
                <img src={InterviewClosureImage} />
              </div>
              <div className="pt-6 flex justify-between items-center">
                <div className="mt-2">
                  <h3 className="text-lg">
                    Total Interviews & <br /> Closure Rate
                  </h3>
                </div>
                <div className="flex flex-row items-center">
                  <p className="text-3xl text-[#6495EC] font-bold">
                    {interviewData?.allInterviews?.totalInterviews ?? 'N/A'}/
                    {interviewData?.allInterviews?.closureRate.toFixed(2) ?? 'N/A'}%
                  </p>
                </div>
              </div>
            </div>
          </CommonCard> */}
              <CommonCard className="!bg-blue-100">
                <div className="relative">
                  <div className="absolute -top-12 left-0 w-16 h-16 flex items-center justify-center">
                    <img src={InterviewClosureImage} />
                  </div>
                  <div className="pt-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg">Total Interviews</h3>
                      </div>
                      <div>
                        <p className="text-lg text-[#6495EC] font-bold">
                          {interviewData?.allInterviews?.totalInterviews ?? 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg">Closure Rate</h3>
                      </div>
                      <div>
                        <p className="text-lg text-[#6495EC] font-bold">
                          {interviewData?.allInterviews?.closureRate
                            ? `${interviewData.allInterviews.closureRate.toFixed(2)}%`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CommonCard>

              <CommonCard className="!bg-green-100">
                <div className="relative">
                  <div className="absolute -top-12 left-0 w-16 h-16 flex items-center justify-center">
                    <img src={jobPostingImage} />
                  </div>
                  <div className="pt-4 flex justify-between items-start">
                    <div>
                      <h3 className="text-lg">
                        Total Job <br /> Postings
                      </h3>
                    </div>
                    <div
                      className="flex flex-row items-center cursor-pointer"
                      onClick={() => navigate('/jobs')}
                    >
                      <p className="text-lg text-[#2B934E] font-bold hover:underline hover:opacity-50">
                        {jobOpeningsData?.totalElements}
                      </p>
                    </div>
                  </div>
                </div>
              </CommonCard>
            </>
          )}
        </div>

        {role.name !== 'User' && (
          <div className="mt-6 grid gap-x-4">
            <ActivityFeed />
          </div>
        )}

        {/* Recruiters & Hiring Managers */}
        {(role.name === 'Super Admin' || role.name === 'Admin') && (
          <div className="mt-6 grid grid-cols-2 gap-x-4">
            <CustomerTable
              headers={recruitersHeaders}
              title="Recruiters"
              data={localState.recruiterData}
              role={role.type}
              icon={recruiterImage}
              getData={() => getDashboardData(recruiterRoleId, 'recruiterData', 'totalRecruiters')}
              count={localState.totalRecruiters < 5 ? localState.totalRecruiters : 5}
              onViewAll={handleViewAllRecruiters}
              onTitleClick={handleViewAllRecruiters}
              onIconClick={handleViewAllRecruiters}
            />
            <CustomerTable
              headers={hiringManagersHeaders}
              title="Hiring Managers"
              data={localState.hiringManagerData}
              role={role.type}
              icon={hiringManagerImage}
              getData={() =>
                getDashboardData(hiringManagerRoleId, 'hiringManagerData', 'totalHiringManagers')
              }
              count={localState.totalHiringManagers < 5 ? localState.totalHiringManagers : 5}
              onViewAll={handleViewAllHiringManagers}
              onTitleClick={handleViewAllHiringManagers}
              onIconClick={handleViewAllHiringManagers}
            />
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-x-4">
          <InterviewDashboard
            interviewData={interviewData}
            filters={interviewFilters}
            isLoading={isLoading}
            handleFilterChange={handleFilterChange}
            isOwner={role?.type === 'owner' ? true : false}
          />
          <CustomerTable
            headers={jobOpeningsHeaders}
            title="Job Openings"
            data={jobOpeningsData?.data || []}
            role={role.type}
            icon={jobPostingImage}
            onStatusChange={handleJobStatusChange}
            currentFilters={jobOpeningFilters}
            count={jobCount < 5 ? jobCount : 5}
            onViewAll={handleViewAllJobs}
            onTitleClick={() => navigate('/jobs')}
            onIconClick={() => navigate('/jobs')}
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default OwnerDashboard;
