import MainLayout from '../../layouts/MainLayout';
import { useEffect, useReducer, useState } from 'react';
import recruiterImage from '../../assets/svgs/recruiter.svg';
import hiringManagerImage from '../../assets/svgs/hiringManager.svg';
import jobPostingImage from '../../assets/svgs/jobPosting.svg';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { RootState } from '../../redux/provider/store';
import InterviewDashboard from '../Dashboard/InterviewDashboard';
import CustomerTable from '../Dashboard/CustomerTable';
import DashboardCarousel, { DashboardSlide } from '../Dashboard/DashboardCarousel';
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
import { LuSquareActivity } from 'react-icons/lu';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';
import { MdOutlineInsights } from 'react-icons/md';
import HiringOverviewSlide from '../Dashboard/HiringOverviewSlide';

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

  // Location-resolved via useEffectivePermissions — a widget backed by a
  // permission this user doesn't hold at their active location disappears
  // on switch, rather than every widget always showing regardless of role
  // or location the way the old role.name checks did.
  const canViewOrgStats = useHasAccess(Authorities.USER_VIEW);
  const canViewActivity = useHasAccess(Authorities.ACTIVITY_FEED);
  const canViewJobOpenings = useHasAccess(Authorities.JOB_OPENING_VIEW);
  const canViewInterviews = useHasAccess(Authorities.CANDIDATE_VIEW);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  // Job openings, applications and interviews together — shown to anyone
  // who can see at least one of those, same permission-per-slide pattern
  // every other entry in this array already follows.
  const canViewHiringOverview = canViewJobOpenings || canViewOrgStats || canViewInterviews;

  const slides: DashboardSlide[] = [
    ...(canViewHiringOverview
      ? [
          {
            key: 'hiring-overview',
            label: 'Hiring Overview',
            icon: <MdOutlineInsights />,
            content: <HiringOverviewSlide fillHeight />,
          },
        ]
      : []),
    ...(canViewOrgStats
      ? [
          {
            key: 'recruiters',
            label: 'Recruiters',
            icon: <TeamOutlined />,
            content: (
              <CustomerTable
                headers={recruitersHeaders}
                title="Recruiters"
                data={localState.recruiterData}
                role={role.type}
                icon={recruiterImage}
                getData={() =>
                  getDashboardData(recruiterRoleId ?? 0, 'recruiterData', 'totalRecruiters')
                }
                count={localState.totalRecruiters < 5 ? localState.totalRecruiters : 5}
                onViewAll={handleViewAllRecruiters}
                onTitleClick={handleViewAllRecruiters}
                onIconClick={handleViewAllRecruiters}
                fillHeight
              />
            ),
          },
          {
            key: 'hiring-managers',
            label: 'Hiring Managers',
            icon: <UserOutlined />,
            content: (
              <CustomerTable
                headers={hiringManagersHeaders}
                title="Hiring Managers"
                data={localState.hiringManagerData}
                role={role.type}
                icon={hiringManagerImage}
                getData={() =>
                  getDashboardData(
                    hiringManagerRoleId ?? 0,
                    'hiringManagerData',
                    'totalHiringManagers'
                  )
                }
                count={localState.totalHiringManagers < 5 ? localState.totalHiringManagers : 5}
                onViewAll={handleViewAllHiringManagers}
                onTitleClick={handleViewAllHiringManagers}
                onIconClick={handleViewAllHiringManagers}
                fillHeight
              />
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
        ]
      : []),
    ...(canViewJobOpenings
      ? [
          {
            key: 'job-openings',
            label: 'Job Openings',
            icon: <SolutionOutlined />,
            content: (
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
                fillHeight
              />
            ),
          },
        ]
      : []),
    ...(canViewActivity
      ? [
          {
            key: 'activity',
            label: 'Activity Feed',
            icon: <LuSquareActivity />,
            content: <ActivityFeed />,
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

export default OwnerDashboard;
