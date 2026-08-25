import React, { useState } from 'react';
import { Badge, Typography, Button } from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import EmailBrandingEditor from '../../../shared/EmailBrandingEditor';
import { useListPlatformTenantOverridesQuery } from '../../../../api/notification-service/PlatformTemplateSettings/index';
import type { TemplateOverride } from '../../../../api/notification-service/TemplateSettings/index';
import PlatformEmailTemplateOverrideModal from './PlatformEmailTemplateOverrideModal';

const humanizeType = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

/**
 * Super Admin's per-company Email Templates tab. Two, deliberately
 * unrelated, features stacked in one tab (same convention MyCompany's own
 * EmailTemplatesTab.tsx uses for its PackPicker/OverridesTable/
 * EmailLayoutSection trio):
 *
 *   1. EmailBrandingEditor — this company's candidate-facing recruiting
 *      email banner/brand colors (CompanySettings/EmailTemplateConfigAdminTab.tsx's
 *      platform-wide tool, pre-scoped to this one tenant_id instead of a
 *      company picker).
 *   2. The "notification copy" section below — this tenant's overrides for
 *      notification-service's security/onboarding/lifecycle messages,
 *      editable on their behalf. No pack picker or layout editor here: only
 *      the per-tenant override endpoints have a confirmed platform-mounted
 *      equivalent (GET/PUT/DELETE .../platform/template-settings/tenants/{id}/overrides).
 *      Same section card styling as CompanySettings/TenantOverrideSection.tsx.
 */
const EmailTemplatesPanel: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data, isLoading } = useListPlatformTenantOverridesQuery(tenantId);
  const [editingOverride, setEditingOverride] = useState<TemplateOverride | null>(null);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="p-4 flex flex-col gap-6">
      <EmailBrandingEditor companyId={tenantId} />

      <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
        <Typography variant="h6" className="mb-1 block">
          Notification copy
        </Typography>
        <Typography variant="caption" className="mb-4 block text-gray-500">
          Every message CareerForce Pro can send on this company&apos;s behalf. Edit the ones that
          need this tenant&apos;s own words — the rest use the platform&apos;s default copy.
        </Typography>

        <div className="divide-y overflow-hidden rounded-xl border">
          {data?.overrides.map((override) => (
            <div
              key={override.notification_type}
              className="flex items-center justify-between gap-3 p-4"
            >
              <div className="flex items-center gap-2">
                <Typography variant="body1">{humanizeType(override.notification_type)}</Typography>
                <Badge status={override.is_customised ? 'info' : 'neutral'}>
                  {override.is_customised ? 'Customised' : 'Default'}
                </Badge>
              </div>
              <Button
                type="button"
                appname="edit notification template"
                onClick={() => setEditingOverride(override)}
                className="rounded-3xl border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Edit
              </Button>
            </div>
          ))}
          {data && data.overrides.length === 0 && (
            <p className="p-4 text-sm text-gray-500">
              No notification templates are seeded on this environment yet.
            </p>
          )}
        </div>
      </section>

      <PlatformEmailTemplateOverrideModal
        open={editingOverride !== null}
        tenantId={tenantId}
        override={editingOverride}
        onClose={() => setEditingOverride(null)}
      />
    </div>
  );
};

export default EmailTemplatesPanel;
