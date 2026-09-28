import React, { useMemo } from 'react';
import { MdWarningAmber } from 'react-icons/md';
import { CustomCheckbox } from './checkbox';
import { Badge } from './badge';
import InfoHint from './InfoHint';
import { Authorities, PermissionModule } from '../../../constants/authorities.constant';
import { groupCatalogByModule } from '../../../shared/utils/auth/rbac.helpers';
import { useGetPermissionCatalogQuery } from '../../../api/organization-service/Roles/permissionCatalog';
import type { RoleScope } from '../../../types';

/** One short sentence per module — hover text for the ⓘ next to each module
 * heading below. Covers every PermissionModule that can actually appear here
 * (PERMISSION_CATALOG only — see that constant's own module docstring for
 * why Dashboard/Job Configuration/Activity/My Company/Subscriptions are
 * excluded and so have no entry here). */
const MODULE_DESCRIPTIONS: Partial<Record<PermissionModule, string>> = {
  Company: 'Manage client companies on the platform: add, edit, approve, and archive tenants.',
  'Company Settings': "View and update this company's own profile and configuration.",
  'CFP Users': "Manage Careerforce Pro's internal staff accounts.",
  'Organization Users': "Manage a company's own team members.",
  'Departments & Locations': 'Manage departments and office locations.',
  'Team & Invitations': 'Send, update, and revoke invitations to join the team.',
  'Platform Administration':
    'Manage platform-wide staff, internal departments, and Super Admin invitations.',
  Masters: 'Manage shared catalogs like industries, job titles, and master departments.',
  'Interview Questions': 'Manage the question bank used during candidate interviews.',
  'Email Templates': 'Manage templates for emails sent to candidates and staff.',
  Candidates: 'Manage candidate records and their hiring pipeline.',
  Billing: 'View and manage billing records and invoices.',
  Reports: 'View and manage generated reports.',
  'Auth & Sessions': 'Manage login credentials and active sessions.',
  'Job Openings': 'Create, edit, close, and manage job openings.',
  'Roles & Permissions': 'Create and manage roles and what each one is allowed to do.',
};

/**
 * "CFP Users" and "Organization Users" are two headings over the exact same
 * `USER_VIEW`/`USER_ADD`/`USER_EDIT`/`USER_ARCHIVE` codes (see
 * authorities.constant.ts) — one for Careerforce Pro's own internal staff
 * (platform scope), one for a tenant's own team (tenant scope). Without this
 * filter, anyone who holds those codes sees the identical checkboxes twice,
 * under two headings, because both modules pass the same ceiling test. Only
 * one is ever relevant to a given role's scope, so the other is dropped
 * entirely rather than shown as a second, meaningless copy.
 */
const HIDDEN_MODULE_BY_SCOPE: Record<RoleScope, PermissionModule> = {
  tenant: 'CFP Users',
  platform: 'Organization Users',
};

/** Display label override — the surviving "Users" module (see above) reads
 * as plain "Users" rather than the audience-specific catalog heading, since
 * scope already makes clear which "users" are meant. */
const MODULE_DISPLAY_LABEL: Partial<Record<PermissionModule, string>> = {
  'CFP Users': 'Users',
  'Organization Users': 'Users',
};

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
  /** Which audience this matrix is being built for — see HIDDEN_MODULE_BY_SCOPE. */
  scope: RoleScope;
  /** Renders every checkbox disabled/read-only (e.g. an immutable system role). */
  disabled?: boolean;
  className?: string;
};

/**
 * Module-grouped checkbox matrix over the fixed permission catalog — the
 * picker a super admin/company admin uses to build or edit a role's
 * permission set (baseline or a per-location override).
 */
const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  value,
  onChange,
  ceiling,
  scope,
  disabled = false,
  className = '',
}) => {
  const groups = useMemo(() => groupCatalogByModule(), []);
  const hiddenModule = HIDDEN_MODULE_BY_SCOPE[scope];
  const selected = useMemo(() => new Set(value), [value]);
  const ceilingSet = useMemo(() => new Set(ceiling), [ceiling]);

  // Real backend label/description/sensitive/enforced metadata, layered onto
  // the existing static PERMISSION_CATALOG checkboxes below — enrichment
  // only, never a source of new checkboxes: what's grantable is still
  // decided entirely by `ceiling`/PERMISSION_CATALOG above. A failed or
  // still-loading fetch just means every row falls back to its existing
  // static MODULE_DESCRIPTIONS tooltip, so this component works the same as
  // before if the catalog call isn't warm yet.
  const { data: liveCatalog } = useGetPermissionCatalogQuery();
  const liveByCode = useMemo(() => {
    const map = new Map<string, { description: string; sensitive: boolean; enforced: boolean }>();
    (liveCatalog?.resources ?? []).forEach((resource) => {
      resource.actions.forEach((action) => {
        map.set(action.code, {
          description: action.description,
          sensitive: action.sensitive,
          enforced: action.enforced,
        });
      });
    });
    return map;
  }, [liveCatalog]);

  const togglePermission = (code: Authorities, checked: boolean) => {
    const next = new Set(value);
    if (checked) next.add(code);
    else next.delete(code);
    onChange(Array.from(next));
  };

  const toggleModule = (moduleName: PermissionModule, checked: boolean) => {
    const entries = groups[moduleName] || [];
    const next = new Set(value);
    entries.forEach((entry) => {
      if (!ceilingSet.has(entry.code)) return; // never grant outside the ceiling
      if (checked) next.add(entry.code);
      else next.delete(entry.code);
    });
    onChange(Array.from(next));
  };

  return (
    <div className={`flex flex-col gap-y-6 ${className}`}>
      {(Object.keys(groups) as PermissionModule[]).map((moduleName) => {
        if (moduleName === hiddenModule) return null;

        // Only permissions the acting user actually holds are ever shown —
        // a module where they hold none of them has nothing to render.
        const grantable = groups[moduleName].filter((entry) => ceilingSet.has(entry.code));
        if (grantable.length === 0) return null;

        const selectedInModule = grantable.filter((entry) => selected.has(entry.code));
        const allSelected = selectedInModule.length === grantable.length;
        const someSelected = selectedInModule.length > 0 && !allSelected;

        return (
          <div key={moduleName} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5 border-b border-gray-200">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                {MODULE_DISPLAY_LABEL[moduleName] ?? moduleName}
                {MODULE_DESCRIPTIONS[moduleName] && (
                  <InfoHint content={MODULE_DESCRIPTIONS[moduleName] as string} />
                )}
              </span>
              {!disabled && (
                <CustomCheckbox
                  label="Select all"
                  checked={allSelected}
                  onChange={(e) => toggleModule(moduleName, e.target.checked)}
                  className={someSelected ? 'ant-checkbox-indeterminate-label' : ''}
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3">
              {grantable.map((entry) => {
                const live = liveByCode.get(entry.code);
                return (
                  <div key={entry.code} className="inline-flex items-center gap-1">
                    <CustomCheckbox
                      label={entry.label}
                      checked={selected.has(entry.code)}
                      disabled={disabled}
                      onChange={(e) => togglePermission(entry.code, e.target.checked)}
                    />
                    {live && <InfoHint content={live.description} />}
                    {live?.sensitive && (
                      <span
                        title="Sensitive: deletes, exports, role changes, or invites."
                        className="inline-flex items-center text-warning-text"
                      >
                        <MdWarningAmber size={13} />
                      </span>
                    )}
                    {live && !live.enforced && (
                      <Badge status="neutral" dot={false} className="!px-1.5 !py-0.5 !text-[10px]">
                        Not in use yet
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PermissionMatrix;
