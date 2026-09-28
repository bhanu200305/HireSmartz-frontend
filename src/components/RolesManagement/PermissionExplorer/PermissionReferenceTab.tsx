import React, { useMemo, useState } from 'react';
import { MdWarningAmber } from 'react-icons/md';
import { Search, Badge } from '../../shared';
import CollapsibleSection from '../../shared/ui/CollapsibleSection';
import { Loader } from '../../shared/ui/loader';
import { useGetPermissionCatalogQuery } from '../../../api/organization-service/Roles/permissionCatalog';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
import {
  groupPermissionCatalogByCategory,
  type FlatPermissionEntry,
} from './permissionExplorer.helpers';

type PermissionReferenceTabProps = {
  /** False for a Company Admin session — platform-only resources are never
   * grantable to any company role, so they're filtered out entirely. */
  isMaster: boolean;
};

const matchesSearch = (entry: FlatPermissionEntry, q: string): boolean =>
  entry.label.toLowerCase().includes(q) ||
  entry.code.toLowerCase().includes(q) ||
  entry.description.toLowerCase().includes(q);

/**
 * "What does each permission do" — the live 176-code catalog
 * (GET /v1/roles/permissions), grouped by category with a client-side
 * search. Visible to both platform and tenant scope (see Index.tsx's tab
 * visibility rule) — this is the one screen a CFP-platform session still
 * gets.
 */
const PermissionReferenceTab: React.FC<PermissionReferenceTabProps> = ({ isMaster }) => {
  const { data, isLoading, error } = useGetPermissionCatalogQuery();
  const [search, setSearch] = useState('');

  const groups = useMemo(() => groupPermissionCatalogByCategory(data, isMaster), [data, isMaster]);

  const q = search.trim().toLowerCase();
  const categories = Object.keys(groups);

  if (isLoading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
        <p className="text-sm text-danger-solid">
          {getOrgErrorMessage(error, 'Failed to load the permission catalog.')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Search
        appname="permission reference"
        placeholder="Search by name, code, or description…"
        value={search}
        allowClear
        onSearch={setSearch}
        className="max-w-md"
      />

      {categories.map((category) => {
        const entries = groups[category].filter((entry) => !q || matchesSearch(entry, q));
        if (entries.length === 0) return null;

        return (
          <CollapsibleSection key={category} title={category} defaultOpen>
            <div className="flex flex-col divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
              {entries.map((entry) => (
                <div key={entry.code} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{entry.label}</span>
                      <code className="text-[11px] font-mono text-gray-400 bg-gray-50 rounded px-1.5 py-0.5">
                        {entry.code}
                      </code>
                      {entry.sensitive && (
                        <span
                          title="Sensitive: deletes, exports, role changes, or invites."
                          className="inline-flex items-center text-warning-text"
                        >
                          <MdWarningAmber size={14} />
                        </span>
                      )}
                      {!entry.enforced && (
                        <Badge status="neutral" dot={false}>
                          Not in use yet
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{entry.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        );
      })}

      {q && categories.every((category) => groups[category].every((e) => !matchesSearch(e, q))) && (
        <p className="text-sm text-gray-400 text-center py-8">
          No permissions match &quot;{search}&quot;.
        </p>
      )}
    </div>
  );
};

export default PermissionReferenceTab;
