import React, { useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import { Tooltip } from 'antd';
import { LuPencil, LuTrash2 } from 'react-icons/lu';
import { CustomTable, Badge, InfoHint, RolePermissionsHint, Search } from '../shared';
import MasterPagination from '../shared/ui/MasterPagination';
import { RowsPerPageSelect } from '../shared/ui/RowsPerPageSelect';
import { usePersistedPageSize } from '../../hooks/usePersistedPageSize';
import { PAGE_SIZE_OPTIONS } from '../../constants/app.constants';
import type { Role } from '../../types';
import { systemRoleLabel } from './data/roleTemplates';

type RoleRow = Role & { key: string };
type RoleColumn = NonNullable<TableProps<RoleRow>['columns']>[number];

const DESCRIPTION_TOOLTIP_MAX_CHARS = 140;

// The only two text columns this table ever shows (Tier/Type are both
// constant across every row in a single render — useRolesCatalog already
// filters to one `scope`, and the parent always splits System vs Custom
// before rendering, so neither is a real filter or sort candidate here; see
// this component's own module docstring below for why no filter dropdown
// was added). "Based on" only renders at all when `showBaseRole` is set.
type SortKey = 'roleName' | 'baseRole';

const displayRoleName = (role: Role): string =>
  role.isSystemRole ? systemRoleLabel(role.roleName) : role.roleName;

const SORT_COMPARATORS: Record<SortKey, (a: Role, b: Role) => number> = {
  roleName: (a, b) => displayRoleName(a).localeCompare(displayRoleName(b)),
  baseRole: (a, b) => (a.baseRoleName ?? '').localeCompare(b.baseRoleName ?? ''),
};

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

/**
 * (Role|Designation) / Tier / (Type) / (Based on) / Permissions / Locations /
 * Actions listing, with its own search (role name, client-side over the
 * `roles` prop this table already has in full — there is no separate list
 * endpoint to page against), sortable text columns, and pagination —
 * everything a list screen in this app is expected to have.
 *
 * No filter dropdown: the only two categorical fields on a Role are `scope`
 * (Tier) and `isSystemRole` (Type), and both are constant across every row a
 * single RoleTable instance ever receives — useRolesCatalog already filters
 * to one scope, and the parent (Index.tsx) always splits System vs Custom
 * before rendering either table. A dropdown over a single always-selected
 * value would filter nothing, so none was added.
 */
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
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('roleName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('roles_table', 10);

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((role) => displayRoleName(role).toLowerCase().includes(q));
  }, [roles, search]);

  const sortedRoles = useMemo(() => {
    const sorted = [...filteredRoles].sort(SORT_COMPARATORS[sortBy]);
    return sortOrder === 'desc' ? sorted.reverse() : sorted;
  }, [filteredRoles, sortBy, sortOrder]);

  const sortOrderFor = (key: SortKey): 'ascend' | 'descend' | undefined =>
    sortBy === key ? (sortOrder === 'asc' ? 'ascend' : 'descend') : undefined;

  const handleTableChange: TableProps<RoleRow>['onChange'] = (_pagination, _filters, sorter) => {
    const active = Array.isArray(sorter) ? sorter[0] : (sorter as SorterResult<RoleRow>);
    setPage(0);
    if (!active?.order || !active.columnKey) {
      setSortBy('roleName');
      setSortOrder('asc');
      return;
    }
    setSortBy(active.columnKey as SortKey);
    setSortOrder(active.order === 'ascend' ? 'asc' : 'desc');
  };

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
    sorter: true,
    sortOrder: sortOrderFor('baseRole'),
    render: (_: unknown, role: RoleRow) =>
      role.baseRoleName ? (
        <Badge status="neutral" dot={false}>
          {systemRoleLabel(role.baseRoleName)}
        </Badge>
      ) : (
        <span className="text-gray-300 text-sm">-</span>
      ),
  };

  const columns: RoleColumn[] = [
    {
      title: roleColumnLabel,
      dataIndex: 'roleName',
      key: 'roleName',
      sorter: true,
      sortOrder: sortOrderFor('roleName'),
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
            : '-'}
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
              <Tooltip title="Edit">
                <button
                  type="button"
                  aria-label="Edit role"
                  className="text-primary-600 hover:text-primary-700 cursor-pointer"
                  onClick={() => onEdit(role)}
                >
                  <LuPencil size={16} strokeWidth={2} aria-hidden />
                </button>
              </Tooltip>
            )}
            {canDelete && (
              <Tooltip title="Delete">
                <button
                  type="button"
                  aria-label="Delete role"
                  className="text-gray-600 hover:text-danger-solid transition-colors cursor-pointer"
                  onClick={() => onDelete(role)}
                >
                  <LuTrash2 size={16} strokeWidth={2} aria-hidden />
                </button>
              </Tooltip>
            )}
            {!canEdit && !canDelete && <span className="text-gray-300">-</span>}
          </div>
        ),
    },
  ];

  const dataSource: RoleRow[] = sortedRoles
    .slice(page * pageSize, page * pageSize + pageSize)
    .map((role) => ({ ...role, key: role.id }));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Search
          appname="roles table"
          placeholder={`Search ${roleColumnLabel.toLowerCase()}s...`}
          value={search}
          allowClear
          onSearch={(value) => {
            setSearch(value);
            setPage(0);
          }}
        />
        <RowsPerPageSelect
          pageSize={pageSize}
          options={PAGE_SIZE_OPTIONS}
          onChange={(size) => {
            setPageSize(size);
            setPage(0);
          }}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <CustomTable<RoleRow>
          columns={columns}
          dataSource={dataSource}
          onChange={handleTableChange}
          emptyText={
            search.trim() ? (
              <div className="py-8 text-center text-sm text-gray-400">
                No {roleColumnLabel.toLowerCase()}s match your search.
              </div>
            ) : undefined
          }
        />
      </div>

      <MasterPagination
        current={page + 1}
        pageSize={pageSize}
        total={sortedRoles.length}
        itemLabel={roleColumnLabel.toLowerCase() + 's'}
        onPageChange={(nextPage) => setPage(nextPage - 1)}
      />
    </div>
  );
};

export default RoleTable;
