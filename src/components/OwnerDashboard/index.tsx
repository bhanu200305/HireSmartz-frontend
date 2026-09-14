import MainLayout from '../../layouts/MainLayout';
import { useMemo } from 'react';
import recruiterImage from '../../assets/svgs/recruiter.svg';
import hiringManagerImage from '../../assets/svgs/hiringManager.svg';
import jobPostingImage from '../../assets/svgs/jobPosting.svg';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import { RootState } from '../../redux/provider/store';
import CustomerTable from '../Dashboard/CustomerTable';
import DashboardCarousel, { DashboardSlide } from '../Dashboard/DashboardCarousel';
import { hiringManagersHeaders } from '../../constants/hiringManager';
import { recruitersHeaders } from '../../constants/recruiters';
import { jobOpeningsHeaders } from '../../constants/jobOpenings';
import useFetchRoles from '../../hooks/useRoles';
import { useListUsersQuery, type OrgUser } from '../../api/organization-service/Users/users';
import { useGetJobOpeningsQuery } from '../../api/job-service/JobOpening/GetJobOpening';
import { setJobOpeningFilters } from '../../redux/slices/jobOpeningFilterSlice';

import { setOrgUserFilters } from '../../redux/slices/OrgUserFilterSlice';
import { StatusFilters } from '../shared/ui/tableHeadbar';
import ActivityFeed from '../Dashboard/ActivityFeed';
import { TeamOutlined, UserOutlined, SolutionOutlined } from '@ant-design/icons';
import { LuSquareActivity } from 'react-icons/lu';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';
import { MdOutlineInsights } from 'react-icons/md';
import HiringOverviewSlide from '../Dashboard/HiringOverviewSlide';

// One dashboard "team member" card row, mapped from organization-service's
// real `GET /v1/users` shape. Replaces the old `analytics-service`
// `/orguserservice/org/user/dashboard/filters` call, which no longer exists
// on any deployed service — so the Recruiters and Hiring Managers slides
// rendered empty for every non-platform role (the fetch also only ran for
// Super Admin / Admin).
type TeamRow = { id: string; fullName: string; email: string; roleLabel: string };

const MAX_DASHBOARD_ROWS = 5;

// The `role` query param on `GET /v1/users` takes a BASE role name (and
// server-side also matches any of the tenant's own roles derived from it),
// so the filtering — including custom role names — happens on the backend.
const RECRUITER_ROLE = 'recruiter';
const HIRING_MANAGER_ROLE = 'hiring_manager';

const toTeamRow = (user: OrgUser): TeamRow => ({
  id: user.user_id,
  fullName: user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || '-',
  email: user.email,
  roleLabel: user.role ?? '-',
});

const OwnerDashboard = () => {
  const navigate = useNavigate();

  const { jobOpeningFilters, role, tenantId } = useSelector(
    (state: RootState) => ({
      jobOpeningFilters: state.JobOpeningFiltersSlice,
      role: state.LoginSlice.role,
      tenantId: state.LoginSlice.tenantId,
    }),
    shallowEqual
  );
  const dispatch = useDispatch();
  const { roles } = useFetchRoles();

  const recruiterRole = Array.isArray(roles?.data)
    ? roles.data.find((r) => r.roleName.toLowerCase() === 'recruiter')
    : undefined;
  const hiringManagerRole = Array.isArray(roles?.data)
    ? roles.data.find((r) => r.roleName.toLowerCase() === 'hiring manager')
    : undefined;

  const recruiterRoleId = recruiterRole?.id;
  const hiringManagerRoleId = hiringManagerRole?.id;

  // One backend call per role — `GET /v1/users?role=…` does the filtering,
  // custom tenant roles included. Gated on USER_VIEW (the directory-read
  // permission), so a role without it simply doesn't get these two slides.
  const canViewOrgStats = useHasAccess(Authorities.USER_VIEW);
  const usersQuerySkip = { skip: !tenantId || !canViewOrgStats };

  const { data: recruiterUsers } = useListUsersQuery(
    { role: RECRUITER_ROLE, limit: MAX_DASHBOARD_ROWS, offset: 0 },
    usersQuerySkip
  );
  const { data: hiringManagerUsers } = useListUsersQuery(
    { role: HIRING_MANAGER_ROLE, limit: MAX_DASHBOARD_ROWS, offset: 0 },
    usersQuerySkip
  );

  const recruiterRows = useMemo(
    () => (recruiterUsers?.items ?? []).map(toTeamRow),
    [recruiterUsers]
  );
  const hiringManagerRows = useMemo(
    () => (hiringManagerUsers?.items ?? []).map(toTeamRow),
    [hiringManagerUsers]
  );

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
  const { data: jobOpeningsData } = useGetJobOpeningsQuery(
    {
      page: jobOpeningFilters.page || 0,
      size: 5,
      status: jobOpeningFilters.status,
      isDraft: jobOpeningFilters.isDraft,
      isClosed: jobOpeningFilters.isClosed,
      isAll: jobOpeningFilters.isAll,
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

  // Location-resolved via useEffectivePermissions — a widget backed by a
  // permission this user doesn't hold at their active location disappears
  // on switch, rather than every widget always showing regardless of role
  // or location the way the old role.name checks did.
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
                data={recruiterRows.slice(0, MAX_DASHBOARD_ROWS)}
                role={role.type}
                icon={recruiterImage}
                count={Math.min(recruiterRows.length, MAX_DASHBOARD_ROWS)}
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
                data={hiringManagerRows.slice(0, MAX_DASHBOARD_ROWS)}
                role={role.type}
                icon={hiringManagerImage}
                count={Math.min(hiringManagerRows.length, MAX_DASHBOARD_ROWS)}
                onViewAll={handleViewAllHiringManagers}
                onTitleClick={handleViewAllHiringManagers}
                onIconClick={handleViewAllHiringManagers}
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

export default OwnerDashboard;
