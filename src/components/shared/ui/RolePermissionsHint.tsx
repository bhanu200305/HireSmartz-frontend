import React, { useMemo } from 'react';
import { Popover } from 'antd';
import type { Authorities } from '../../../constants/authorities.constant';
import { groupPermissionsByModule } from '../../../shared/utils/auth/rbac.helpers';

type RolePermissionsHintProps = {
  permissions: Authorities[];
  className?: string;
};

/**
 * Hover breakdown for a role's permission count — the RoleTable row only had
 * space for "64 permissions"; this is what answers "which 64" without
 * forcing an admin to open the role (system roles have no Edit action to
 * open in the first place — `RoleTable`'s "System" Actions cell — so this
 * was the only way for a pre-built role's permissions to ever be visible).
 *
 * `Popover` rather than `InfoHint`'s plain-text `Tooltip`: a role can hold
 * anywhere from 3 to 162 permissions (super_admin), and a wall of raw
 * `resource:action` codes in a 240px tooltip would be unreadable at that end
 * of the range. Grouped by module (via `groupPermissionsByModule`) and
 * scrollable instead, so "162 permissions" is still scannable in a few
 * seconds rather than a paragraph to parse.
 */
const RolePermissionsHint: React.FC<RolePermissionsHintProps> = ({
  permissions,
  className = '',
}) => {
  const grouped = useMemo(() => groupPermissionsByModule(permissions), [permissions]);
  const modules = Object.keys(grouped);

  if (modules.length === 0) {
    return <span className={className}>{permissions.length} permissions</span>;
  }

  const content = (
    <div className="max-h-72 w-64 overflow-y-auto pr-1">
      {modules.map((moduleName) => (
        <div key={moduleName} className="mb-3 last:mb-0">
          <p className="text-xs font-semibold text-gray-500 tracking-wide mb-1.5">{moduleName}</p>
          <div className="flex flex-wrap gap-1">
            {grouped[moduleName as keyof typeof grouped]?.map((entry) => (
              <span
                key={entry.code}
                className="text-xs bg-gray-100 rounded-full px-2 py-0.5 text-gray-600"
              >
                {entry.label}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="hover"
      placement="bottomLeft"
      color="white"
      overlayInnerStyle={{
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        border: '1px solid #e5e7eb',
      }}
    >
      <span
        className={`cursor-pointer border-b border-dashed border-gray-300 hover:border-primary-400 hover:text-primary-600 ${className}`}
      >
        {permissions.length} permissions
      </span>
    </Popover>
  );
};

export default RolePermissionsHint;
