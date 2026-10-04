import { useEffect, useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import { LuUsersRound } from 'react-icons/lu';
import { PlusOutlined } from '@ant-design/icons';
import { MdSearch, MdOutlineFileUpload, MdOutlineRefresh, MdOutlineEdit } from 'react-icons/md';
import { Select, Switch, Tooltip } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Button, Input, showToast } from '../shared';
import { FilterSelectIcon } from '../shared/ui/FilterSelectIcon';
import { Loader } from '../shared/ui/loader';
import MasterPagination from '../shared/ui/MasterPagination';
import { RowsPerPageSelect } from '../shared/ui/RowsPerPageSelect';
import { usePersistedPageSize } from '../../hooks/usePersistedPageSize';
import { PAGE_SIZE_OPTIONS } from '../../constants/app.constants';
import { Badge } from '../shared/ui/badge';
import CustomTable from '../shared/ui/table';
import StatusToggle from '../shared/ui/StatusToggle';
import BulkImport from '../MyCompany/Team/BulkImport';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';
import { RootState } from '../../redux/provider/store';
import {
  OrgUser,
  useDeactivateUserMutation,
  useReactivateUserMutation,
  useListUsersQuery,
} from '../../api/organization-service/Users/users';
import { useListRolesQuery } from '../../api/organization-service/Roles/roles';
import {
  InvitationSummary,
  useListTenantInvitationsQuery,
  useResendTenantInvitationMutation,
} from '../../api/organization-service/Tenants/teamInvitations';
import { systemRoleLabel } from '../RolesManagement/data/roleTemplates';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

// GET /v1/users has no search param (see the module docstring below) — while
// actively searching this pulls one larger page instead of the normal 20 at
// a time and filters it client-side, so a query at least covers this
// tenant's whole roster rather than just whatever 20 rows the pager happened
// to be on. 200 is the backend's own hard cap on `limit` (both the route
// model and the repository enforce it), so this can't ask for more anyway.
const SEARCH_PAGE_SIZE = 200;

// The columns this table can sort by — matches each column's own `key`
// below (comparators live inside the component, since they close over the
// `TableRow` union, which itself depends on the query's own row shape).
type SortKey = 'full_name' | 'email' | 'role' | 'phone' | 'status' | 'onboarded';

/** Onboarding-state rank for sorting the "Onboarded" column — lower sorts
 * first. Deactivated sorts last: it's a dead end, not progress toward
 * onboarding. */
const ONBOARDED_RANK = { onboarded: 0, pending: 1, deactivated: 2 } as const;

/** §"Users — Organization Directory": GET /v1/users. Tenant comes from the
 * caller's own session — no company/tenant selector, unlike the Super
 * Admin's Companies screen. Only what the real API supports: an
 * active/inactive filter and offset pagination — no server-side search,
 * sort, role filter, or "archived" tri-state (organization-service has
 * exactly one deactivated state, not a separate archive concept). The search
 * box is a client-side name/email filter over a 200-row page fetched for
 * that purpose — see SEARCH_PAGE_SIZE above.
 *
 * The Status column's Switch is now two-directional: `DELETE /v1/users/{id}`
 * (behind a confirmation — losing access is the risky direction) turns an
 * active user off, and `POST /v1/users/{id}/reactivate` (no confirmation —
 * restoring access is the low-risk direction, same reasoning as
 * UsersPanel.tsx's identical Super-Admin-side switch) turns one back on.
 * The tenant-scoped reactivate route used to not exist at all — only
 * organization-service's platform router had it, for a Careerforce Pro
 * operator acting on a tenant's behalf — which meant a Company Admin who
 * deactivated someone by mistake, or wanted to re-add them, had no way
 * back: re-adding via "Add user" 409s with "already exists" (deactivating
 * never frees the email, only suspends it).
 *
 * A section rendered inside the Users page (pages/OrganisationUserPage),
 * alongside CfpUsers — no MainLayout/page chrome of its own, the composing
 * page owns that. */
