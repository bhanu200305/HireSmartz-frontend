import React from 'react';
import { Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/provider/store';
import MainLayout from '../../layouts/MainLayout';
import { BsArrowLeft } from 'react-icons/bs';
import IndustriesTab from './IndustriesTab';
import DepartmentsTab from './DepartmentsTab';
import JobTitlesTab from './JobTitlesTab';
import DepartmentSettingsTab from './DepartmentSettingsTab';
import EmailTemplateConfigWrapper from './EmailTemplateConfigWrapper';
import SmsTemplatesTab from './SmsTemplatesTab';
import ScoringCriteriaConfigTab from './ScoringCriteriaConfigTab';
import { useGetFeatureFlagsQuery } from '../../api/authentication-service/FeatureFlags/index';

const CompanySettings: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || '1';

  const handleTabChange = (key: string) => {
    searchParams.set('tab', key);
    setSearchParams(searchParams);
  };

  const { data: featureFlags } = useGetFeatureFlagsQuery();

  const role = useSelector((state: RootState) => state.LoginSlice.role);

  const isScoringCriteriaAllowed = React.useMemo(() => {
    const normalizeRoleIdentifier = (value?: string): string => {
      return (value || '').replace(/[_\s-]+/g, '').toLowerCase();
    };

    const name = normalizeRoleIdentifier(role?.name);
    const type = normalizeRoleIdentifier(role?.type);
    const isOrganizationUser = type === 'organization';
    const isCompanySuperAdmin = isOrganizationUser && name === 'superadmin';
    const isHiringManager = name === 'hiringmanager';
    const isMasterSuperAdmin = name === 'mastersuperadmin';

    return isCompanySuperAdmin || isHiringManager || isMasterSuperAdmin;
  }, [role]);

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
      ...(featureFlags?.emailTemplateConfig
        ? [{ key: '5', label: 'Email Templates Config', children: <EmailTemplateConfigWrapper /> }]
        : []),
      {
        key: '6',
        label: 'SMS Templates',
        children: <SmsTemplatesTab />,
      },
      ...(isScoringCriteriaAllowed
        ? [
            {
              key: '7',
              label: 'Scoring Criteria Configuration',
              children: <ScoringCriteriaConfigTab />,
            },
          ]
        : []),
    ],
    [featureFlags, isScoringCriteriaAllowed]
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
