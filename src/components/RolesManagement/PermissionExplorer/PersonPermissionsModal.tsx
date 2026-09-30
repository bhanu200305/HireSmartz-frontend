import React, { useMemo } from 'react';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';
import CollapsibleSection from '../../shared/ui/CollapsibleSection';
import { Badge } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import {
  useGetPermissionMatrixQuery,
  type PermissionDetail,
} from '../../../api/organization-service/Roles/permissionMatrix';
import { usePlatformPermissionMatrix } from './usePlatformPermissionMatrix';
import { useGetPermissionCatalogQuery } from '../../../api/organization-service/Roles/permissionCatalog';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
import { flattenPermissionCatalog, roleDisplayName } from './permissionExplorer.helpers';

type PersonPermissionsModalProps = {
  open: boolean;
  onClose: () => void;
  tenantId?: string;
  isMaster: boolean;
  /** True when opened from the CFP-staff tier — sources this person's
   * permissions from `usePlatformPermissionMatrix` instead of the
   * tenant-scoped matrix endpoint. See `PermissionHoldersModal`'s identical
   * prop for why the tenant query would otherwise just 422. */
  platformScope?: boolean;
  /** Set when this specific person was matched by a CROSS-ORG search (opened
   * from the CFP-staff tier, but the match is one client company's user, not
   * CFP staff) — the one company they actually belong to. Overrides
   * `platformScope`: with this set, the lookup is the ordinary tenant-scoped
   * query bound to THIS tenant, same isolation any other platform-operator
   * read of a specific company gets, rather than the CFP-staff hook. */
  crossOrgTenantId?: string;
  /** Shown next to the person's name whenever `crossOrgTenantId` is set —
   * the whole point of a cross-org search is telling two same-named people
   * at different companies apart. */
  organizationName?: string;
  userId: string;
  userName: string;
};

/** A held permission, shown under whichever catalog category it resolves to
 * — carrying its own `label`/`description` from the catalog. */
type GroupedDetail = PermissionDetail & { label: string; description: string };

/**
 * Groups this person's held permissions by category. `GET
 * /v1/roles/permission-matrix?explain=true` populates
 * `Permission_Details[].category`/`.label`/`.description` directly from
 * organization-service's own curated `permission_definitions.py`, so those
 * are trusted first here. The static `PERMISSION_CATALOG` fallback (via
 * `flattenPermissionCatalog`) only kicks in for the rare permission this
 * endpoint doesn't have real text for; in that fallback path, a code the
 * catalog lists under more than one category (e.g. a user permission under
 * both "CFP Users" and "Organization Users") is deliberately shown under
 * EACH — holding it really does grant both.
 */
type CatalogLookup = Pick<
  ReturnType<typeof flattenPermissionCatalog>[number],
  'category' | 'label' | 'description'
>;

const groupByCategory = (
  details: PermissionDetail[],
  catalog: ReturnType<typeof flattenPermissionCatalog>
): Record<string, GroupedDetail[]> => {
  const groups: Record<string, GroupedDetail[]> = {};
  details.forEach((detail) => {
    if (detail.category && detail.label && detail.description) {
      if (!groups[detail.category]) groups[detail.category] = [];
      groups[detail.category].push(detail as GroupedDetail);
      return;
    }
    const matches = catalog.filter((entry) => entry.code === detail.code);
    const rows: CatalogLookup[] =
      matches.length > 0
        ? matches
        : [
            {
              category: detail.category || 'Other',
              label: detail.label || detail.code,
              description: detail.description || '',
            },
          ];
    rows.forEach((match) => {
      if (!groups[match.category]) groups[match.category] = [];
      groups[match.category].push({
        ...detail,
        label: match.label,
        description: match.description,
      });
    });
  });
  return groups;
};

/**
 * "What can this person do" — opened by clicking a person matched while
 * searching the reference list. GET /v1/roles/permission-matrix?explain=true
 * for a single user, same detail shape (Permission_Details/Denied_Permissions)
 * the old standalone Person Lookup screen rendered.
 */
