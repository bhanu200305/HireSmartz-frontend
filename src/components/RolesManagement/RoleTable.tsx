import React from 'react';
import type { TableProps } from 'antd';
import { CustomTable, Badge, InfoHint, RolePermissionsHint } from '../shared';
import type { Role } from '../../types';
import { systemRoleLabel } from './data/roleTemplates';

type RoleRow = Role & { key: string };
type RoleColumn = NonNullable<TableProps<RoleRow>['columns']>[number];

const DESCRIPTION_TOOLTIP_MAX_CHARS = 140;

/**
 * Keeps the hover popover short without chopping a sentence off mid-word —
 * takes just the first sentence (a role description is written as one
 * anyway), and only as a last resort, when that one sentence itself runs
 * past the limit, trims back to the last whole word. No "…" is ever
 * appended — what's shown is always a complete sentence, or a complete
 * run of whole words.
 */
const shortenDescription = (description: string): string => {
  const trimmed = description.trim();
  const firstSentence = trimmed.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? trimmed;

  if (firstSentence.length <= DESCRIPTION_TOOLTIP_MAX_CHARS) return firstSentence;

  const words = firstSentence.slice(0, DESCRIPTION_TOOLTIP_MAX_CHARS).split(' ');
  words.pop(); // drop the partial trailing word
  return words.join(' ');
};

/** One-time explainer for the Permissions column header — what the count
 * next to each role actually means, in a couple of short sentences. */
const PERMISSIONS_COLUMN_HELP =
  'The number of actions this role is allowed to perform, such as viewing, adding, editing, deleting, approving, or exporting records. Hover the count on any row to see exactly which ones.';

type RoleTableProps = {
  roles: Role[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
  /** Type is implied when the table is already split into a system/custom
   * section (see Index.tsx) — pass true there to drop the now-redundant column. */
  hideTypeColumn?: boolean;
  /** "Role" for the System Roles table, "Designation" for Custom Roles —
   * see Index.tsx. Defaults to 'Role' for anything that doesn't care. */
  roleColumnLabel?: string;
  /** Adds a "Based on" column showing which system role a custom role's
   * permissions were derived from (`baseRoleName`) — meaningless for the
   * system roles themselves, so only pass this for the Custom Roles table. */
  showBaseRole?: boolean;
};

/** (Role|Designation) / Tier / (Type) / (Based on) / Permissions / Locations / Actions listing. */
const RoleTable: React.FC<RoleTableProps> = ({
  roles,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  hideTypeColumn = false,
  roleColumnLabel = 'Role',
  showBaseRole = false,
}) => {
  const typeColumn: RoleColumn = {
    title: 'Type',
    key: 'type',
    render: (_: unknown, role: RoleRow) => (
      <Badge status={role.isSystemRole ? 'neutral' : 'info'} dot={false}>
        {role.isSystemRole ? 'System' : 'Custom'}
      </Badge>
    ),
  };

  const baseRoleColumn: RoleColumn = {
    title: 'Based on',
    key: 'baseRole',
    render: (_: unknown, role: RoleRow) =>
      role.baseRoleName ? (
        <Badge status="neutral" dot={false}>
          {systemRoleLabel(role.baseRoleName)}
        </Badge>
      ) : (
        <span className="text-gray-300 text-sm">—</span>
      ),
  };

  const columns: RoleColumn[] = [
    {
      title: roleColumnLabel,
      dataIndex: 'roleName',
      key: 'roleName',
      render: (_: unknown, role: RoleRow) => (
        <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900">
          {role.description && <InfoHint content={shortenDescription(role.description)} />}
          {role.isSystemRole ? systemRoleLabel(role.roleName) : role.roleName}
        </span>
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
    ...(hideTypeColumn ? [] : [typeColumn]),
    ...(showBaseRole ? [baseRoleColumn] : []),
    {
      title: (
        <span className="inline-flex items-center gap-1.5">
          Permissions
          <InfoHint content={PERMISSIONS_COLUMN_HELP} />
        </span>
      ),
      key: 'permissions',
      render: (_: unknown, role: RoleRow) => (
        <RolePermissionsHint permissions={role.permissions} className="text-gray-500 text-sm" />
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
