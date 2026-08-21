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
import EmailTemplateConfigWrapper from './EmailTemplateConfigWrapper';
import SmsTemplatesTab from './SmsTemplatesTab';
import NotificationTemplatesTab from './NotificationTemplatesTab';

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
 * "Email Templates Config" and "SMS Templates" manage a DIFFERENT, unrelated
 * feature — candidate-facing recruiting email/SMS branding — left untouched
 * on purpose (see this integration's notes on why wiring them to
 * notification-service would be wrong, not a fix). "Notification Templates"
 * is the real notification-service surface (`/v1/platform/template-settings/*`):
 * the platform's own security/onboarding/lifecycle notification catalogue.
 */
const CompanySettings: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || '1';

  const handleTabChange = (key: string) => {
    searchParams.set('tab', key);
    setSearchParams(searchParams);
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
        label: 'Email Templates Config',
        children: <EmailTemplateConfigWrapper />,
      },
      {
        key: '7',
        label: 'SMS Templates',
        children: <SmsTemplatesTab />,
      },
      {
        key: '8',
        label: 'Notification Templates',
        children: <NotificationTemplatesTab />,
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
