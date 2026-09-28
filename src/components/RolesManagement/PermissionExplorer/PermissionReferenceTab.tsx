import React, { useEffect, useMemo, useState } from 'react';
import { Tooltip } from 'antd';
import { MdWarningAmber, MdChevronRight } from 'react-icons/md';
import { LuUsers } from 'react-icons/lu';
import { Search, Badge } from '../../shared';
import CollapsibleSection from '../../shared/ui/CollapsibleSection';
import { Loader } from '../../shared/ui/loader';
import { useDebouncedEffect } from '../../../hooks/useDebouncedEffect';
import { useGetPermissionCatalogQuery } from '../../../api/organization-service/Roles/permissionCatalog';
import { useLazyGetPermissionMatrixQuery } from '../../../api/organization-service/Roles/permissionMatrix';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
import {
  groupPermissionCatalogByCategory,
  roleDisplayName,
  type FlatPermissionEntry,
} from './permissionExplorer.helpers';
import PermissionHoldersModal from './PermissionHoldersModal';
import PersonPermissionsModal from './PersonPermissionsModal';

type PermissionReferenceTabProps = {
  /** False for a Company Admin session — platform-only resources are never
   * grantable to any company role, so they're filtered out entirely. */
  isMaster: boolean;
  tenantId?: string;
  /** True once a real company is in scope (a Company Admin's own tenant, or
   * a Super Admin who's picked one) — gates the "who has this" / "what can
   * this person do" lookups, which only ever apply to a company's users. */
  canLookupCompany: boolean;
};

const matchesSearch = (entry: FlatPermissionEntry, q: string): boolean =>
  entry.label.toLowerCase().includes(q) ||
  entry.code.toLowerCase().includes(q) ||
  entry.description.toLowerCase().includes(q);

/**
 * "What does each permission do" — the live catalog (GET /v1/roles/permissions),
 * grouped by category with a collapsible section per group. The same search
 * box also looks for matching PEOPLE (when a company is in scope): click a
 * permission to see who holds it, or click a matched person to see
 * everything they can do — both open as a modal rather than navigating away
 * from this list.
 */
const PermissionReferenceTab: React.FC<PermissionReferenceTabProps> = ({
  isMaster,
  tenantId,
  canLookupCompany,
}) => {
  const { data, isLoading, error } = useGetPermissionCatalogQuery();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [selectedPermission, setSelectedPermission] = useState<{
    code: string;
    label: string;
  } | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<{ id: string; name: string } | null>(null);

  useDebouncedEffect(() => setDebouncedSearch(search), [search], 300);

  const [searchPeople, { data: peopleData, isFetching: isSearchingPeople }] =
    useLazyGetPermissionMatrixQuery();

  useEffect(() => {
    if (!canLookupCompany || !debouncedSearch.trim()) return;
    searchPeople({
      tenantId: isMaster ? tenantId : undefined,
      q: debouncedSearch.trim(),
      limit: 5,
    });
  }, [canLookupCompany, debouncedSearch, tenantId, isMaster, searchPeople]);

  const matchedPeople = useMemo(
    () =>
      peopleData?.Organization_User_Permissions?.flatMap((org) => org.Users_Permission ?? []) ?? [],
    [peopleData]
  );

  const groups = useMemo(() => groupPermissionCatalogByCategory(data, isMaster), [data, isMaster]);
  const q = debouncedSearch.trim().toLowerCase();
  const categories = Object.keys(groups);
  const hasAnyPermissionMatch = categories.some((category) =>
    groups[category].some((entry) => !q || matchesSearch(entry, q))
  );

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
        placeholder={
          canLookupCompany
            ? 'Search by permission name, code, or a person…'
            : 'Search by name, code, or description…'
        }
        value={search}
        allowClear
        onSearch={setSearch}
        className="max-w-md"
      />

      {canLookupCompany && q && (
        <div className="bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            People matching &quot;{debouncedSearch}&quot;
          </h4>
          {isSearchingPeople ? (
            <div className="py-3 flex justify-center">
              <Loader />
            </div>
          ) : matchedPeople.length === 0 ? (
            <p className="text-xs text-gray-400">No people match.</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {matchedPeople.map((user) => {
                const roleNames = Array.from(
                  new Set((user.Location_Permission ?? []).flatMap((lp) => lp.Roles ?? []))
                );
                return (
                  <button
                    key={user.User_Id}
                    type="button"
                    onClick={() => setSelectedPerson({ id: user.User_Id, name: user.User_Name })}
                    className="w-full flex items-center justify-between gap-3 py-2 text-left cursor-pointer hover:bg-white rounded-lg px-2 -mx-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {user.User_Name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {user.Email} · {roleNames.map(roleDisplayName).join(', ') || 'No role'}
                      </div>
                    </div>
                    <MdChevronRight className="text-gray-300 shrink-0" size={18} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {categories.map((category) => {
        const entries = groups[category].filter((entry) => !q || matchesSearch(entry, q));
        if (entries.length === 0) return null;

        return (
          <CollapsibleSection key={category} title={category} defaultOpen>
            <div className="flex flex-col divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
              {entries.map((entry) => (
                <div key={entry.code} className="flex items-start justify-between gap-3 px-4 py-3">
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
                    {entry.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{entry.description}</p>
                    )}
                  </div>
                  {canLookupCompany && (
                    <Tooltip title="See who has this permission">
                      <button
                        type="button"
                        aria-label={`See who has ${entry.label}`}
                        onClick={() =>
                          setSelectedPermission({ code: entry.code, label: entry.label })
                        }
                        className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full text-gray-400 hover:text-primary-600 hover:bg-primary-50 cursor-pointer transition-colors"
                      >
                        <LuUsers size={16} strokeWidth={2} />
                      </button>
                    </Tooltip>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        );
      })}

      {q && !hasAnyPermissionMatch && matchedPeople.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">
          No permissions or people match &quot;{search}&quot;.
        </p>
      )}

      {selectedPermission && (
        <PermissionHoldersModal
          open={Boolean(selectedPermission)}
          onClose={() => setSelectedPermission(null)}
          tenantId={tenantId}
          isMaster={isMaster}
          code={selectedPermission.code}
          label={selectedPermission.label}
        />
      )}

      {selectedPerson && (
        <PersonPermissionsModal
          open={Boolean(selectedPerson)}
          onClose={() => setSelectedPerson(null)}
          tenantId={tenantId}
          isMaster={isMaster}
          userId={selectedPerson.id}
          userName={selectedPerson.name}
        />
      )}
    </div>
  );
};

export default PermissionReferenceTab;
