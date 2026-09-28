import React, { useMemo } from 'react';
import { MdWarningAmber } from 'react-icons/md';
import { CustomCheckbox } from './checkbox';
import { Badge } from './badge';
import InfoHint from './InfoHint';
import { Loader } from './loader';
import { Authorities } from '../../../constants/authorities.constant';
import { useGetPermissionCatalogQuery } from '../../../api/organization-service/Roles/permissionCatalog';
import type { RoleScope } from '../../../types';

type PermissionMatrixProps = {
  /** Currently checked permission codes. */
  value: Authorities[];
  onChange: (next: Authorities[]) => void;
  /**
   * The permissions the acting user is allowed to grant — the escalation
   * ceiling (see getAssignablePermissionCeiling). Anything outside this set
   * is not rendered at all: a role can only ever be narrowed from what its
   * creator already holds, never widened past it, and there is nothing
   * useful to show for a box nobody in this conversation can ever check.
   */
  ceiling: Authorities[];
  /** Which audience this matrix is being built for — 'platform' resources
   * (never grantable to a company role) are dropped entirely for 'tenant'. */
  scope: RoleScope;
  /** Renders every checkbox disabled/read-only (e.g. an immutable system role). */
  disabled?: boolean;
  className?: string;
};

/**
 * Resource-grouped checkbox matrix over the LIVE permission catalog
 * (`GET /v1/roles/permissions`) — the picker a super admin/company admin
 * uses to build or edit a role's permission set (baseline or a per-location
 * override).
 *
 * Sourced from the live catalog rather than a hand-maintained static list.
 * `ListPermissionCatalogUseCase`'s own docstring explains why: organization-
 * service's `master_permission` table is an OPEN set — any other service can
 * insert a new grantable resource via its own migration, with nothing here
 * needing a redeploy. A prior version of this component iterated a
 * hand-maintained ~114-entry list while the live catalog had already grown
 * to ~176 real codes — the ~60 missing ones could never be granted to any
 * custom role through this screen, no matter who was creating it.
 */
const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  value,
  onChange,
  ceiling,
  scope,
  disabled = false,
  className = '',
}) => {
  const { data: catalog, isLoading, isError, refetch } = useGetPermissionCatalogQuery();
  const selected = useMemo(() => new Set(value), [value]);
  const ceilingSet = useMemo(() => new Set(ceiling), [ceiling]);

  const togglePermission = (code: Authorities, checked: boolean) => {
    const next = new Set(value);
    if (checked) next.add(code);
    else next.delete(code);
    onChange(Array.from(next));
  };

  const toggleResource = (codes: Authorities[], checked: boolean) => {
    const next = new Set(value);
    codes.forEach((code) => {
      if (!ceilingSet.has(code)) return; // never grant outside the ceiling
      if (checked) next.add(code);
      else next.delete(code);
    });
    onChange(Array.from(next));
  };

  if (isLoading) {
    return (
      <div className={`flex justify-center py-10 ${className}`}>
        <Loader />
      </div>
    );
  }

  if (isError || !catalog) {
    return (
      <div
        className={`rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center ${className}`}
      >
        <p className="text-sm text-gray-500 mb-2">Couldn&apos;t load the permission list.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs font-semibold text-primary-600 hover:underline cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  // 'both'-audience resources (checked server-side on a tenant AND a
  // platform screen, e.g. Users) pass this filter for either scope — only a
  // resource that is EXCLUSIVELY platform-side drops out of a tenant matrix.
  const resources = catalog.resources.filter(
    (resource) => scope !== 'tenant' || resource.audience !== 'platform'
  );

  return (
    <div className={`flex flex-col gap-y-6 ${className}`}>
      {resources.map((resource) => {
        // Only permissions the acting user actually holds are ever shown —
        // a resource where they hold none of them has nothing to render.
        const grantable = resource.actions.filter((action) =>
          ceilingSet.has(action.code as Authorities)
        );
        if (grantable.length === 0) return null;

        const selectedInResource = grantable.filter((action) =>
          selected.has(action.code as Authorities)
        );
        const allSelected = selectedInResource.length === grantable.length;
        const someSelected = selectedInResource.length > 0 && !allSelected;

        return (
          <div
            key={resource.resource}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5 border-b border-gray-200">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                {resource.label}
                {resource.description && <InfoHint content={resource.description} />}
              </span>
              {!disabled && (
                <CustomCheckbox
                  label="Select all"
                  checked={allSelected}
                  onChange={(e) =>
                    toggleResource(
                      grantable.map((action) => action.code as Authorities),
                      e.target.checked
                    )
                  }
                  className={someSelected ? 'ant-checkbox-indeterminate-label' : ''}
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3">
              {grantable.map((action) => (
                <div key={action.code} className="inline-flex items-center gap-1">
                  <CustomCheckbox
                    label={action.label}
                    checked={selected.has(action.code as Authorities)}
                    disabled={disabled}
                    onChange={(e) =>
                      togglePermission(action.code as Authorities, e.target.checked)
                    }
                  />
                  {action.description && <InfoHint content={action.description} />}
                  {action.sensitive && (
                    <span
                      title="Sensitive: deletes, exports, role changes, or invites."
                      className="inline-flex items-center text-warning-text"
                    >
                      <MdWarningAmber size={13} />
                    </span>
                  )}
                  {!action.enforced && (
                    <Badge status="neutral" dot={false} className="!px-1.5 !py-0.5 !text-[10px]">
                      Not in use yet
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PermissionMatrix;
