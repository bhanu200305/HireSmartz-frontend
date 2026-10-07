import React, { useState } from 'react';
import { Select } from 'antd';
import { MdOutlineDescription, MdEdit, MdOutlineSearch } from 'react-icons/md';
import { Badge, Typography } from '../shared';
import { Loader } from '../shared/ui/loader';
import { useListPlatformTenantsQuery } from '../../api/organization-service/Platform/tenants';
import { useListPlatformTenantOverridesQuery } from '../../api/notification-service/PlatformTemplateSettings/index';
import type { TemplateOverride } from '../../api/notification-service/TemplateSettings/index';
import TenantOverridePlatformModal from './TenantOverridePlatformModal';

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
 * Support/override action: look up one tenant and edit or revert their
 * notification template on their behalf —
 * `/v1/notification-platform/template-settings/tenants/{tenant_id}/overrides`.
 */
const TenantOverrideSection: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [editingOverride, setEditingOverride] = useState<TemplateOverride | null>(null);

  const { data: tenantResults, isFetching: isSearching } = useListPlatformTenantsQuery(
    { q: search, limit: 20 },
    { skip: search.trim().length < 2 }
  );
  const { data: overrides, isLoading: isLoadingOverrides } = useListPlatformTenantOverridesQuery(
    selectedTenantId ?? '',
    { skip: !selectedTenantId }
  );

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
      <Typography variant="h6" className="mb-1 block">
        Edit a tenant&apos;s templates on their behalf
      </Typography>
      <Typography variant="caption" className="mb-4 block text-gray-500">
        Search for a company, then edit or revert the same customizations they&apos;d manage
        themselves from My Company → Email Templates.
      </Typography>

      <div className="relative max-w-[420px]">
        <MdOutlineSearch
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={16}
        />
        <Select
          showSearch
          allowClear
          placeholder="Search Companies by Name…"
          filterOption={false}
          loading={isSearching}
          value={selectedTenantId}
          onSearch={setSearch}
          onChange={(value) => setSelectedTenantId(value ?? null)}
          onClear={() => setSelectedTenantId(null)}
          options={tenantResults?.tenants.map((tenant) => ({
            value: tenant.tenant_id,
            label: tenant.company_name,
          }))}
          className="w-full [&_.ant-select-selector]:!rounded-full [&_.ant-select-selector]:!pl-8"
        />
      </div>

      {selectedTenantId && (
        <div className="mt-4">
          {isLoadingOverrides ? (
            <Loader />
          ) : (
            <>
              <div className="grid max-h-[380px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                {overrides?.overrides.map((override) => (
                  <button
                    key={override.notification_type}
                    type="button"
                    onClick={() => setEditingOverride(override)}
                    className="group relative flex cursor-pointer flex-col items-start gap-2.5 rounded-xl border border-[var(--border)] bg-gray-50/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:bg-white hover:shadow-md"
                  >
                    <Badge
                      status={override.is_customised ? 'info' : 'neutral'}
                      className="absolute right-3 top-3"
                    >
                      {override.is_customised ? 'Customized' : 'Default'}
                    </Badge>
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
                ))}
              </div>
              {overrides && overrides.overrides.length === 0 && (
                <p className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-gray-500">
                  No notification templates are seeded on this environment yet.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {selectedTenantId && (
        <TenantOverridePlatformModal
          tenantId={selectedTenantId}
          override={editingOverride}
          onClose={() => setEditingOverride(null)}
        />
      )}
    </section>
  );
};

export default TenantOverrideSection;
