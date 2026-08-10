import React, { useMemo } from 'react';
import { Tooltip } from 'antd';
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
   * renders disabled: a role can only ever be narrowed from what its
   * creator already holds, never widened past it.
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
        const entries = groups[moduleName];
        const grantable = entries.filter((entry) => ceilingSet.has(entry.code));
        const selectedInModule = grantable.filter((entry) => selected.has(entry.code));
        const allSelected = grantable.length > 0 && selectedInModule.length === grantable.length;
        const someSelected = selectedInModule.length > 0 && !allSelected;

        return (
          <div key={moduleName} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-700">{moduleName}</span>
              {!disabled && grantable.length > 0 && (
                <CustomCheckbox
                  label="Select all"
                  checked={allSelected}
                  onChange={(e) => toggleModule(moduleName, e.target.checked)}
                  className={someSelected ? 'ant-checkbox-indeterminate-label' : ''}
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3">
              {entries.map((entry) => {
                const withinCeiling = ceilingSet.has(entry.code);
                const checkbox = (
                  <CustomCheckbox
                    key={entry.code}
                    label={entry.label}
                    checked={selected.has(entry.code)}
                    disabled={disabled || !withinCeiling}
                    onChange={(e) => togglePermission(entry.code, e.target.checked)}
                  />
                );

                if (withinCeiling) return checkbox;

                return (
                  <Tooltip
                    key={entry.code}
                    title="You don't hold this permission yourself, so you can't grant it to a role."
                  >
                    <span>{checkbox}</span>
                  </Tooltip>
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
