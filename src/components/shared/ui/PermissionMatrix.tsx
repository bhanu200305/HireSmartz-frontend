import React, { useMemo } from 'react';
import { CustomCheckbox } from './checkbox';
import InfoHint from './InfoHint';
import { Authorities, PermissionModule } from '../../../constants/authorities.constant';
import { groupCatalogByModule } from '../../../shared/utils/auth/rbac.helpers';
import type { RoleScope } from '../../../types';

/** One short sentence per module — hover text for the ⓘ next to each module
 * heading below. Covers every PermissionModule that can actually appear here
 * (PERMISSION_CATALOG only — see that constant's own module docstring for
 * why Dashboard/Job Configuration/Activity/My Company/Subscriptions are
 * excluded and so have no entry here). */
const MODULE_DESCRIPTIONS: Partial<Record<PermissionModule, string>> = {
  Company: 'Manage client companies on the platform — add, edit, approve, and archive tenants.',
  'Company Settings': "View and update this company's own profile and configuration.",
  'CFP Users': "Manage CareerForce Pro's internal staff accounts.",
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
 * authorities.constant.ts) — one for CareerForce Pro's own internal staff
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

            {/* Capped at 2 columns (was 3 at `lg:`) — that breakpoint keys off
                the viewport, not this matrix's own container, so on a wide
                screen it used to force 3 columns into whatever narrower
                width the enclosing modal actually gave it. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 px-4 py-3">
              {grantable.map((entry) => (
                <CustomCheckbox
                  key={entry.code}
                  label={entry.label}
                  checked={selected.has(entry.code)}
                  disabled={disabled}
                  onChange={(e) => togglePermission(entry.code, e.target.checked)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PermissionMatrix;
