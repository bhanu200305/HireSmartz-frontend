import { useEffect, useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import { LuUsersRound } from 'react-icons/lu';
import { PlusOutlined } from '@ant-design/icons';
import { MdSearch, MdOutlineFileUpload, MdOutlineRefresh, MdOutlineBlock } from 'react-icons/md';
import { Select, Switch, Tooltip } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Button, Input, showToast } from '../shared';
import { FilterSelectIcon } from '../shared/ui/FilterSelectIcon';
import { Loader } from '../shared/ui/loader';
import MasterPagination from '../shared/ui/MasterPagination';
import { Badge } from '../shared/ui/badge';
import CustomTable from '../shared/ui/table';
import ConfirmationModal from '../shared/ui/ConfirmationModal';
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
  useRevokeTenantInvitationMutation,
} from '../../api/organization-service/Tenants/teamInvitations';
import { systemRoleLabel } from '../RolesManagement/data/roleTemplates';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

const PAGE_SIZE = 20;
// GET /v1/users has no search param (see the module docstring below) — while
// actively searching this pulls one larger page instead of the normal 20 at
// a time and filters it client-side, so a query at least covers this
// tenant's whole roster rather than just whatever 20 rows the pager happened
// to be on. 200 is the backend's own hard cap on `limit` (both the route
// model and the repository enforce it), so this can't ask for more anyway.
const SEARCH_PAGE_SIZE = 200;

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
 * organization-service's platform router had it, for a CareerForce Pro
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
  const [searchText, setSearchText] = useState('');
  const [userToDeactivate, setUserToDeactivate] = useState<OrgUser | null>(null);
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
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
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
  const [deactivateUser, { isLoading: isDeactivating }] = useDeactivateUserMutation();
  const [reactivateUser, { isLoading: isReactivating }] = useReactivateUserMutation();

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
  const [revokeInvite, { isLoading: isRevokingInvite }] = useRevokeTenantInvitationMutation();

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

  const handleRevokeInvite = async (invitationId: string) => {
    if (!tenantId) return;
    try {
      await revokeInvite({ tenantId, invitationId }).unwrap();
      showToast({ message: 'Invitation revoked.', type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to revoke invitation.'),
        type: 'error',
      });
    }
  };

  useEffect(() => {
    if (error) {
      showToast({ message: getOrgErrorMessage(error, 'Failed to load users.'), type: 'error' });
    }
  }, [error]);

  const handleDeactivate = async () => {
    if (!userToDeactivate) return;
    try {
      await deactivateUser(userToDeactivate.user_id).unwrap();
      showToast({ message: `${userToDeactivate.full_name} was deactivated.`, type: 'success' });
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to deactivate user.'), type: 'error' });
    } finally {
      setUserToDeactivate(null);
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
  type UserRow = (typeof users)[number] & { key: string; kind: 'user' };

  // A bulk-imported (or "Add user"-invited) person before they accept — an
  // `Invite` row, not a `User` row (organization-service keeps these as
  // entirely separate tables). Shown in the SAME table as real users, with a
  // "Pending" status, until accepted — at which point their invite's status
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

  const rows: TableRow[] = useMemo(() => {
    const userRows: UserRow[] = users.map((user) => ({
      ...user,
      key: user.user_id,
      kind: 'user',
    }));
    const pendingRows: PendingRow[] = pendingInvitations.map((invitation: InvitationSummary) => ({
      key: `invite-${invitation.invitation_id}`,
      kind: 'pending',
      invitation_id: invitation.invitation_id,
      invited_email: invitation.invited_email,
      role: invitation.role,
      expires_at: invitation.expires_at,
    }));
    return [...userRows, ...pendingRows];
  }, [users, pendingInvitations]);

  const filteredUsers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      row.kind === 'user'
        ? row.full_name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q)
        : row.invited_email.toLowerCase().includes(q) || row.role.toLowerCase().includes(q)
    );
  }, [rows, searchText]);

  const dataSource: TableRow[] = filteredUsers;

  const columns: TableProps<TableRow>['columns'] = [
    {
      title: 'Name',
      key: 'full_name',
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
      title: 'Status',
      key: 'status',
      render: (_: unknown, row: TableRow) =>
        row.kind === 'pending' ? (
          <Badge status="warning">Pending</Badge>
        ) : (
          <div className="flex items-center gap-2.5">
            <Tooltip
              title={
                !canArchive
                  ? "You don't have permission to change a user's status."
                  : row.is_active
                    ? 'Deactivate this user'
                    : 'Reactivate this user'
              }
            >
              <Switch
                size="small"
                checked={row.is_active}
                disabled={!canArchive || isReactivating}
                onChange={() =>
                  row.is_active ? setUserToDeactivate(row) : void handleReactivate(row)
                }
              />
            </Tooltip>
            <Badge status={row.is_active ? 'success' : 'neutral'}>
              {row.is_active ? 'Active' : 'Deactivated'}
            </Badge>
          </div>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_: unknown, row: TableRow) =>
        row.kind === 'pending' ? (
          <div className="flex gap-1 justify-end">
            <Tooltip title="Resend invitation">
              <button
                type="button"
                aria-label="Resend invitation"
                className="p-2 rounded-full text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                disabled={isResendingInvite}
                onClick={() => void handleResendInvite(row.invitation_id)}
              >
                <MdOutlineRefresh />
              </button>
            </Tooltip>
            <Tooltip title="Revoke invitation">
              <button
                type="button"
                aria-label="Revoke invitation"
                className="p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                disabled={isRevokingInvite}
                onClick={() => void handleRevokeInvite(row.invitation_id)}
              >
                <MdOutlineBlock />
              </button>
            </Tooltip>
          </div>
        ) : (
          <Link
            to={`/edit-organisation-user?orgUserId=${row.user_id}`}
            className="text-sm font-semibold text-primary-600 hover:underline"
          >
            Edit
          </Link>
        ),
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
                { label: 'Active only', value: 'active' },
                { label: 'Include deactivated', value: 'all' },
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
            <PlusOutlined className="text-sm" /> <span>ADD USER</span>
          </Button>
        </div>
      </div>

      <div className="w-full border border-neutral-200 rounded-xl overflow-hidden bg-white mt-3">
        <CustomTable<TableRow>
          columns={columns}
          dataSource={dataSource}
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
          pageSize={PAGE_SIZE}
          total={data?.total || 0}
          itemLabel="Users"
          onPageChange={(p) => setPage(p - 1)}
        />
      )}

      {userToDeactivate && (
        <ConfirmationModal
          title={`Deactivate "${userToDeactivate.full_name}"? They'll immediately lose access.`}
          confirmText="DEACTIVATE"
          isLoading={isDeactivating}
          onConfirm={handleDeactivate}
          onClose={() => setUserToDeactivate(null)}
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
