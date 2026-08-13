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
import { HiOutlineUserGroup, HiOutlineSpeakerphone } from 'react-icons/hi';

const MenuItems = [
  {
    name: 'Dashboard',
    icon: <MdOutlineDashboard size={18} />,
    path: '/',
    requiredAuthority: Authorities.DASHBOARD_VIEW,
  },
  {
    name: 'Company Settings',
    icon: <FiSettings size={18} />,
    path: ['/company-settings'],
    requiredAuthority: Authorities.INDUSTRY_VIEW,
  },
  {
    name: 'Companies',
    icon: <MdApartment size={18} />,
    path: ['/company', '/add-company', '/view-company', '/edit-company'],
    requiredAuthority: Authorities.COMPANY_VIEW,
  },
  {
    name: 'Platform Team',
    icon: <HiOutlineUserGroup size={18} />,
    path: ['/platform-team'],
    requiredAuthority: Authorities.PLATFORM_VIEW,
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
  {
    name: 'Company',
    icon: <MdApartment size={18} />,
    path: ['/my-company'],
    requiredAuthority: Authorities.MY_COMPANY_VIEW,
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
    name: 'Roles & Permissions',
    icon: <MdOutlineAdminPanelSettings size={18} />,
    path: ['/roles', '/add-role', '/view-role', '/edit-role'],
    requiredAuthority: Authorities.ROLE_VIEW,
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
];

export default MenuItems;
