import React, { useState } from 'react';
import { Select } from 'antd';
import { Badge, Button, Typography } from '../shared';
import { Loader } from '../shared/ui/loader';
import { useListPlatformTenantsQuery } from '../../api/organization-service/Platform/tenants';
import { useListPlatformTenantOverridesQuery } from '../../api/notification-service/PlatformTemplateSettings/index';
import type { TemplateOverride } from '../../api/notification-service/TemplateSettings/index';
import TenantOverridePlatformModal from './TenantOverridePlatformModal';

const humanizeType = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

/**
 * Support/override action: look up one tenant and edit or revert their
 * notification template on their behalf —
 * `/v1/platform/template-settings/tenants/{tenant_id}/overrides`.
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
        Search for a company, then edit or revert the same customisations they&apos;d manage
        themselves from My Company → Email Templates.
      </Typography>

      <Select
        showSearch
        allowClear
        placeholder="Search companies by name…"
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
        style={{ width: '100%', maxWidth: 420 }}
      />

      {selectedTenantId && (
        <div className="mt-4">
          {isLoadingOverrides ? (
            <Loader />
          ) : (
            <div className="divide-y overflow-hidden rounded-xl border">
              {overrides?.overrides.map((override) => (
                <div
                  key={override.notification_type}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div className="flex items-center gap-2">
                    <Typography variant="body1">
                      {humanizeType(override.notification_type)}
                    </Typography>
                    <Badge status={override.is_customised ? 'info' : 'neutral'}>
                      {override.is_customised ? 'Customised' : 'Default'}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    appname="edit tenant template as platform"
                    onClick={() => setEditingOverride(override)}
                    className="rounded-3xl border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Edit
                  </Button>
                </div>
              ))}
              {overrides && overrides.overrides.length === 0 && (
                <p className="p-4 text-sm text-gray-500">
                  No notification templates are seeded on this environment yet.
                </p>
              )}
            </div>
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
