import React, { useMemo, useState } from 'react';
import { MdOutlineDescription, MdEdit, MdOutlineSearch, MdSms } from 'react-icons/md';
import { Badge, Typography } from '../shared';
import { Loader } from '../shared/ui/loader';
import {
  TemplateOverride,
  useListTemplateOverridesQuery,
} from '../../api/notification-service/TemplateSettings/index';
import EmailTemplateOverrideModal from './EmailTemplateOverrideModal';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';

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
 * `GET /v1/template-settings/overrides` — every system notification
 * Careerforce Pro can send on this tenant's behalf (invites, password
 * resets, MFA codes, account-locked alerts, …), whether or not this tenant
 * has customised it. Distinct from the OTHER "SMS Templates" tab on this
 * page, which is a separate, candidate-facing recruiting-SMS feature with
 * its own backend — a type showing an "SMS" tag here is a system alert
 * (like an MFA code), not candidate messaging.
 *
 * Split out of EmailTemplatesTab (which now covers only the pack + brand
 * colors) into its own tab so this list — 38 notification types — isn't
 * competing for space with theme controls, and redesigned as the same
 * card-grid `TenantOverrideSection`/`MasterSmsTemplatesSection` already use
 * elsewhere, replacing the plain divided-row list this screen carried since
 * the tenant self-service integration first landed.
 */
const NotificationCopyTab: React.FC = () => {
  const { data, isLoading } = useListTemplateOverridesQuery();
  const [search, setSearch] = useState('');
  const [editingOverride, setEditingOverride] = useState<TemplateOverride | null>(null);
  const canEdit = useHasAccess(Authorities.EMAIL_TEMPLATE_EDIT);

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
              Every system message Careerforce Pro can send on your behalf. Edit the ones you&apos;d
              like in your own words; the rest use the platform&apos;s default copy inside your
              chosen pack.
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
            placeholder="Search notification types…"
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
                  {canEdit && (
                    <span className="mt-auto flex items-center gap-1 text-xs font-medium text-primary-600 opacity-0 transition-opacity group-hover:opacity-100">
                      <MdEdit size={13} /> Edit
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <EmailTemplateOverrideModal
        open={editingOverride !== null}
        override={editingOverride}
        onClose={() => setEditingOverride(null)}
      />
    </div>
  );
};

export default NotificationCopyTab;
