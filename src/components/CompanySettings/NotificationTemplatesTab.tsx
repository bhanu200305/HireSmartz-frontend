import React, { useState } from 'react';
import {
  MdEmail,
  MdSms,
  MdSwapHoriz,
  MdOutlineNotifications,
  MdPalette,
  MdOutlineBusiness,
  MdRestartAlt,
} from 'react-icons/md';
import MasterEmailTemplatesSection from './MasterEmailTemplatesSection';
import MasterSmsTemplatesSection from './MasterSmsTemplatesSection';
import TenantOverrideSection from './TenantOverrideSection';
import MasterThemeSection from './MasterThemeSection';
import CompanyThemeSection from './CompanyThemeSection';
import PushTemplatesTab from './PushTemplatesTab';

type SectionKey = 'email' | 'theme' | 'companyTheme' | 'sms' | 'overrides' | 'bulkRevert';

const SECTIONS: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
  { key: 'email', label: 'Email defaults', icon: <MdEmail size={16} /> },
  { key: 'theme', label: 'Theme defaults', icon: <MdPalette size={16} /> },
  { key: 'companyTheme', label: 'Company theme', icon: <MdOutlineBusiness size={16} /> },
  { key: 'sms', label: 'SMS defaults', icon: <MdSms size={16} /> },
  { key: 'overrides', label: 'Tenant overrides', icon: <MdSwapHoriz size={16} /> },
  { key: 'bulkRevert', label: 'Bulk revert', icon: <MdRestartAlt size={16} /> },
];

/**
 * Super Admin's notification-service template management —
 * `/v1/platform/template-settings/*`. "SMS Templates" (the sibling tab on
 * this page) manages a different, unrelated feature — candidate-facing
 * per-interview-round SMS copy, its own separate backend — left untouched.
 *
 * Used to stack all three sections vertically, each rendering its own full
 * list — with enough notification types (and, for overrides, enough
 * searched-up tenants) seeded, that pushed the page into several screens of
 * scroll before a Super Admin ever reached "Tenant overrides". A segmented
 * switcher now shows exactly one section at a time, and each section bounds
 * its own list to an internal scroll area (see the `max-h-*` grids inside
 * each section) instead of growing the page — so the tab stays roughly one
 * viewport tall no matter how many templates or tenants exist.
 */
const NotificationTemplatesTab: React.FC = () => {
  const [active, setActive] = useState<SectionKey>('email');

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-gradient-to-r from-primary-50 via-white to-accent-50 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-sm">
          <MdOutlineNotifications size={18} />
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-900">System notification catalogue</p>
          <p className="text-xs text-gray-500">
            Platform defaults and per-tenant overrides for account, security and product emails
            &amp; SMS.
          </p>
        </div>
      </div>

      <div className="inline-flex w-fit gap-1 rounded-2xl border border-[var(--border)] bg-gray-50 p-1">
        {SECTIONS.map((section) => {
          const isActive = section.key === active;
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => setActive(section.key)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span className={isActive ? 'text-primary-600' : 'text-gray-400'}>
                {section.icon}
              </span>
              {section.label}
            </button>
          );
        })}
      </div>

      {active === 'email' && <MasterEmailTemplatesSection />}
      {active === 'theme' && <MasterThemeSection />}
      {active === 'companyTheme' && <CompanyThemeSection />}
      {active === 'sms' && <MasterSmsTemplatesSection />}
      {active === 'overrides' && <TenantOverrideSection />}
      {active === 'bulkRevert' && <PushTemplatesTab />}
    </div>
  );
};

export default NotificationTemplatesTab;
