import BackButton from '../shared/ui/BackButton';
import React from 'react';
import { Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { FiSettings } from 'react-icons/fi';
import IndustriesTab from './IndustriesTab';
import DepartmentsTab from './DepartmentsTab';
import JobTitlesTab from './JobTitlesTab';
import DepartmentSettingsTab from './DepartmentSettingsTab';
import PlatformScoringDefaultsTab from './PlatformScoringDefaultsTab';
import IntakeQuestionsTab from './IntakeQuestionsTab';
import CultureIntroTab from './CultureIntroTab';
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
 * HireSmartz's own internal Sales/Support/Finance/Ops departments, which
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

  // Grouped into 3 topic tabs, same two-level pattern as My Company's own
  // Company Settings page (MyCompany/index.tsx). Leaf `key`s are stable
  // across groups, so an existing `?tab=<n>` link still resolves correctly.
  //  - Master Data: catalog entities (industries, departments, job titles,
  //    department<->job-title assignment, job catalogs).
  //  - Hiring Defaults: platform-wide defaults a tenant inherits until it
  //    customizes its own — scoring weights, intake questions, culture
  //    intro (see PlatformScoringDefaultsTab / IntakeQuestionsTab /
  //    CultureIntroTab's own doc comments for the inheritance mechanics).
  //  - Notification Settings: its own top-level entry, not folded into
  //    either group — it's already a 2-sub-tab group of its own
  //    (Notification Templates, SMS Templates).
  const groups = React.useMemo<{ key: string; label: string; tabs: TabsProps['items'] }[]>(
    () => [
      {
        key: 'master-data',
        label: 'Master Data',
        tabs: [
          { key: '1', label: 'Industries', children: <IndustriesTab /> },
          { key: '2', label: 'Departments', children: <DepartmentsTab /> },
          { key: '3', label: 'Job Titles', children: <JobTitlesTab /> },
          { key: '4', label: 'Department Settings', children: <DepartmentSettingsTab /> },
          { key: '6', label: 'Job Catalogs', children: <JobCatalogsTab /> },
        ],
      },
      {
        key: 'hiring-defaults',
        label: 'Hiring Defaults',
        tabs: [
          { key: '5', label: 'Default Scoring Weights', children: <PlatformScoringDefaultsTab /> },
          { key: '8', label: 'Intake Questions', children: <IntakeQuestionsTab /> },
          { key: '9', label: 'Company Intro', children: <CultureIntroTab /> },
        ],
      },
      {
        key: 'notifications',
        label: 'Notification Settings',
        tabs: [{ key: '7', label: 'Notification Settings', children: <NotificationSettingsTab /> }],
      },
    ],
    []
  );

  // Which group the current leaf tab lives in — derived from `currentTab`
  // rather than tracked as its own `?group=` param, so a bookmarked
  // `?tab=<n>` link opens the right group automatically.
  const activeGroup =
    groups.find((group) => group.tabs?.some((tab) => tab.key === currentTab)) ?? groups[0];

  const handleGroupChange = (groupKey: string) => {
    const firstLeafTab = groups.find((group) => group.key === groupKey)?.tabs?.[0];
    if (firstLeafTab) {
      handleTabChange(String(firstLeafTab.key));
    }
  };

  return (
    <MainLayout>
      <div className="w-full px-6 py-5 max-w-[1400px] mx-auto">
        <BackButton onClick={() => navigate(-1)} className="mb-3" />

        <div className="bg-white border border-neutral-200 rounded-xl shadow-xs">
          <div className="p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
                <FiSettings size={18} />
              </span>
              <h1 className="font-display text-2xl font-bold text-gray-900">Company Settings</h1>
            </div>

            <Tabs
              activeKey={activeGroup.key}
              onChange={handleGroupChange}
              items={groups.map((group) => ({
                key: group.key,
                label: group.label,
                children: null,
              }))}
              className="many-tabs"
            />
            {/* Single-leaf groups (Notification Settings) skip the inner
                strip entirely — a second tab row with one tab in it would
                just repeat the outer tab's own label back at the user. */}
            {(activeGroup.tabs?.length ?? 0) > 1 ? (
              <Tabs
                activeKey={currentTab}
                onChange={handleTabChange}
                items={activeGroup.tabs}
                className="many-tabs mt-1"
              />
            ) : (
              activeGroup.tabs?.[0]?.children
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CompanySettings;
