import React from 'react';
import NotificationTemplatesTab from './NotificationTemplatesTab';

/**
 * "Notification Settings" — collects everything that shapes the platform's
 * own outgoing notifications. Used to also hold a sibling "SMS Templates"
 * sub-tab (candidate-facing, per-interview-round copy) — removed, along
 * with its `SmsTemplatesTab`/`tenant-service/CompanySettings/smsTemplates`
 * API layer, because that endpoint never existed on any backend (confirmed
 * repo-wide) and the tab only ever showed "Failed to load SMS templates for
 * this company." Not to be confused with `NotificationTemplatesTab`'s own
 * "SMS defaults" sub-item below, a different, real, working system (the
 * system-alert SMS variant of the same catalogue as its Email defaults).
 *
 * With only one sub-tab left, this renders `NotificationTemplatesTab`
 * directly instead of wrapping it in a one-item `<Tabs>` — same "skip the
 * redundant inner strip" treatment `CompanySettings/index.tsx` already
 * applies to any other single-leaf group.
 *
 * `NotificationTemplatesTab` covers Email defaults, Theme defaults, Company
 * theme, SMS defaults, Tenant overrides, and Bulk revert, all real, against
 * `/v1/notification-platform/template-settings/*` — that's what answers the
 * recurring "why is there no Email Templates in Company Settings" question,
 * this tab always covered it. See that component's own doc comment for why
 * an actual "Email Templates" tab that predated it was removed instead of
 * kept (dead legacy `tenant-service` endpoint, every save 404'd).
 */
const NotificationSettingsTab: React.FC = () => {
  return <NotificationTemplatesTab />;
};

export default NotificationSettingsTab;
