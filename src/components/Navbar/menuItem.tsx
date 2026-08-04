import { FaCity } from 'react-icons/fa';
import { BsBuilding, BsCalendar4Event } from 'react-icons/bs';
import { Authorities } from '../../constants/authorities.constant';
import { TbBriefcase2 } from 'react-icons/tb';
import { LuSquareActivity, LuUsersRound } from 'react-icons/lu';
import { FiSettings } from 'react-icons/fi';
import { MdApartment, MdOutlineDashboard } from 'react-icons/md';
import { PiMoneyFill } from 'react-icons/pi';

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
    requiredAuthority: Authorities.COMPANY_SETTINGS_VIEW,
  },
  {
    name: 'Companies',
    icon: <MdApartment size={18} />,
    path: ['/company', '/add-company', '/view-company', '/edit-company'],
    requiredAuthority: Authorities.COMPANY_VIEW,
  },
  {
    name: 'CFP Users',
    icon: <LuUsersRound size={18} />,
    path: ['/users', '/add-user', '/view-user', '/edit-user'],
    requiredAuthority: Authorities.USER_VIEW,
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
    requiredAuthority: Authorities.ORGANIZATION_USER_ADD,
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
];

export default MenuItems;
