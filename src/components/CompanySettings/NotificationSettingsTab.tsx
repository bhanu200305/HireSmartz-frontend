import React from 'react';
import { Tabs } from 'antd';
import NotificationTemplatesTab from './NotificationTemplatesTab';
import SmsTemplatesTab from './SmsTemplatesTab';

/**
 * "Notification Settings" — one top-level tab collecting everything that
 * shapes the platform's own outgoing notifications, instead of two
 * unrelated-looking top-level tabs (previously "SMS Templates" and
 * "Notification Templates") sitting side by side with master-data tabs
 * like Industries/Departments/Job Titles.
 *
 * The "Notification Templates" sub-tab below is the same
 * `NotificationTemplatesTab` component this screen already had (name
 * unchanged, on purpose — see below). It covers Email defaults, Theme
 * defaults, Company theme, SMS defaults, Tenant overrides, and Bulk revert,
 * all real, against `/v1/notification-platform/template-settings/*` — that's what
 * answers the recurring "why is there no Email Templates in Company
 * Settings" question, this tab always covered it. See that component's own
 * doc comment for why an actual "Email Templates" tab that predated it was
 * removed instead of kept (dead legacy `tenant-service` endpoint, every
 * save 404'd).
 *
 * Deliberately NOT relabeled to "Email Templates" (an earlier version of
 * this consolidation did, briefly) — that section's own "SMS defaults"
 * sub-item would then read as living inside something called "Email
 * Templates," right beside a *different* sibling tab also named "SMS
 * Templates." Two different things both named "SMS ___", one nested inside
 * something literally called "Email Templates", is confusing regardless of
 * whether the underlying systems overlap (they don't — see SMS Templates'
 * own comment below). The new parent tab name ("Notification Settings")
 * already makes this discoverable without needing the sub-tab itself to
 * say "Email".
 *
 * SMS Templates is a genuinely separate system (its own
 * `tenant-service/CompanySettings/smsTemplates` backend, candidate-facing
 * per-interview-round copy — not to be confused with "Notification
 * Templates → SMS defaults" above, the system-alert SMS variant of the same
 * catalogue as its own Email defaults) — grouped here because it's still
 * "notification settings" from a user's point of view, not because it
 * shares a backend with Notification Templates.
 */
const NotificationSettingsTab: React.FC = () => {
  return (
    <Tabs
      className="notification-settings-tabs"
      items={[
        {
          key: 'notifications',
          label: 'Notification Templates',
          children: <NotificationTemplatesTab />,
        },
        { key: 'sms', label: 'SMS Templates', children: <SmsTemplatesTab /> },
      ]}
    />
  );
};

export default NotificationSettingsTab;
