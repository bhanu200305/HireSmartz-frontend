import React from 'react';
import { Tabs } from 'antd';
import type { TabsProps } from 'antd';
import EmailTemplatesTab from './EmailTemplatesTab';
import NotificationCopyTab from './NotificationCopyTab';
import SmsTemplatesTab from '../CompanySettings/SmsTemplatesTab';

/**
 * "Notification Settings" — one top-level tab collecting everything that
 * shapes what this tenant sends candidates/staff, instead of three
 * unrelated-looking top-level tabs (Email Templates, Notification Copy, SMS
 * Templates) sitting side by side with every other My Company section.
 * Purely a navigation regrouping — none of the three sub-tabs below changed
 * behavior, data, or backend calls, they just moved one level deeper:
 *
 *   - Email Templates: this tenant's notification-service pack + layout
 *     (banner + 16 brand colors) — see EmailTemplatesTab's own doc comment.
 *   - Notification Copy: per-event wording for system notifications (email
 *     always, SMS for the ~8 types that have one) — see
 *     NotificationCopyTab's own doc comment.
 *   - SMS Templates: candidate-facing RECRUITING SMS copy, a different
 *     system entirely (its own backend, job/candidate-workflow-adjacent) —
 *     not to be confused with Notification Copy's system-alert SMS above.
 *     Same SmsTemplatesTab the Super Admin's Company Settings screen uses,
 *     with `fixedCompanyId` pinned to this tenant and the company picker
 *     hidden.
 *
 * `canViewEmailTemplates` only gates the first two sub-tabs — SMS Templates
 * never had a permission gate of its own before this tab existed (it was an
 * unconditional top-level tab), so it stays unconditional here too rather
 * than silently picking up a gate it never had, now that it shares a parent
 * with two sub-tabs that do.
 */
const NotificationSettingsTab: React.FC<{ tenantId: string; canViewEmailTemplates: boolean }> = ({
  tenantId,
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
    {
      key: 'sms',
      label: 'SMS Templates',
      children: <SmsTemplatesTab fixedCompanyId={tenantId} showCompanySelect={false} />,
    },
  ].filter(Boolean) as TabsProps['items'];

  return <Tabs className="notification-settings-tabs" items={items} />;
};

export default NotificationSettingsTab;