const OrganisationUserTable = () => {
  const navigate = useNavigate();
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);
  const [includeInactive, setIncludeInactive] = useState<'active' | 'all'>('active');
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('organisation_users', 20);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const canArchive = useHasAccess(Authorities.USER_ARCHIVE);

  const isSearching = searchText.trim().length > 0;

  const { data, isLoading, error } = useListUsersQuery(
    isSearching
      ? {
          includeInactive: includeInactive === 'all',
          role: roleFilter,
          limit: SEARCH_PAGE_SIZE,
          offset: 0,
        }
      : {
          includeInactive: includeInactive === 'all',
          role: roleFilter,
          limit: pageSize,
          offset: page * pageSize,
        },
    { skip: !tenantId }
  );

  // This tenant's own role catalog, for the filter's options — the `role`
  // query param above has to match a role name exactly (organization-service
  // does `MasterRoleModel.role == name`, see ListUsersUseCase's docstring on
  // how a base role like "recruiter" also pulls in any tenant-custom role
  // derived from it), so the dropdown is built from the real catalog rather
  // than a hardcoded list of the 8 system roles.
  const { data: rolesData } = useListRolesQuery(
    { scope: 'tenant', isMaster: false },
    { skip: !tenantId }
  );
  const roleOptions = (rolesData || [])
    .map((role) => ({ label: systemRoleLabel(role.name), value: role.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const [deactivateUser] = useDeactivateUserMutation();
  const [reactivateUser] = useReactivateUserMutation();

  // Bulk import (and a single invite) only ever creates an `Invite` row —
  // never a `users` row — until the invited person actually accepts, so
  // useListUsersQuery above alone would make an import look like it did
  // nothing. Fetched here purely to surface still-pending ones as visible
  // rows, same reasoning as UsersPanel.tsx's identical Super-Admin-side
  // table — `invalidatesTags: ['TenantInvitations']` on the bulk-import
  // confirm mutation already refetches this the moment an import succeeds.
  const { data: invitationsData } = useListTenantInvitationsQuery(
    { tenantId: tenantId ?? '', limit: 100 },
    { skip: !tenantId }
  );
  const [resendInvite, { isLoading: isResendingInvite }] = useResendTenantInvitationMutation();

  const handleResendInvite = async (invitationId: string) => {
    if (!tenantId) return;
    try {
      await resendInvite({ tenantId, invitationId }).unwrap();
      showToast({ message: 'Invitation resent, expiry pushed out 48 hours.', type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to resend invitation.'),
        type: 'error',
      });
    }
  };

  useEffect(() => {
    if (error) {
      showToast({ message: getOrgErrorMessage(error, 'Failed to load users.'), type: 'error' });
    }
  }, [error]);

  const handleDeactivate = async (user: OrgUser) => {
    try {
      await deactivateUser(user.user_id).unwrap();
      showToast({ message: `${user.full_name} was deactivated.`, type: 'success' });
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to deactivate user.'), type: 'error' });
    }
  };

  // No confirmation modal, unlike deactivate — restoring access is the
  // low-risk direction and the whole reason this exists: deactivating never
  // freed the user's email, so re-adding them via "Add user" 409s with
  // "already exists." This is the actual way back.
  const handleReactivate = async (user: OrgUser) => {
    try {
      await reactivateUser(user.user_id).unwrap();
      showToast({ message: `${user.full_name} was reactivated.`, type: 'success' });
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to reactivate user.'), type: 'error' });
    }
  };

  const users = data?.items || [];
  // `invitation` is only ever set for a user still mid-setup (`!has_set_password`)
  // whose invite (organization-service keeps `users`/`invitations` as
  // entirely separate tables, joined here only by email — see below) is
  // still live — it's what lets THIS row's own Resend/Revoke act on that
  // invite, instead of that invite also rendering as a second, separate row
  // for the same person.
  type UserRow = (typeof users)[number] & {
    key: string;
    kind: 'user';
    invitation: InvitationSummary | undefined;
  };

  // An invited person with no `users` row of their own yet — the normal
  // shape for "Invite Team Member"/bulk import, which (unlike "+ ADD USER",
  // whose CreateUserUseCase writes a `users` row and an `Invite` together in
  // one transaction) only ever creates the `Invite`, nothing else, until
  // accepted. Shown in the SAME table as real users, with a "Pending setup"
  // Onboarded state, until accepted — at which point the invite's status
  // flips to "accepted" (so it drops out of this filter) and their real User
  // row appears via `users` above instead. Same shape UsersPanel.tsx already
  // established for the Super-Admin-side mirror of this table.
  type PendingRow = {
    key: string;
    kind: 'pending';
    invitation_id: string;
    invited_email: string;
    role: string;
    expires_at: string;
  };

  type TableRow = UserRow | PendingRow;

  // Only "pending" — "accepted" is already a real row in `users` above
  // (would double-list the same person), and "expired"/"revoked" are no
  // longer actionable, so surfacing them here would just be noise.
  const pendingInvitations = useMemo(
    () => (invitationsData?.invitations ?? []).filter((inv) => inv.status === 'pending'),
    [invitationsData]
  );

  // Keyed by lowercased email — the only field both `users` and
  // `invitations` actually share (neither response links the other's id;
  // confirmed against organization-service's ListUsersUseCase/
  // ListTenantInvitationsUseCase, which query entirely separate tables with
  // no cross-reference). A "+ ADD USER"-created person shows up in BOTH
  // `users` (immediately, `has_set_password: false`) and `invitations`
  // (`status: 'pending'`) for the same email — this is what lets that
  // invite attach to their existing user row below instead of also
  // rendering as a ghost duplicate beside it.
  const pendingInvitationByEmail = useMemo(() => {
    const map = new Map<string, InvitationSummary>();
    for (const invitation of pendingInvitations) {
      map.set(invitation.invited_email.trim().toLowerCase(), invitation);
    }
    return map;
  }, [pendingInvitations]);

  const rows: TableRow[] = useMemo(() => {
    const userRows: UserRow[] = users.map((user) => ({
      ...user,
      key: user.user_id,
      kind: 'user',
      invitation: pendingInvitationByEmail.get(user.email.trim().toLowerCase()),
    }));
    // A pending invitation whose email already matched a `users` row above
    // isn't a separate person to list — it's that row's `invitation` now.
    const matchedEmails = new Set(users.map((u) => u.email.trim().toLowerCase()));
    const pendingRows: PendingRow[] = pendingInvitations
      .filter((invitation) => !matchedEmails.has(invitation.invited_email.trim().toLowerCase()))
      .map((invitation: InvitationSummary) => ({
        key: `invite-${invitation.invitation_id}`,
        kind: 'pending',
        invitation_id: invitation.invitation_id,
        invited_email: invitation.invited_email,
        role: invitation.role,
        expires_at: invitation.expires_at,
      }));
    return [...userRows, ...pendingRows];
  }, [users, pendingInvitations, pendingInvitationByEmail]);

  const filteredUsers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      row.kind === 'user'
        ? row.full_name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q)
        : row.invited_email.toLowerCase().includes(q) || row.role.toLowerCase().includes(q)
    );
  }, [rows, searchText]);

  const onboardedRank = (row: TableRow): number =>
    row.kind === 'pending'
      ? ONBOARDED_RANK.pending
      : !row.is_active
        ? ONBOARDED_RANK.deactivated
        : row.has_set_password
          ? ONBOARDED_RANK.onboarded
          : ONBOARDED_RANK.pending;

  // Client-side, over whatever rows are already on the page — same
  // DepartmentsTab.tsx pattern (controlled sortBy/sortOrder + a
  // sortOrderFor/handleTableChange pair), swapped in for the plain
  // uncontrolled `sorter` functions this table used to hand antd directly.
  const SORT_COMPARATORS: Record<SortKey, (a: TableRow, b: TableRow) => number> = {
    full_name: (a, b) =>
      (a.kind === 'user' ? a.full_name : a.invited_email).localeCompare(
        b.kind === 'user' ? b.full_name : b.invited_email
      ),
    email: (a, b) =>
      (a.kind === 'user' ? a.email : '').localeCompare(b.kind === 'user' ? b.email : ''),
    role: (a, b) => (a.role || '').localeCompare(b.role || ''),
    phone: (a, b) =>
      (a.kind === 'user' ? a.phone_no || '' : '').localeCompare(
        b.kind === 'user' ? b.phone_no || '' : ''
      ),
    status: (a, b) =>
      Number(a.kind === 'user' ? a.is_active : false) -
      Number(b.kind === 'user' ? b.is_active : false),
    onboarded: (a, b) => onboardedRank(a) - onboardedRank(b),
  };

  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers].sort(SORT_COMPARATORS[sortBy]);
    return sortOrder === 'desc' ? sorted.reverse() : sorted;
    // SORT_COMPARATORS is a fresh object every render but its comparator
    // functions are pure and keyed only by SortKey — safe to omit here.
  }, [filteredUsers, sortBy, sortOrder]);

  const sortOrderFor = (key: SortKey): 'ascend' | 'descend' | undefined =>
    sortBy === key ? (sortOrder === 'asc' ? 'ascend' : 'descend') : undefined;

  const handleTableChange: TableProps<TableRow>['onChange'] = (_pagination, _filters, sorter) => {
    const active = Array.isArray(sorter) ? sorter[0] : (sorter as SorterResult<TableRow>);
    setPage(0);
    if (!active?.order || !active.columnKey) {
      setSortBy('full_name');
      setSortOrder('asc');
      return;
    }
    setSortBy(active.columnKey as SortKey);
    setSortOrder(active.order === 'ascend' ? 'asc' : 'desc');
  };

  const dataSource: TableRow[] = sortedUsers;

  const columns: TableProps<TableRow>['columns'] = [
    {
      title: 'Name',
      key: 'full_name',
      sorter: true,
      sortOrder: sortOrderFor('full_name'),
      render: (_: unknown, row: TableRow) =>
        row.kind === 'user' ? (
          <Link
            to={`/view-organisation-user?orgUserId=${row.user_id}`}
            className="font-semibold text-primary-600 hover:underline"
          >
            {row.full_name}
          </Link>
        ) : (
          <div>
            <div className="font-semibold text-gray-900">{row.invited_email}</div>
            <div className="text-xs text-gray-400">Invited, not yet accepted</div>
          </div>
        ),
    },
    {
      title: 'Email',
      key: 'email',
      sorter: true,
      sortOrder: sortOrderFor('email'),
      render: (_: unknown, row: TableRow) =>
        row.kind === 'user' ? (
          <span className="text-sm text-gray-600 truncate" title={row.email}>
            {row.email}
          </span>
        ) : (
          <span className="text-sm text-gray-300">-</span>
        ),
    },
    {
      title: 'Role',
      key: 'role',
      sorter: true,
      sortOrder: sortOrderFor('role'),
      render: (_: unknown, row: TableRow) => {
        if (row.kind === 'pending') {
          return row.role ? (
            <Badge status="neutral" dot={false}>
              {systemRoleLabel(row.role)}
            </Badge>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          );
        }
        // Comma-joined raw role names (organization-service can join more
        // than one live assignment, e.g. a tenant-wide role plus an
        // office-specific one — see ListUsersUseCase's role_names_by_user
        // comment); each one gets its own badge rather than one long string.
        const roleNames = (row.role || '')
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean);
        if (roleNames.length === 0) {
          return <span className="text-sm text-gray-400">-</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {roleNames.map((name) => (
              <Badge key={name} status="neutral" dot={false}>
                {systemRoleLabel(name)}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      title: 'Phone',
      key: 'phone',
      sorter: true,
      sortOrder: sortOrderFor('phone'),
      render: (_: unknown, row: TableRow) =>
        row.kind === 'pending' ? (
          <span className="text-sm text-gray-300">-</span>
        ) : (
          <span className="text-sm text-gray-600">
            {row.phone_no ? `${row.country_code || ''}${row.phone_no}` : '-'}
          </span>
        ),
    },
    {
      // Just the on/off switch now — whether this account is set up yet
      // lives in the separate "Onboarded" column below, so this column
      // means one thing only: can they currently sign in.
      title: 'Status',
      key: 'status',
      sorter: true,
      sortOrder: sortOrderFor('status'),
      render: (_: unknown, row: TableRow) =>
        row.kind === 'pending' ? (
          <Tooltip title="No account yet — nothing to activate or deactivate until this invite is accepted.">
            <Switch checked={false} disabled />
          </Tooltip>
        ) : (
          <StatusToggle
            isActive={row.is_active}
            disabled={!canArchive}
            activateLabel="Reactivate this user"
            deactivateLabel="Deactivate this user"
            deactivateConfirmTitle={`Deactivate "${row.full_name}"? They'll immediately lose access.`}
            onActivate={() => handleReactivate(row)}
            onDeactivate={() => handleDeactivate(row)}
          />
        ),
    },
    {
      // Just the badge now — Resend moved into Actions below (alongside
      // Edit, this row's other action), and Revoke was removed outright.
      title: 'Onboarded',
      key: 'onboarded',
      sorter: true,
      sortOrder: sortOrderFor('onboarded'),
      render: (_: unknown, row: TableRow) =>
        // is_active alone can't tell a real, logged-in user apart from
        // someone still sitting on an unaccepted invite — see
        // OrgUser.has_set_password's own docstring.
        row.kind === 'pending' ? (
          <Badge status="warning">Pending Setup</Badge>
        ) : !row.is_active ? (
          <Badge status="neutral">Deactivated</Badge>
        ) : row.has_set_password ? (
          <Badge status="success">Onboarded</Badge>
        ) : (
          <Badge status="warning">Pending Setup</Badge>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_: unknown, row: TableRow) => {
        // The invite to resend — this row's own (a pure invitation row) or
        // the one matched onto it by email (a "+ ADD USER"-created row
        // still mid-setup). Neither exists for an onboarded/deactivated
        // user, and occasionally not even for a still-pending one — see
        // UserRow.invitation's own comment on the orphan case (companion
        // invite revoked/expired without the user row being cleaned up) —
        // nothing to resend against then.
        const invitationId =
          row.kind === 'pending' ? row.invitation_id : row.invitation?.invitation_id;
        return (
          <div className="flex items-center justify-end gap-1">
            {invitationId && (
              <Tooltip title="Resend Invitation">
                <button
                  type="button"
                  aria-label="Resend invitation"
                  className="p-2 rounded-full text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  disabled={isResendingInvite}
                  onClick={() => void handleResendInvite(invitationId)}
                >
                  <MdOutlineRefresh size={16} />
                </button>
              </Tooltip>
            )}
            {row.kind === 'user' && (
              <Tooltip title="Edit">
                <Link
                  to={`/edit-organisation-user?orgUserId=${row.user_id}`}
                  aria-label="Edit"
                  className="p-2 rounded-full text-gray-600 hover:bg-gray-100 hover:text-primary-600 transition-colors"
                >
                  <MdOutlineEdit size={16} />
                </Link>
              </Tooltip>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="w-full">
      {isLoading && <Loader />}
      <div className="flex flex-wrap gap-4 justify-between items-center p-2">
        <div className="flex items-center space-x-2">
          <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
            <LuUsersRound size={18} />
          </span>
          <h2 className="font-display text-xl font-bold text-gray-900">Users</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-56">
            <Input
              prefix={<MdSearch className="text-gray-400" />}
              placeholder="Search..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div className="cfp-dropdown-trigger w-40">
            <FilterSelectIcon />
            <Select
              value={includeInactive}
              onChange={(value) => {
                setIncludeInactive(value);
                setPage(0);
              }}
              className="w-full custom-select"
              variant="borderless"
              options={[
                { label: 'Active Only', value: 'active' },
                { label: 'Include Deactivated', value: 'all' },
              ]}
            />
          </div>
          <div className="cfp-dropdown-trigger w-44">
            <FilterSelectIcon />
            <Select
              value={roleFilter}
              onChange={(value) => {
                setRoleFilter(value);
                setPage(0);
              }}
              className="w-full custom-select"
              variant="borderless"
              placeholder="All roles"
              allowClear
              options={roleOptions}
            />
          </div>
          {/* Extra gap ahead of Import Team/Add User — they're the row's
              action-buttons among filter controls, and sat too close to the
              dropdown beside it. */}
          <Button
            appname="import team"
            className="border border-gray-300 rounded-full px-4 py-2 flex items-center gap-1.5 text-sm font-semibold hover:bg-gray-50 transition-colors cfp-hover-lift ml-2"
            onClick={() => setIsBulkImportOpen(true)}
          >
            <MdOutlineFileUpload className="text-sm" /> <span>Import Team</span>
          </Button>
          <Button
            appname="add user"
            className="text-white bg-primary-600 rounded-full px-5 py-2 flex items-center gap-1.5 text-sm font-semibold cfp-hover-lift"
            onClick={() => navigate('/add-organisation-users')}
          >
            <PlusOutlined className="text-sm" /> <span>Add User</span>
          </Button>
        </div>
      </div>

      {!isSearching && (
        <div className="mt-3 flex justify-end">
          <RowsPerPageSelect
            pageSize={pageSize}
            options={PAGE_SIZE_OPTIONS}
            onChange={(size) => {
              setPageSize(size);
              setPage(0);
            }}
          />
        </div>
      )}

      <div className="w-full border border-neutral-200 rounded-xl overflow-hidden bg-white mt-3">
        <CustomTable<TableRow>
          columns={columns}
          dataSource={dataSource}
          onChange={handleTableChange}
          emptyText={
            !isLoading ? (
              <div className="py-10 text-center text-gray-400 text-sm">No users found.</div>
            ) : undefined
          }
        />
      </div>

      {isSearching ? (
        // Real offset pagination doesn't apply to a client-filtered page —
        // this is however many of the (up to SEARCH_PAGE_SIZE) fetched rows
        // matched, not a slice of a larger total.
        <p className="px-2 py-3 text-sm text-gray-500">
          {filteredUsers.length} {filteredUsers.length === 1 ? 'result' : 'results'} for &quot;
          {searchText.trim()}&quot;
          {users.length >= SEARCH_PAGE_SIZE &&
            ` (searched the first ${SEARCH_PAGE_SIZE} users only)`}
        </p>
      ) : (
        <MasterPagination
          current={page + 1}
          pageSize={pageSize}
          total={data?.total || 0}
          itemLabel="users"
          onPageChange={(p) => setPage(p - 1)}
        />
      )}

      {tenantId && (
        <BulkImport
          open={isBulkImportOpen}
          tenantId={tenantId}
          onClose={() => setIsBulkImportOpen(false)}
        />
      )}
    </div>
  );
};

export default OrganisationUserTable;
