import React from 'react';
import { Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { BsArrowLeft } from 'react-icons/bs';
import IndustriesTab from './IndustriesTab';
import DepartmentsTab from './DepartmentsTab';
import JobTitlesTab from './JobTitlesTab';
import DepartmentSettingsTab from './DepartmentSettingsTab';
import PlatformScoringDefaultsTab from './PlatformScoringDefaultsTab';
import EmailTemplateConfigWrapper from './EmailTemplateConfigWrapper';
import SmsTemplatesTab from './SmsTemplatesTab';
import NotificationTemplatesTab from './NotificationTemplatesTab';
import { useGetFeatureFlagsQuery } from '../../api/authentication-service/FeatureFlags/index';

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

  const { data: featureFlags } = useGetFeatureFlagsQuery();

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
      ...(featureFlags?.emailTemplateConfig
        ? [{ key: '6', label: 'Email Templates Config', children: <EmailTemplateConfigWrapper /> }]
        : []),
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
    [featureFlags]
  );

  return (
    <MainLayout>
      <div className="w-full px-6 py-6 pt-16 max-w-[1400px] mx-auto">
        <div
          className="flex items-center gap-2 text-sm text-gray-500 mb-6 cursor-pointer hover:text-black w-fit"
          onClick={() => navigate(-1)}
        >
          <BsArrowLeft />
          <span>Back</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm min-h-[calc(100vh-140px)]">
          <div className="p-8">
            <h1 className="text-3xl font-semibold text-gray-800 mb-8">Company Settings</h1>

            <div className="bg-gray-50 p-2 rounded-lg mb-6">
              <Tabs
                activeKey={currentTab}
                onChange={handleTabChange}
                items={items}
                type="card"
                className="[&_.ant-tabs-nav]:mb-0 [&_.ant-tabs-content-holder]:bg-transparent [&_.ant-tabs-content-holder]:p-0"
              />
            </div>

            {/* In the image, the tab content is rendered right below the paragraph. 
                But in Antd Tabs, the children content will actually appear directly inside the .ant-tabs-content-holder. 
                So I will put the paragraph inside IndustriesTab instead. For now I keep it here for layout matching. */}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CompanySettings;
