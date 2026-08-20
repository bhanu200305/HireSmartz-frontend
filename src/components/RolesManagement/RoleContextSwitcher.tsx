import React from 'react';
import { useListPlatformTenantsQuery } from '../../api/organization-service/Platform/tenants';
import type { RoleManagementContext } from './types';

type RoleContextSwitcherProps = {
  context: RoleManagementContext;
  onChange: (next: RoleManagementContext) => void;
};

/**
 * Master Super Admin only — lets them locally step into a client
 * organization's Company-tier role catalog without switching their actual
 * logged-in role (which would also change the sidebar/dashboard/etc). Mirrors
 * the wireframe's "Manage roles for" toggle.
 */
const RoleContextSwitcher: React.FC<RoleContextSwitcherProps> = ({ context, onChange }) => {
  const { data } = useListPlatformTenantsQuery({ limit: 100 });
  const tenants = data?.tenants ?? [];
  const mode: 'owner' | 'organization' = context.scope === 'platform' ? 'owner' : 'organization';

  const handleModeChange = (nextMode: 'owner' | 'organization') => {
    if (nextMode === 'owner') {
      onChange({ scope: 'platform' });
      return;
    }
    // Switching to "a client organization" reveals the picker but doesn't
    // resolve a catalog until a company is actually chosen — same "pick who
    // you're managing for first" rule the wireframe uses.
    onChange({ scope: 'tenant', tenantId: undefined, tenantName: undefined });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap bg-white border border-gray-200 rounded-xl px-4 py-2.5 mb-4">
      <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
        Manage roles for
      </span>

      <div className="inline-flex gap-1 bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => handleModeChange('owner')}
          className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            mode === 'owner' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'
          }`}
        >
          CareerForce Pro (CFP staff)
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('organization')}
          className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            mode === 'organization' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'
          }`}
        >
          A client organization
        </button>
      </div>

      {mode === 'organization' && (
        <select
          className="text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white"
          value={context.tenantId ?? ''}
          onChange={(e) => {
            const tenant = tenants.find((t) => t.tenant_id === e.target.value);
            onChange({
              scope: 'tenant',
              tenantId: tenant?.tenant_id,
              tenantName: tenant?.company_name,
            });
          }}
        >
          <option value="" disabled>
            Select a company…
          </option>
          {tenants.map((tenant) => (
            <option key={tenant.tenant_id} value={tenant.tenant_id}>
              {tenant.company_name}
            </option>
          ))}
        </select>
      )}

      {mode === 'organization' && context.tenantId && (
        <div className="flex items-center gap-2 text-xs text-primary-700 bg-primary-50 border border-primary-100 rounded-lg px-3 py-1.5">
          <span>
            Managing roles for <b>{context.tenantName}</b>.
          </span>
          <button
            type="button"
            className="underline font-semibold cursor-pointer"
            onClick={() =>
              onChange({ scope: 'tenant', tenantId: undefined, tenantName: undefined })
            }
          >
            Switch company
          </button>
        </div>
      )}
    </div>
  );
};

export default RoleContextSwitcher;
