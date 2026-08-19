import { BsCalendar4Event } from 'react-icons/bs';
import { Authorities } from '../../constants/authorities.constant';
import { TbBriefcase2 } from 'react-icons/tb';
import { LuSquareActivity, LuUsersRound } from 'react-icons/lu';
import { FiSettings } from 'react-icons/fi';
import {
  MdAdminPanelSettings,
  MdApartment,
  MdOutlineAdminPanelSettings,
  MdOutlineDashboard,
  MdOutlineInsights,
} from 'react-icons/md';
import { PiMoneyFill } from 'react-icons/pi';
import { HiOutlineSpeakerphone } from 'react-icons/hi';

// Order matters: Sidebar renders this array as-is (filtered down to
// whatever `requiredAuthority` the signed-in caller holds), so the order
// below IS the nav order for every role, not just the one that happens to
// see every entry. For a Master Super Admin — who holds DASHBOARD_VIEW,
// COMPANY_VIEW, INDUSTRY_VIEW, ROLE_VIEW, USER_ADD, the Admin role-gate,
// FINANCES_VIEW, SUBSCRIPTIONS_VIEW and PLATFORM_VIEW, but neither
// MY_COMPANY_VIEW, JOB_OPENING_VIEW nor ACTIVITY_FEED — filtering this list
// down to what they can see yields, in order: Dashboard, Companies, Company
// Settings, Roles & Permissions, Users, Admin, Finances, Subscriptions,
// Platform Metrics, Audit Log, Book a Demo Leads. The tenant-only entries
// interleaved here (Company/my-company, Job Openings, Activity Feed) sit
// wherever's natural for a tenant caller's own nav, since a Master Super
// Admin never holds their authority and never sees them.
const MenuItems = [
  {
    name: 'Dashboard',
    icon: <MdOutlineDashboard size={18} />,
    path: '/',
    requiredAuthority: Authorities.DASHBOARD_VIEW,
  },
  {
    name: 'Companies',
    icon: <MdApartment size={18} />,
    path: ['/company', '/add-company', '/view-company', '/edit-company'],
    requiredAuthority: Authorities.COMPANY_VIEW,
  },
  {
    // MY_COMPANY_VIEW used to gate this — a frontend-only flag the real
    // backend permission-resolution call can never return (see its own "No
    // backend permission" comment in authorities.constant.ts), which meant
    // no real (non-dev-bypass) tenant login ever saw this item. COMPANY_
    // SETTINGS_VIEW ('organization:read') is the actual permission
    // MyCompanyPage's own RequirePermission gate already requires to render
    // the page this links to — using the same one here means the nav item
    // and the page it points at finally agree on who can see it.
    name: 'Company',
    icon: <MdApartment size={18} />,
    path: ['/my-company'],
    requiredAuthority: Authorities.COMPANY_SETTINGS_VIEW,
  },
  {
    name: 'Company Settings',
    icon: <FiSettings size={18} />,
    path: ['/company-settings'],
    requiredAuthority: Authorities.INDUSTRY_VIEW,
  },
  {
    name: 'Roles & Permissions',
    icon: <MdOutlineAdminPanelSettings size={18} />,
    path: ['/roles', '/add-role', '/view-role', '/edit-role'],
    requiredAuthority: Authorities.ROLE_VIEW,
  },
  {
    // CFP Users (CareerForcePro's own internal team) lives as a section on
    // this same page now, not a separate nav entry — see
    // pages/OrganisationUserPage and components/CfpUsers.
    name: 'Users',
    icon: <LuUsersRound size={18} />,
    path: [
      '/organisation-users',
      '/add-organisation-users',
      '/view-organisation-user',
      '/edit-organisation-user',
    ],
    requiredAuthority: Authorities.USER_ADD,
  },
  {
    name: 'Job Openings',
    icon: <TbBriefcase2 size={18} />,
    path: [
      '/jobs',
      '/add-job-description',
      '/ats-job-id',
      '/jobs/create',
      '/jobs/view',
      '/jobs/edit',
      '/job-details',
      '/job-description',
      '/interview',
      '/ai-questions',
      '/ai-questions/add-ai-question',
      '/ai-questions/edit-ai-question',
      '/candidates',
      '/candidates/add-candidate',
      '/ai-job-description',
      '/interview-setup',
      '/add-new-round',
      '/view-job-description',
      '/view-job-opening',
      '/interviewer-startinterview',
      '/job-fields-configuration',
    ],
    requiredAuthority: Authorities.JOB_OPENING_VIEW,
  },
  {
    name: 'Activity Feed',
    icon: <LuSquareActivity size={18} />,
    path: '/activityFeed',
    requiredAuthority: Authorities.ACTIVITY_FEED,
  },
  {
    // Not authority-gated like the rest of this list — Sidebar filters this
    // one on role directly (isMasterSuperAdminRole), since unlocking an
    // account / rotating the signing key isn't something any Authorities
    // catalog entry could ever grant a tenant. See that helper's comment.
    name: 'Admin',
    icon: <MdAdminPanelSettings size={18} />,
    path: ['/settings/admin'],
  },
  {
    name: 'Finances',
    icon: <PiMoneyFill size={20} />,
    path: '/finances',
    requiredAuthority: Authorities.FINANCES_VIEW,
  },
  {
    name: 'Subscriptions',
    icon: <BsCalendar4Event size={16} />,
    path: '/Subscriptions',
    requiredAuthority: Authorities.SUBSCRIPTIONS_VIEW,
  },
  {
    name: 'Platform Metrics',
    icon: <MdOutlineInsights size={18} />,
    path: ['/platform-metrics'],
    requiredAuthority: Authorities.PLATFORM_VIEW,
  },
  {
    name: 'Audit Log',
    icon: <LuSquareActivity size={18} />,
    path: ['/platform-audit'],
    requiredAuthority: Authorities.PLATFORM_VIEW,
  },
  {
    name: 'Book a Demo Leads',
    icon: <HiOutlineSpeakerphone size={18} />,
    path: ['/guest-organizations'],
    requiredAuthority: Authorities.PLATFORM_VIEW,
  },
];

export default MenuItems;
