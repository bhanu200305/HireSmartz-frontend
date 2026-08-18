import React from 'react';
import type { TableProps } from 'antd';
import { CustomTable, Badge } from '../shared';
import type { Role } from '../../types';

type RoleRow = Role & { key: string };

type RoleTableProps = {
  roles: Role[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
};

/** Role / Tier / Type / Permissions / Locations / Actions listing. */
const RoleTable: React.FC<RoleTableProps> = ({ roles, canEdit, canDelete, onEdit, onDelete }) => {
  const columns: TableProps<RoleRow>['columns'] = [
    {
      title: 'Role',
      dataIndex: 'roleName',
      key: 'roleName',
      render: (_: unknown, role: RoleRow) => (
        <span className="font-semibold text-gray-900">{role.roleName}</span>
      ),
    },
    {
      title: 'Tier',
      key: 'tier',
      render: (_: unknown, role: RoleRow) => (
        <Badge status={role.scope === 'platform' ? 'info' : 'neutral'} dot={false}>
          {role.scope === 'platform' ? 'Platform' : 'Company'}
        </Badge>
      ),
    },
    {
      title: 'Type',
      key: 'type',
      render: (_: unknown, role: RoleRow) => (
        <Badge status={role.isSystemRole ? 'neutral' : 'info'} dot={false}>
          {role.isSystemRole ? 'System' : 'Custom'}
        </Badge>
      ),
    },
    {
      title: 'Permissions',
      key: 'permissions',
      render: (_: unknown, role: RoleRow) => (
        <span className="text-gray-500 text-sm">{role.permissions.length} permissions</span>
      ),
    },
    {
      title: 'Locations',
      key: 'locations',
      render: (_: unknown, role: RoleRow) => (
        <span className="text-gray-500 text-sm">
          {role.locationPermissions.length > 0
            ? `${role.locationPermissions.length} location${role.locationPermissions.length === 1 ? '' : 's'}`
            : '—'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, role: RoleRow) =>
        role.isSystemRole ? (
          <span className="text-gray-400 text-sm">System</span>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            {canEdit && (
              <button
                type="button"
                className="text-primary-600 hover:underline cursor-pointer"
                onClick={() => onEdit(role)}
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                className="text-danger-solid hover:underline cursor-pointer"
                onClick={() => onDelete(role)}
              >
                Delete
              </button>
            )}
            {!canEdit && !canDelete && <span className="text-gray-300">—</span>}
          </div>
        ),
    },
  ];

  const dataSource: RoleRow[] = roles.map((role) => ({ ...role, key: role.id }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <CustomTable<RoleRow> columns={columns} dataSource={dataSource} />
    </div>
  );
};

export default RoleTable;
