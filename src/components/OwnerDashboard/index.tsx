import MainLayout from '../../layouts/MainLayout';
import { useEffect, useReducer, useState } from 'react';
import recruiterImage from '../../assets/svgs/recruiter.svg';
import { PeekDeck, StatCardRow } from '../shared';
import type { PeekDeckPanel } from '../shared';
import hiringManagerImage from '../../assets/svgs/hiringManager.svg';
import jobPostingImage from '../../assets/svgs/jobPosting.svg';
import { useNavigate } from 'react-router-dom';
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
import { TeamOutlined, UserOutlined, AuditOutlined, SolutionOutlined } from '@ant-design/icons';
const OwnerDashboard = () => {
  const navigate = useNavigate();
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
  const { roles } = useFetchRoles();
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
  const { data: jobOpeningsData } = useJobOpeningFilterQuery(
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

  const canViewOrgStats = role.name === 'Super Admin' || role.name === 'Admin';
  const canViewActivity = role.name !== 'User';

  const interviewsAndClosure =
    interviewData?.allInterviews?.totalInterviews != null &&
    interviewData?.allInterviews?.closureRate != null
      ? `${interviewData.allInterviews.totalInterviews} / ${interviewData.allInterviews.closureRate.toFixed(2)}%`
      : undefined;

  const panels: PeekDeckPanel[] = [
    ...(canViewOrgStats
      ? [
          {
            key: 'team',
            label: 'Team',
            content: (
              <div className="grid grid-cols-2 gap-4">
                <CustomerTable
                  headers={recruitersHeaders}
                  title="Recruiters"
                  data={localState.recruiterData}
                  role={role.type}
                  icon={recruiterImage}
                  getData={() =>
                    getDashboardData(recruiterRoleId, 'recruiterData', 'totalRecruiters')
                  }
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
                    getDashboardData(
                      hiringManagerRoleId,
                      'hiringManagerData',
                      'totalHiringManagers'
                    )
                  }
                  count={localState.totalHiringManagers < 5 ? localState.totalHiringManagers : 5}
                  onViewAll={handleViewAllHiringManagers}
                  onTitleClick={handleViewAllHiringManagers}
                  onIconClick={handleViewAllHiringManagers}
                />
              </div>
            ),
          },
        ]
      : []),
    ...(canViewActivity
      ? [
          {
            key: 'activity',
            label: 'Activity Feed — Latest Updates',
            content: <ActivityFeed />,
          },
        ]
      : []),
    {
      key: 'pipeline',
      label: 'Pipeline',
      content: (
        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <InterviewDashboard
              interviewData={interviewData}
              filters={interviewFilters}
              isLoading={isLoading}
              handleFilterChange={handleFilterChange}
              isOwner={role?.type === 'owner' ? true : false}
            />
          </div>
          <div className="min-w-0">
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
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="w-full px-7 py-6 space-y-6">
        {canViewOrgStats && (
          <StatCardRow
            cards={[
              {
                icon: <TeamOutlined />,
                label: (
                  <>
                    Total Recruiters <br /> Onboarded
                  </>
                ),
                value: localState.totalRecruiters,
                variant: 'neutral',
                onClick: handleViewAllRecruiters,
              },
              {
                icon: <UserOutlined />,
                label: (
                  <>
                    Total Hiring <br /> Manager Onboarded
                  </>
                ),
                value: localState.totalHiringManagers,
                variant: 'orange',
                onClick: handleViewAllHiringManagers,
              },
              {
                icon: <AuditOutlined />,
                label: (
                  <>
                    Total Interviews & <br /> Closure Rate
                  </>
                ),
                value: interviewsAndClosure,
                variant: 'blue',
              },
              {
                icon: <SolutionOutlined />,
                label: (
                  <>
                    Total Job <br /> Postings
                  </>
                ),
                value: jobOpeningsData?.totalElements,
                variant: 'green',
                href: '/jobs',
              },
            ]}
          />
        )}

        {panels.length > 1 ? <PeekDeck panels={panels} /> : panels[0]?.content}
      </div>
    </MainLayout>
  );
};

export default OwnerDashboard;
