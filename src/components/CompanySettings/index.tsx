import React from 'react';
import { Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { BsArrowLeft } from 'react-icons/bs';
import IndustriesTab from './IndustriesTab';
import JobTitlesTab from './JobTitlesTab';
import PlatformScoringDefaultsTab from './PlatformScoringDefaultsTab';
import EmailTemplateConfigWrapper from './EmailTemplateConfigWrapper';
import SmsTemplatesTab from './SmsTemplatesTab';
import { useGetFeatureFlagsQuery } from '../../api/authentication-service/FeatureFlags/index';

/**
 * Super Admin's platform master-data hub. Industries/Job Titles/Scoring
 * Defaults are real (organization-service's `/v1/platform/...`). The old
 * "Departments"/"Department Settings" tabs are dropped, not just hidden —
 * they modeled a master-department-catalog-with-job-title-mapping feature
 * that has no endpoint anywhere in the contract and isn't planned (not the
 * same thing as CareerForcePro's own internal Sales/Support/Finance/Ops
 * departments, which live on the Platform Team screen instead). Email/SMS
 * template tabs are untouched — notification-service owns that surface now,
 * out of this integration's scope.
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
        label: 'Job Titles',
        children: <JobTitlesTab />,
      },
      {
        key: '3',
        label: 'Default Scoring Weights',
        children: <PlatformScoringDefaultsTab />,
      },
      ...(featureFlags?.emailTemplateConfig
        ? [{ key: '5', label: 'Email Templates Config', children: <EmailTemplateConfigWrapper /> }]
        : []),
      {
        key: '6',
        label: 'SMS Templates',
        children: <SmsTemplatesTab />,
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
