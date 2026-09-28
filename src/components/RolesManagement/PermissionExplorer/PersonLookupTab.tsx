import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '../../shared';
import CollapsibleSection from '../../shared/ui/CollapsibleSection';
import { Loader } from '../../shared/ui/loader';
import { useDebouncedEffect } from '../../../hooks/useDebouncedEffect';
import {
  useLazyGetPermissionMatrixQuery,
  useGetPermissionMatrixQuery,
  type MatrixUser,
  type PermissionDetail,
} from '../../../api/organization-service/Roles/permissionMatrix';
import { useGetPermissionCatalogQuery } from '../../../api/organization-service/Roles/permissionCatalog';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
import { flattenPermissionCatalog, roleDisplayName } from './permissionExplorer.helpers';

type PersonLookupTabProps = {
  tenantId?: string;
  isMaster: boolean;
};

const groupByCategory = (details: PermissionDetail[]): Record<string, PermissionDetail[]> => {
  const groups: Record<string, PermissionDetail[]> = {};
  details.forEach((detail) => {
    if (!groups[detail.category]) groups[detail.category] = [];
    groups[detail.category].push(detail);
  });
  return groups;
};

/**
 * "Type a name and see their permissions" — a debounced typeahead
 * (GET /v1/roles/permission-matrix?q=) followed by a full explain lookup
 * (?user_id=&explain=true) once a person is picked.
 */
const PersonLookupTab: React.FC<PersonLookupTabProps> = ({ tenantId, isMaster }) => {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [selected, setSelected] = useState<MatrixUser | null>(null);
  const [showResults, setShowResults] = useState(false);

  const { data: catalog } = useGetPermissionCatalogQuery();
  const catalogByCode = useMemo(() => {
    const map = new Map<string, string>();
    flattenPermissionCatalog(catalog).forEach((entry) => map.set(entry.code, entry.label));
    return map;
  }, [catalog]);

  useDebouncedEffect(() => setDebouncedQ(q), [q], 300);

  const [triggerSearch, { data: searchData, isFetching: isSearching }] =
    useLazyGetPermissionMatrixQuery();

  useEffect(() => {
    if (!debouncedQ.trim() || (isMaster && !tenantId)) return;
    triggerSearch({ tenantId, q: debouncedQ, limit: 10 });
  }, [debouncedQ, tenantId, isMaster, triggerSearch]);

  const searchResults = useMemo(
    () => searchData?.Organization_User_Permissions.flatMap((org) => org.Users_Permission) ?? [],
    [searchData]
  );

  const {
    data: detailData,
    isLoading: isDetailLoading,
    error: detailError,
  } = useGetPermissionMatrixQuery(
    { tenantId, userId: selected?.User_Id, explain: true },
    { skip: !selected }
  );

  const person = detailData?.Organization_User_Permissions[0]?.Users_Permission[0];
  const groups = useMemo(() => groupByCategory(person?.Permission_Details ?? []), [person]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-md">
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 150)}
          placeholder="Search by name or email…"
          className="w-full text-sm border border-gray-200 rounded-full px-4 py-2 outline-none focus:border-primary-400"
        />

        {showResults && debouncedQ.trim() && (
          <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
            {isSearching ? (
              <div className="px-3 py-3 flex justify-center">
                <Loader />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400">No one matches.</div>
            ) : (
              searchResults.map((user) => {
                const roleNames = Array.from(
                  new Set(user.Location_Permission.flatMap((lp) => lp.Roles))
                );
                return (
                  <button
                    key={user.User_Id}
                    type="button"
                    onMouseDown={() => {
                      setSelected(user);
                      setQ(user.User_Name);
                      setShowResults(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-gray-900">{user.User_Name}</div>
                    <div className="text-xs text-gray-500">
                      {user.Email} · {roleNames.map(roleDisplayName).join(', ') || 'No role'}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {!selected ? (
        <div className="py-16 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
          <p className="text-sm text-gray-500">
            Search for a person above to see what they can do.
          </p>
        </div>
      ) : isDetailLoading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader />
        </div>
      ) : detailError ? (
        <div className="py-16 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
          <p className="text-sm text-danger-solid">
            {getOrgErrorMessage(detailError, "Failed to load this person's permissions.")}
          </p>
        </div>
      ) : person ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">{person.User_Name}</div>
              <div className="text-xs text-gray-500">{person.Email}</div>
            </div>
            <Badge status={person.Is_Active ? 'success' : 'neutral'}>
              {person.Is_Active ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {Object.keys(groups).map((category) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {category}
              </h4>
              <div className="flex flex-col divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
                {groups[category].map((detail) => (
                  <div key={detail.code} className="flex flex-col gap-1.5 px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{detail.label}</span>
                      <code className="text-[11px] font-mono text-gray-400 bg-gray-50 rounded px-1.5 py-0.5">
                        {detail.code}
                      </code>
                    </div>
                    <p className="text-xs text-gray-500">{detail.description}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {detail.via_roles.map((role) => (
                        <Badge key={role} status="neutral" dot={false}>
                          via {roleDisplayName(role)}
                        </Badge>
                      ))}
                      {detail.direct_grant && (
                        <Badge status="info" dot={false}>
                          Individual grant
                        </Badge>
                      )}
                      <Badge status="neutral" dot={false}>
                        {detail.all_locations
                          ? 'All offices'
                          : detail.locations.map((l) => l.label).join(', ') || 'No offices'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {person.Location_Permission.length > 0 && (
            <CollapsibleSection title="By office">
              <div className="flex flex-col gap-3">
                {person.Location_Permission.map((lp) => (
                  <div
                    key={lp.Location_Id}
                    className="border border-gray-200 rounded-xl px-4 py-3 bg-white"
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-sm font-semibold text-gray-900">
                        {lp.Location_Id === 'ALL_LOCATIONS'
                          ? 'All offices'
                          : (lp.Location_Name ?? lp.Location_Id)}
                      </span>
                      {lp.Roles.map((role) => (
                        <Badge key={role} status="neutral" dot={false}>
                          {roleDisplayName(role)}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {Object.entries(lp.Permissions).map(([resource, actions]) => (
                        <span key={resource} className="text-xs text-gray-500">
                          {resource}: {actions.join(', ')}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {(person.Denied_Permissions?.length ?? 0) > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-danger-text uppercase tracking-wide mb-2">
                Taken away
              </h4>
              <div className="flex items-center gap-1.5 flex-wrap bg-danger-bg/40 border border-danger-bg rounded-xl px-4 py-3">
                {person.Denied_Permissions?.map((code) => (
                  <Badge key={code} status="danger" dot={false}>
                    {catalogByCode.get(code) ?? code}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default PersonLookupTab;
