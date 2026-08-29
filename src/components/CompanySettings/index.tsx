import React from 'react';
import { Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { BsArrowLeft } from 'react-icons/bs';
import { FiSettings } from 'react-icons/fi';
import IndustriesTab from './IndustriesTab';
import DepartmentsTab from './DepartmentsTab';
import JobTitlesTab from './JobTitlesTab';
import DepartmentSettingsTab from './DepartmentSettingsTab';
import PlatformScoringDefaultsTab from './PlatformScoringDefaultsTab';
import NotificationSettingsTab from './NotificationSettingsTab';
import JobCatalogsTab from './JobCatalogsTab';

/**
 * Super Admin's platform master-data hub. Industries/Departments/Job Titles/
 * Department Settings/Scoring Defaults are all real
 * (organization-service's `/v1/platform/...`) — Departments and Department
 * Settings (job-title<->department assignment) were previously removed on
 * the mistaken belief that no backend endpoint existed for them; a real one
 * does, `app/modules/masters/api/platform_router.py`'s `/master-departments`
 * routes, confirmed and re-wired against it directly. Not the same thing as
 * CareerForcePro's own internal Sales/Support/Finance/Ops departments, which
 * live in the CFP Users section of the Users page instead.
 *
 * "Notification Settings" collects everything notification-related as its
 * own sub-tabs (Notification Templates, SMS Templates) instead of two
 * separate top-level tabs — see NotificationSettingsTab's own doc comment
 * for what each sub-tab is and why they're distinct systems, not one
 * feature split two ways.
 */
const CompanySettings: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || '1';

  const handleTabChange = (key: string) => {
    searchParams.set('tab', key);
    setSearchParams(searchParams);
    // `?tab=` doesn't change the route pathname, so App.tsx's route-level
    // scroll reset never fires for it.
    window.scrollTo(0, 0);
  };

  const items = React.useMemo<TabsProps['items']>(
    () => [
      {
        key: '1',
        label: 'Industries',
        children: <IndustriesTab />,
      },
      {
        key: '2',
        label: 'Departments',
        children: <DepartmentsTab />,
      },
      {
        key: '3',
        label: 'Job Titles',
        children: <JobTitlesTab />,
      },
      {
        key: '4',
        label: 'Department Settings',
        children: <DepartmentSettingsTab />,
      },
      {
        key: '5',
        label: 'Default Scoring Weights',
        children: <PlatformScoringDefaultsTab />,
      },
      {
        key: '6',
        label: 'Job Catalogs',
        children: <JobCatalogsTab />,
      },
      {
        key: '7',
        label: 'Notification Settings',
        children: <NotificationSettingsTab />,
      },
    ],
    []
  );

  return (
    <MainLayout>
      <div className="w-full px-6 py-5 max-w-[1400px] mx-auto">
        <div
          className="flex items-center gap-2 text-sm text-gray-500 mb-3 cursor-pointer hover:text-primary-600 transition-colors w-fit"
          onClick={() => navigate(-1)}
        >
          <BsArrowLeft />
          <span>Back</span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl shadow-xs">
          <div className="p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
                <FiSettings size={18} />
              </span>
              <h1 className="font-display text-2xl font-bold text-gray-900">Company Settings</h1>
            </div>

            <Tabs activeKey={currentTab} onChange={handleTabChange} items={items} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CompanySettings;
