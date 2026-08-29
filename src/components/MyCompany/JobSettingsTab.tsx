import React from 'react';
import { Tabs } from 'antd';
import TenantJobTypesTab from './JobSettings/TenantJobTypesTab';
import TenantShiftsTab from './JobSettings/TenantShiftsTab';
import TenantEducationPreferencesTab from './JobSettings/TenantEducationPreferencesTab';

/**
 * "Job Settings" — a Company Admin's own configured job-service catalogues
 * (job types, shifts, education preferences), each feeding a dropdown on
 * the Job Details step of creating/editing a job. Was previously nothing
 * here at all — GET/POST/PUT/DELETE /job-types, /shifts and
 * /education-preferences existed on the backend with no tenant-facing
 * screen to manage any of it from (mirrors Company Settings → Job Catalogs,
 * the Super Admin equivalent for the platform-wide versions of these).
 */
const JobSettingsTab: React.FC = () => {
  return (
    <Tabs
      className="job-settings-tabs"
      items={[
        {
          key: 'job-types',
          label: 'Job Types',
          children: <TenantJobTypesTab />,
        },
        {
          key: 'shifts',
          label: 'Shifts',
          children: <TenantShiftsTab />,
        },
        {
          key: 'education-preferences',
          label: 'Education Preferences',
          children: <TenantEducationPreferencesTab />,
        },
      ]}
    />
  );
};

export default JobSettingsTab;
