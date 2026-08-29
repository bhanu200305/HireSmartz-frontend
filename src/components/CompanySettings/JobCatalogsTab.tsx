import React from 'react';
import { Tabs } from 'antd';
import InterviewRoundTypesTab from './JobCatalogs/InterviewRoundTypesTab';
import ClosureReasonsTab from './JobCatalogs/ClosureReasonsTab';
import ShiftTypesTab from './JobCatalogs/ShiftTypesTab';
import PlatformJobTypesTab from './JobCatalogs/PlatformJobTypesTab';
import JobModesTab from './JobCatalogs/JobModesTab';
import LanguagesTab from './JobCatalogs/LanguagesTab';
import SkillCategoriesTab from './JobCatalogs/SkillCategoriesTab';
import SkillTypesTab from './JobCatalogs/SkillTypesTab';
import SkillsTab from './JobCatalogs/SkillsTab';
import QuestionImportTemplateTab from './JobCatalogs/QuestionImportTemplateTab';

/**
 * "Job Catalogs" — Super Admin's master-data hub for job-service, mirroring
 * how "Notification Settings" groups several sub-screens under one
 * top-level tab instead of ten more tabs sitting flat beside
 * Industries/Departments/Job Titles (those three are organization-service's
 * own catalogues — a different backend, kept as their own top-level tabs).
 *
 * Every sub-tab here is real, against job-service's `/platform/master-*`
 * CRUD (previously built on the backend with no Super Admin screen to
 * manage any of it from — see jobs-opening-rewire memory). Job Types reuses
 * catalogs.ts's isMaster-branched client rather than a separate one, since
 * it's the same list the Job Details wizard's Job Type dropdown already
 * reads for a platform caller.
 */
const JobCatalogsTab: React.FC = () => {
  return (
    <Tabs
      className="job-catalogs-tabs"
      items={[
        {
          key: 'interview-rounds',
          label: 'Interview Rounds',
          children: <InterviewRoundTypesTab />,
        },
        {
          key: 'closure-reasons',
          label: 'Closure Reasons',
          children: <ClosureReasonsTab />,
        },
        {
          key: 'shift-types',
          label: 'Shift Types',
          children: <ShiftTypesTab />,
        },
        {
          key: 'job-types',
          label: 'Job Types',
          children: <PlatformJobTypesTab />,
        },
        {
          key: 'job-modes',
          label: 'Job Modes',
          children: <JobModesTab />,
        },
        {
          key: 'languages',
          label: 'Languages',
          children: <LanguagesTab />,
        },
        {
          key: 'skill-categories',
          label: 'Skill Categories',
          children: <SkillCategoriesTab />,
        },
        {
          key: 'skill-types',
          label: 'Skill Types',
          children: <SkillTypesTab />,
        },
        {
          key: 'skills',
          label: 'Skills',
          children: <SkillsTab />,
        },
        {
          key: 'question-import-template',
          label: 'Question Import Template',
          children: <QuestionImportTemplateTab />,
        },
      ]}
    />
  );
};

export default JobCatalogsTab;