const PersonPermissionsModal: React.FC<PersonPermissionsModalProps> = ({
  open,
  onClose,
  tenantId,
  isMaster,
  platformScope = false,
  crossOrgTenantId,
  organizationName,
  userId,
  userName,
}) => {
  // A cross-org match overrides `platformScope`: it's still opened from the
  // CFP-staff tier, but the person themself belongs to one specific client
  // company, not to CFP.
  const usePlatformSource = platformScope && !crossOrgTenantId;
  const tenantResult = useGetPermissionMatrixQuery(
    {
      tenantId: crossOrgTenantId ?? (isMaster ? tenantId : undefined),
      userId,
      explain: true,
    },
    { skip: !open || usePlatformSource }
  );
  const platformResult = usePlatformPermissionMatrix(
    { membershipId: userId },
    !open || !usePlatformSource
  );
  const { data, isLoading, error } = usePlatformSource ? platformResult : tenantResult;

  const person = data?.Organization_User_Permissions?.[0]?.Users_Permission?.[0];

  const { data: catalog } = useGetPermissionCatalogQuery();
  const flatCatalog = useMemo(() => flattenPermissionCatalog(catalog), [catalog]);
  const groups = useMemo(
    () => groupByCategory(person?.Permission_Details ?? [], flatCatalog),
    [person, flatCatalog]
  );
  const catalogByCode = useMemo(() => {
    const map = new Map<string, string>();
    flatCatalog.forEach((entry) => map.set(entry.code, entry.label));
    return map;
  }, [flatCatalog]);

  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title={`Permissions for ${userName}`}
      subtitle={
        crossOrgTenantId && organizationName ? (
          <span className="text-xs text-gray-500">{organizationName}</span>
        ) : undefined
      }
      modalProps={{ width: 640, maskClosable: true }}
    >
      <div className="max-h-[65vh] overflow-y-auto flex flex-col gap-4">
        {isLoading ? (
          <div className="py-10 flex items-center justify-center">
            <Loader />
          </div>
        ) : error ? (
          <p className="text-sm text-danger-solid text-center py-6">
            {getOrgErrorMessage(error, "Failed to load this person's permissions.")}
          </p>
        ) : !person ? (
          <p className="text-sm text-gray-500 text-center py-6">No details found.</p>
        ) : (
          <>
            {person.Email && <p className="text-xs text-gray-500">{person.Email}</p>}

            {Object.keys(groups).length === 0 ? (
              <p className="text-sm text-gray-500">This person holds no permissions.</p>
            ) : (
              Object.keys(groups).map((category) => (
                <CollapsibleSection key={category} title={category} defaultOpen>
                  <div className="flex flex-col divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
                    {groups[category].map((detail) => (
                      // Not just `detail.code` — a code held once can list
                      // twice under the same category with different labels
                      // (e.g. job:write as both "Create" and "Duplicate job
                      // openings"), which would otherwise collide as keys.
                      <div
                        key={`${detail.code}-${detail.label}`}
                        className="flex flex-col gap-1.5 px-4 py-3"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {detail.label}
                          </span>
                          <code className="text-[11px] font-mono text-gray-400 bg-gray-50 rounded px-1.5 py-0.5">
                            {detail.code}
                          </code>
                        </div>
                        {detail.description && (
                          <p className="text-xs text-gray-500">{detail.description}</p>
                        )}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(detail.via_roles ?? []).map((role) => (
                            <Badge key={role} status="neutral" dot={false}>
                              via {roleDisplayName(role)}
                            </Badge>
                          ))}
                          {detail.direct_grant && (
                            <Badge status="info" dot={false}>
                              Individual grant
                            </Badge>
                          )}
                          {/* Offices are a tenant-only concept — CFP staff
                           * permissions aren't scoped to one, so this badge
                           * would just be a confusing no-op for them. */}
                          {!usePlatformSource && (
                            <Badge status="neutral" dot={false}>
                              {detail.all_locations
                                ? 'All offices'
                                : (detail.locations ?? []).map((l) => l.label).join(', ') ||
                                  'No offices'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              ))
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
          </>
        )}
      </div>
    </AntdCommonModal>
  );
};

export default PersonPermissionsModal;
