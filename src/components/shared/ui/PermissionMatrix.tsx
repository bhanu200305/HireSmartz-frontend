import React, { useMemo } from 'react';
import { CustomCheckbox } from './checkbox';
import { Authorities, PermissionModule } from '../../../constants/authorities.constant';
import { groupCatalogByModule } from '../../../shared/utils/auth/rbac.helpers';

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
  disabled = false,
  className = '',
}) => {
  const groups = useMemo(() => groupCatalogByModule(), []);
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
              <span className="text-sm font-semibold text-gray-700">{moduleName}</span>
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
