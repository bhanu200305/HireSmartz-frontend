import React from 'react';
import { Tabs } from 'antd';
import type { TabsProps } from 'antd';
import EmailTemplatesTab from './EmailTemplatesTab';
import NotificationCopyTab from './NotificationCopyTab';

/**
 * "Notification Settings" — one top-level tab collecting everything that
 * shapes what this tenant sends candidates/staff, instead of separate
 * top-level tabs sitting side by side with every other My Company section:
 *
 *   - Email Templates: this tenant's notification-service pack + layout
 *     (banner + 16 brand colors) — see EmailTemplatesTab's own doc comment.
 *   - Notification Copy: per-event wording for system notifications (email
 *     always, SMS for the ~8 types that have one) — see
 *     NotificationCopyTab's own doc comment.
 *
 * Used to also have a third "SMS Templates" sub-tab (candidate-facing
 * RECRUITING SMS copy, reusing the same `SmsTemplatesTab` the Super Admin's
 * Company Settings screen used) — removed, along with that component and
 * its `tenant-service/CompanySettings/smsTemplates` API layer, because that
 * endpoint never existed on any backend and the tab only ever showed
 * "Failed to load SMS templates for this company." Not to be confused with
 * Notification Copy's own system-alert SMS above, a different, real system.
 *
 * Both remaining sub-tabs are gated on `canViewEmailTemplates` — this
 * component now renders nothing worth showing without it, so the caller
 * (MyCompany/index.tsx) gates the whole "Notification Settings" entry on
 * the same flag instead of rendering an empty section.
 */
const NotificationSettingsTab: React.FC<{ canViewEmailTemplates: boolean }> = ({
  canViewEmailTemplates,
}) => {
  const items: TabsProps['items'] = [
    canViewEmailTemplates && {
      key: 'email',
      label: 'Email Templates',
      children: <EmailTemplatesTab />,
    },
    canViewEmailTemplates && {
      key: 'copy',
      label: 'Notification Copy',
      children: <NotificationCopyTab />,
    },
  ].filter(Boolean) as TabsProps['items'];

  return <Tabs className="notification-settings-tabs" items={items} />;
};

export default NotificationSettingsTab;
