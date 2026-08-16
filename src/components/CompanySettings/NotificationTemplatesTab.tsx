import React from 'react';
import MasterEmailTemplatesSection from './MasterEmailTemplatesSection';
import MasterSmsTemplatesSection from './MasterSmsTemplatesSection';
import TenantOverrideSection from './TenantOverrideSection';

/**
 * Super Admin's notification-service template management —
 * `/v1/platform/template-settings/*`. Deliberately a SEPARATE tab from the
 * existing "Email Templates Config" / "SMS Templates" tabs on this page,
 * which manage a different, unrelated feature (candidate-facing recruiting
 * email/SMS branding, not this platform's system notification catalogue —
 * see this integration's notes for why those two were left untouched).
 */
const NotificationTemplatesTab: React.FC = () => {
  return (
    <div className="flex flex-col gap-4 p-4">
      <MasterEmailTemplatesSection />
      <MasterSmsTemplatesSection />
      <TenantOverrideSection />
    </div>
  );
};

export default NotificationTemplatesTab;
