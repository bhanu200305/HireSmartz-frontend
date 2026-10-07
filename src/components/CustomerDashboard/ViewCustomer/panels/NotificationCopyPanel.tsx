import React, { useMemo, useState } from 'react';
import { MdOutlineDescription, MdEdit, MdOutlineSearch, MdSms } from 'react-icons/md';
import { Badge, Typography } from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import { useListPlatformTenantOverridesQuery } from '../../../../api/notification-service/PlatformTemplateSettings/index';
import type { TemplateOverride } from '../../../../api/notification-service/TemplateSettings/index';
import PlatformEmailTemplateOverrideModal from './PlatformEmailTemplateOverrideModal';

const humanizeType = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    // Display-only: the backend's `notification_type` enum (still sent as-is
    // on save) spells these four `..._invited` — this reads "Invitation"
    // instead, matching `invitation_accepted`'s own noun form rather than
    // the odd-one-out adjective.
    .replace(/\bInvited\b/, 'Invitation');

/**
 * Super Admin's per-company "Notification copy" tab — this tenant's
 * overrides for notification-service's security/onboarding/lifecycle
 * messages, editable on their behalf. Split out from Email Templates (which
 * now only carries this company's brand colours) into its own tab beside
 * it: a pack/colour choice and editing individual message copy are
 * different jobs even though both hang off the same notification-service
 * settings.
 *
 * Same card-grid layout as MyCompany/NotificationCopyTab.tsx's tenant
 * self-service version (search box, SMS badge on the ~8 types that have
 * one) — this one uses the platform-mounted per-tenant override endpoints
 * (GET/PUT/DELETE .../notification-platform/template-settings/tenants/{id}/overrides)
 * instead, since a Super Admin is editing on the tenant's behalf.
 */
const NotificationCopyPanel: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data, isLoading } = useListPlatformTenantOverridesQuery(tenantId);
  const [search, setSearch] = useState('');
  const [editingOverride, setEditingOverride] = useState<TemplateOverride | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data?.overrides ?? [];
    return (data?.overrides ?? []).filter((override) =>
      humanizeType(override.notification_type).toLowerCase().includes(q)
    );
  }, [data, search]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Typography variant="h6" className="mb-1 block">
              Notification Copy
            </Typography>
            <Typography variant="caption" className="block text-gray-500">
              Every message Careerforce Pro can send on this company&apos;s behalf. Edit the ones
              that need this tenant&apos;s own words; the rest use the platform&apos;s default copy.
            </Typography>
          </div>
          <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
            {data?.overrides.length ?? 0} types
          </span>
        </div>

        <div className="relative mb-4 max-w-[320px]">
          <MdOutlineSearch
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Notification Types…"
            className="w-full rounded-full border border-[var(--border)] bg-gray-50/60 py-2 pl-8 pr-3 text-sm focus:border-primary-300 focus:bg-white focus:outline-none"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-gray-500">
            {data && data.overrides.length === 0
              ? 'No notification templates are seeded on this environment yet.'
              : 'No notification types match your search.'}
          </p>
        ) : (
          <div className="grid max-h-[520px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((override) => {
              const hasSms = override.sms_message != null;
              return (
                <button
                  key={override.notification_type}
                  type="button"
                  onClick={() => setEditingOverride(override)}
                  className="group relative flex cursor-pointer flex-col items-start gap-2.5 rounded-xl border border-[var(--border)] bg-gray-50/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:bg-white hover:shadow-md"
                >
                  <div className="absolute right-3 top-3 flex items-center gap-1.5">
                    {hasSms && (
                      <Badge status="warning" dot={false} className="!px-2">
                        <MdSms size={12} /> SMS
                      </Badge>
                    )}
                    <Badge status={override.is_customised ? 'info' : 'neutral'}>
                      {override.is_customised ? 'Customized' : 'Default'}
                    </Badge>
                  </div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-sm">
                    <MdOutlineDescription size={15} />
                  </span>
                  <Typography variant="body2" className="pr-16 font-medium text-gray-800">
                    {humanizeType(override.notification_type)}
                  </Typography>
                  <span className="mt-auto flex items-center gap-1 text-xs font-medium text-primary-600 opacity-0 transition-opacity group-hover:opacity-100">
                    <MdEdit size={13} /> Edit
                  </span>
                </button>
              );
            })}
          </div>
        )}
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

export default NotificationCopyPanel;
