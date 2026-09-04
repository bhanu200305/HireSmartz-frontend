import React from 'react';
import { Tabs } from 'antd';
import TenantJobTypesTab from './JobSettings/TenantJobTypesTab';
import TenantShiftsTab from './JobSettings/TenantShiftsTab';
import TenantEducationPreferencesTab from './JobSettings/TenantEducationPreferencesTab';
import TenantJobModesTab from './JobSettings/TenantJobModesTab';
import TenantClosureReasonsTab from './JobSettings/TenantClosureReasonsTab';

/**
 * "Job Settings" — a Company Admin's own configured job-service catalogues
 * (job types, shifts, education preferences, job modes, closure reasons),
 * each feeding a dropdown on the Job Details/Close Job steps. Mirrors
 * Company Settings -> Job Catalogs, the Super Admin equivalent for the
 * platform-wide versions of these.
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
          key: 'job-modes',
          label: 'Job Modes',
          children: <TenantJobModesTab />,
        },
        {
          key: 'closure-reasons',
          label: 'Closure Reasons',
          children: <TenantClosureReasonsTab />,
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
