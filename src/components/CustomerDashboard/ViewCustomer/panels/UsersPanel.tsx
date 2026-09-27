import React, { useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import { Tooltip } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import {
  MdOutlineAdd,
  MdOutlineBlock,
  MdOutlineEdit,
  MdOutlineFileUpload,
  MdOutlineRefresh,
  MdPersonOff,
  MdRestore,
  MdSearch,
} from 'react-icons/md';
import {
  Badge,
  Button,
  CustomTable,
  Input,
  NameTitleSelect,
  PhoneNumberField,
  Select,
  Typography,
  showToast,
} from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import MasterPagination from '../../../shared/ui/MasterPagination';
import ConfirmationModal from '../../../shared/ui/ConfirmationModal';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { RowsPerPageSelect } from '../../../shared/ui/RowsPerPageSelect';
import { usePersistedPageSize } from '../../../../hooks/usePersistedPageSize';
import { PAGE_SIZE_OPTIONS } from '../../../../constants/app.constants';
import {
  useListPlatformTenantUsersQuery,
  useCreatePlatformTenantUserMutation,
  useDeactivatePlatformTenantUserMutation,
  useReactivatePlatformTenantUserMutation,
  useAttachPlatformTenantUserLocationMutation,
  useUpdatePlatformTenantUserMutation,
} from '../../../../api/organization-service/Platform/users';
import {
  useListPlatformTenantInvitationsQuery,
  useResendPlatformTenantInvitationMutation,
  useRevokePlatformTenantInvitationMutation,
} from '../../../../api/organization-service/Platform/invitations';
import { useListPlatformTenantDepartmentsQuery } from '../../../../api/organization-service/Platform/departments';
import { useListPlatformTenantDesignationsQuery } from '../../../../api/organization-service/Platform/designations';
import { useListPlatformTenantOfficesQuery } from '../../../../api/organization-service/Platform/offices';
import { useAssignRoleAsPlatformMutation } from '../../../../api/organization-service/Roles/assignments';
import { useRolesCatalog } from '../../../../hooks/useRolesCatalog';
import type { OrgUser } from '../../../../api/organization-service/Users/users';
import type { InvitationSummary } from '../../../../api/organization-service/Tenants/teamInvitations';
import {
  getOrgErrorCode,
  getOrgErrorDetails,
  getOrgErrorMessage,
} from '../../../../shared/utils/auth/orgError.helpers';
import {
  isPhoneValidForCountry,
  PHONE_VALIDATION_MESSAGE,
} from '../../../../shared/utils/validation/phoneValidation';
import BulkImport from '../../../MyCompany/Team/BulkImport';
import ViewPlatformUserModal from './ViewPlatformUserModal';
import RoleLocationPicker from './RoleLocationPicker';

type UserRow = OrgUser & { key: string; kind: 'user' };

// A bulk-imported (or "Add user"-invited) person before they accept — an
// `Invite` row, not a `User` row (organization-service keeps these as
// entirely separate tables; see ListTenantInvitationsUseCase). Shown in the
// SAME table as real users, with a "Pending" status, until accepted — at
// which point their invite's status flips to "accepted" (so it drops out of
// this filter) and their real User row appears in `data.items` instead.
type PendingRow = {
  key: string;
  kind: 'pending';
  invitation_id: string;
  invited_email: string;
  role: string;
  department_id: string | null;
  designation_id: string | null;
  expires_at: string;
};

type TableRow = UserRow | PendingRow;

// Matches each sortable column's own `key` below. Comparators live inside
// the component (see SORT_COMPARATORS) since a couple of them close over
// `departmentName`/`designationName`, which read this tenant's own fetched
// department/designation lists.
type SortKey = 'full_name' | 'title' | 'department' | 'designation' | 'role' | 'status';

type FormState = {
  email: string;
  first_name: string;
  last_name: string;
  title: string;
  country_code: string;
  phone_no: string;
  department_id: string | undefined;
  role_id: string | undefined;
  location_ids: string[];
};

// Same default every other phone field in this app starts from (see
// EditCandidate.tsx/UserProfile).
const DEFAULT_COUNTRY_CODE = '+1';

const emptyForm: FormState = {
  email: '',
  first_name: '',
  last_name: '',
  title: '',
  country_code: DEFAULT_COUNTRY_CODE,
  phone_no: '',
  department_id: undefined,
  role_id: undefined,
  location_ids: [],
};

/**
 * Super Admin's mirror of OrganisationDashboard/OrganisationAddUser +
 * OrganisationUserTable — same POST/GET/DELETE /v1/users surface, but
 * platform-mounted (users_platform_router.py) so it works from a token with
 * no ambient tenant_id. Role assignment is folded into the same create call
 * (POST body's `role_id`) rather than a separate step, using this tenant's
 * own role catalog via useRolesCatalog — the same one RolesManagement /
 * CreateRoleModal already read for this tenant when isMaster.
 *
 * Inherits organization-service's known gap: a user created this way has no
 * password until they go through the invite/accept flow, and this endpoint
 * doesn't create an invite. That gap is already tracked as a backend fix
 * (see AddOrganisationUser's identical caveat, tenant-side) — nothing about
 * this panel makes it worse, but nothing here works around it either.
 *
 * Table + search/sort/filter/pagination matches CompanySettings' master-data
 * tabs instead of the plain divided list this used to be. Pending invites
 * share this same table (as `PendingRow`s) rather than living only on a
 * separate screen — resend/revoke are real actions here, not just a pointer
 * to "go manage it elsewhere".
 */
const UsersPanel: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [includeInactive, setIncludeInactive] = useState<'active' | 'all'>('active');
  const { data, isLoading } = useListPlatformTenantUsersQuery({
    tenantId,
    includeInactive: includeInactive === 'all',
  });
  // Bulk import (and a single invite) only ever creates an `Invite` row —
  // never a `users` row — until the invited person actually accepts, so
  // useListPlatformTenantUsersQuery above alone would make an import look
  // like it did nothing. Fetched here purely to surface still-pending ones
  // as visible rows; `invalidatesTags: ['TenantInvitations']` on both the
  // bulk-import confirm and single-invite mutations already refetches this
  // the moment either succeeds.
  //
  // Every invite this tenant has ever sent, not just pending ones — filtered
  // to `status === 'pending'` below. Accepted/revoked/expired invites are
  // dead rows for THIS table's purpose (an accepted one's person already
  // shows up via `data.items` instead). `limit: 100`, not the endpoint's own
  // default of 50 — a tenant that bulk-imported more than 50 people at once
  // would otherwise silently lose the overflow off this list.
  const { data: invitationsData, refetch: refetchInvitations } =
    useListPlatformTenantInvitationsQuery({
      tenantId,
      limit: 100,
    });
  const { data: departments } = useListPlatformTenantDepartmentsQuery(tenantId);
  const { data: designations } = useListPlatformTenantDesignationsQuery(tenantId);
  const { data: offices } = useListPlatformTenantOfficesQuery(tenantId);
  const { roles, createRole } = useRolesCatalog({ scope: 'tenant', tenantId, isMaster: true });

  const [createUser, { isLoading: isCreating }] = useCreatePlatformTenantUserMutation();
  const [deactivateUser, { isLoading: isDeactivating }] = useDeactivatePlatformTenantUserMutation();
  const [reactivateUser, { isLoading: isReactivating }] = useReactivatePlatformTenantUserMutation();
  const [resendInvite, { isLoading: isResendingInvite }] =
    useResendPlatformTenantInvitationMutation();
  const [revokeInvite, { isLoading: isRevokingInvite }] =
    useRevokePlatformTenantInvitationMutation();
  const [updateUser, { isLoading: isChangingEmail }] = useUpdatePlatformTenantUserMutation();
  // Only used when a location was also picked for the new hire's role — see
  // handleAdd. CreateUserCommand.role_id alone (the common case, no
  // follow-up call needed) already grants the role at creation, applying
  // everywhere; there is no location_id on that command at all (confirmed
  // against CreateUserCommand's own fields), so a location-SCOPED grant has
  // to be the same second step AssignRoleModal already uses elsewhere, just
  // chained onto the same "Create user" click instead of a separate visit
  // to this person's profile afterward.
  const [assignRole] = useAssignRoleAsPlatformMutation();
  const [attachLocation] = useAttachPlatformTenantUserLocationMutation();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [userToDeactivate, setUserToDeactivate] = useState<OrgUser | null>(null);
  const [viewingUser, setViewingUser] = useState<OrgUser | null>(null);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('view_customer_users_panel', 10);
  // A PendingRow carries no user_id — CreateUserUseCase writes the `users`
  // row and the `Invite` together, in one transaction, at invite time, but
  // ListInvitationsView only surfaces the invite's own fields. The matching
  // OrgUser (same email, `has_set_password: false`) already carries the real
  // user_id PATCH .../users/{user_id} needs, resolved here by email against
  // the users already fetched into `data.items` above — no new call needed.
  const [changeEmailTarget, setChangeEmailTarget] = useState<{
    invitationId: string;
    userId: string;
    currentEmail: string;
  } | null>(null);
  const [newEmail, setNewEmail] = useState('');
  // Set only when "Create user" fails with DEACTIVATED_USER_EMAIL_CONFLICT —
  // deactivating never frees the email, only suspends it, so re-adding via
  // "Add user" 409s (see handleReactivate's own comment below). Cleared on
  // every new submit attempt and whenever the modal is closed/reopened.
  const [deactivatedConflict, setDeactivatedConflict] = useState<{
    userId: string;
    email: string;
  } | null>(null);

  const field = (key: keyof FormState) => ({
    value: form[key] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  const departmentName = (id: string | null) =>
    departments?.find((d) => d.org_department_id === id)?.name || '-';

  const designationName = (id: string | null) =>
    designations?.find((d) => d.designation_id === id)?.name || '-';

  const users = data?.items ?? [];

  const userIdByEmail = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of users) {
      map.set(user.email.trim().toLowerCase(), user.user_id);
    }
    return map;
  }, [users]);

  // Only "pending" — "accepted" is already a real row in `users` above (would
  // double-list the same person), and "expired"/"revoked" are no longer
  // actionable, so surfacing them here would just be noise.
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
      department_id: invitation.department_id,
      designation_id: invitation.designation_id,
      expires_at: invitation.expires_at,
    }));
    return [...userRows, ...pendingRows];
  }, [users, pendingInvitations]);

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      row.kind === 'user'
        ? row.full_name.toLowerCase().includes(q) ||
          row.email.toLowerCase().includes(q) ||
          (row.title ?? '').toLowerCase().includes(q)
        : row.invited_email.toLowerCase().includes(q) || row.role.toLowerCase().includes(q)
    );
  }, [rows, searchText]);

  // Fully client-side, same as DepartmentsTab.tsx's controlled
  // sortBy/sortOrder + sortOrderFor/handleTableChange pattern — this panel
  // has no server-side sort of its own to defer to, it already fetches every
  // row for this tenant at once.
  const SORT_COMPARATORS: Record<SortKey, (a: TableRow, b: TableRow) => number> = {
    full_name: (a, b) =>
      (a.kind === 'user' ? a.full_name : a.invited_email).localeCompare(
        b.kind === 'user' ? b.full_name : b.invited_email
      ),
    title: (a, b) =>
      (a.kind === 'user' ? (a.title ?? '') : '').localeCompare(
        b.kind === 'user' ? (b.title ?? '') : ''
      ),
    department: (a, b) =>
      departmentName(a.department_id).localeCompare(departmentName(b.department_id)),
    designation: (a, b) =>
      designationName(a.designation_id).localeCompare(designationName(b.designation_id)),
    role: (a, b) =>
      (a.kind === 'user' ? (a.role ?? '') : a.role).localeCompare(
        b.kind === 'user' ? (b.role ?? '') : b.role
      ),
    status: (a, b) =>
      Number(a.kind === 'user' ? a.is_active : false) -
      Number(b.kind === 'user' ? b.is_active : false),
  };

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows].sort(SORT_COMPARATORS[sortBy]);
    return sortOrder === 'desc' ? sorted.reverse() : sorted;
    // SORT_COMPARATORS is a fresh object every render but its comparators
    // are pure and keyed only by SortKey — safe to omit here.
  }, [filteredRows, sortBy, sortOrder]);

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

  const handleAdd = async () => {
    if (!form.email.trim() || !form.first_name.trim()) {
      showToast({ message: 'Email and first name are required.', type: 'error' });
      return;
    }
    if (form.phone_no.trim() && !isPhoneValidForCountry(form.phone_no, form.country_code)) {
      showToast({ message: PHONE_VALIDATION_MESSAGE, type: 'error' });
      return;
    }
    setDeactivatedConflict(null);
    try {
      // A location-scoped role can't be granted in the same call as creation
      // — CreateUserCommand has no location_id at all, only role_id (an
      // everywhere grant). So when one or more locations were also picked,
      // create without a role first and grant one assignment PER selected
      // location right after — a role like "head_recruiter" can carry
      // different permissions at each office (Roles & Permissions' own
      // per-location overrides), so naming every office this person should
      // hold it at is the point, not a limitation to work around. Still one
      // click for whoever's filling this in — the multiple calls are this
      // function's problem, not theirs.
      const grantLocationScoped = Boolean(form.role_id && form.location_ids.length > 0);
      const user = await createUser({
        tenantId,
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || undefined,
        title: form.title.trim() || undefined,
        // Only sent alongside an actual number — a bare country code with no
        // digits isn't a phone number.
        country_code: form.phone_no.trim() ? form.country_code : undefined,
        phone_no: form.phone_no.trim() || undefined,
        department_id: form.department_id,
        role_id: grantLocationScoped ? undefined : form.role_id,
      }).unwrap();

      if (grantLocationScoped && form.role_id) {
        const failedLocations: string[] = [];
        // Sequential, not Promise.all — the same role granted at several
        // locations for the same user shouldn't race the backend's
        // duplicate-assignment check non-deterministically.
        for (const locationId of form.location_ids) {
          try {
            await assignRole({
              tenantId,
              user_id: user.user_id,
              role_id: form.role_id,
              location_id: locationId,
            }).unwrap();
            // The grant alone doesn't attach this new hire to the office —
            // organization_role and user_location_mapping are separate
            // tables (see ViewPlatformUserModal's handleAssign for the full
            // reasoning). Without this their OWN location switcher stays
            // empty for a spot they just gained a role at. Best-effort and
            // silent — a brand-new user can't already be attached anywhere.
            try {
              await attachLocation({
                tenantId,
                userId: user.user_id,
                orgAddressLocationId: locationId,
              }).unwrap();
            } catch {
              // Not worth failing "Create user" over — they can still be
              // attached manually from their profile afterward.
            }
          } catch (err) {
            const label = offices?.find((o) => o.office_id === locationId)?.city ?? locationId;
            failedLocations.push(
              getOrgErrorCode(err) === 'DUPLICATE_ROLE_ASSIGNMENT'
                ? `${label} (already held)`
                : label
            );
          }
        }
        if (failedLocations.length > 0) {
          // The user, and whichever grants DID succeed, are real — only the
          // remainder failed. Named plainly rather than a generic failure,
          // since that would understate what actually happened.
          showToast({
            message: `${user.full_name} was created, but the role grant failed at: ${failedLocations.join(', ')}. Assign it from their profile instead.`,
            type: 'error',
          });
          setIsAddOpen(false);
          setForm(emptyForm);
          return;
        }
      }

      showToast({ message: 'User created.', type: 'success' });
      setIsAddOpen(false);
      setForm(emptyForm);
    } catch (err) {
      if (getOrgErrorCode(err) === 'DEACTIVATED_USER_EMAIL_CONFLICT') {
        const existingUserId = getOrgErrorDetails(err)?.existing_user_id;
        if (typeof existingUserId === 'string') {
          setDeactivatedConflict({ userId: existingUserId, email: form.email.trim() });
          return;
        }
      }
      showToast({ message: getOrgErrorMessage(err, 'Failed to create user.'), type: 'error' });
    }
  };

  const handleReactivateConflict = async () => {
    if (!deactivatedConflict) return;
    try {
      await reactivateUser({ tenantId, userId: deactivatedConflict.userId }).unwrap();
      showToast({ message: `${deactivatedConflict.email} was reactivated.`, type: 'success' });
      setIsAddOpen(false);
      setDeactivatedConflict(null);
      setForm(emptyForm);
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to reactivate user.'),
        type: 'error',
      });
    }
  };

  const handleDeactivate = async () => {
    if (!userToDeactivate) return;
    try {
      await deactivateUser({ tenantId, userId: userToDeactivate.user_id }).unwrap();
      showToast({ message: 'User deactivated.', type: 'success' });
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
      await reactivateUser({ tenantId, userId: user.user_id }).unwrap();
      showToast({ message: 'User reactivated.', type: 'success' });
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to reactivate user.'), type: 'error' });
    }
  };

  const startChangeEmail = (invitationId: string, userId: string, currentEmail: string) => {
    setChangeEmailTarget({ invitationId, userId, currentEmail });
    setNewEmail(currentEmail);
  };

  const cancelChangeEmail = () => {
    setChangeEmailTarget(null);
    setNewEmail('');
  };

  const handleChangeEmail = async () => {
    if (!changeEmailTarget) return;
    const trimmed = newEmail.trim();
    if (!trimmed) return;
    try {
      const res = await updateUser({
        tenantId,
        userId: changeEmailTarget.userId,
        email: trimmed,
      }).unwrap();
      showToast({
        message: res.invite_resent
          ? 'Email updated — a fresh invite was sent to the new address.'
          : 'Email updated.',
        type: 'success',
      });
      cancelChangeEmail();
      // updatePlatformTenantUser only invalidates the user directory
      // ('OrgUsers') — this invitation's own `invited_email` (organization-
      // service redirects the pending invite to the new address as part of
      // the same PATCH) is a separate cache entry that needs its own
      // refetch to show the change here.
      void refetchInvitations();
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to update email.'), type: 'error' });
    }
  };

  const handleResendInvite = async (invitationId: string) => {
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

  if (isLoading) return <Loader />;

  const columns: TableProps<TableRow>['columns'] = [
    {
      title: 'Name',
      key: 'full_name',
      sorter: true,
      sortOrder: sortOrderFor('full_name'),
      render: (_: unknown, row: TableRow) =>
        row.kind === 'user' ? (
          <button
            type="button"
            onClick={() => setViewingUser(row)}
            className="text-left cursor-pointer"
          >
            <div className="font-semibold text-gray-900 hover:text-primary-600 hover:underline">
              {row.full_name}
            </div>
            <div className="text-xs text-gray-400">{row.email}</div>
          </button>
        ) : (
          <div>
            <div className="font-semibold text-gray-900">{row.invited_email}</div>
            <div className="text-xs text-gray-400">Invited, not yet accepted</div>
          </div>
        ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      sorter: true,
      sortOrder: sortOrderFor('title'),
      render: (_: unknown, row: TableRow) => (
        <span className="text-gray-600 text-sm">
          {row.kind === 'user' ? row.title || '-' : '-'}
        </span>
      ),
    },
    {
      title: 'Department',
      key: 'department',
      sorter: true,
      sortOrder: sortOrderFor('department'),
      render: (_: unknown, row: TableRow) =>
        row.department_id ? (
          <Badge status="neutral" dot={false}>
            {departmentName(row.department_id)}
          </Badge>
        ) : (
          <span className="text-gray-300 text-sm">Unassigned</span>
        ),
    },
    {
      title: 'Designation',
      key: 'designation',
      sorter: true,
      sortOrder: sortOrderFor('designation'),
      render: (_: unknown, row: TableRow) =>
        row.designation_id ? (
          <Badge status="neutral" dot={false}>
            {designationName(row.designation_id)}
          </Badge>
        ) : (
          <span className="text-gray-300 text-sm">Unassigned</span>
        ),
    },
    {
      title: 'Role',
      key: 'role',
      sorter: true,
      sortOrder: sortOrderFor('role'),
      render: (_: unknown, row: TableRow) =>
        row.role ? (
          <span className="text-gray-600 text-sm">{row.role}</span>
        ) : (
          <span className="text-gray-300 text-sm">Unassigned</span>
        ),
    },
    {
      title: 'Status',
      key: 'status',
      sorter: true,
      sortOrder: sortOrderFor('status'),
      render: (_: unknown, row: TableRow) => {
        if (row.kind === 'pending') return <Badge status="warning">Pending</Badge>;
        if (!row.is_active) return <Badge status="neutral">Deactivated</Badge>;
        // is_active is set true immediately on creation, regardless of
        // whether this person has actually finished setup — has_set_password
        // is what tells "invited, hasn't logged in yet" apart from a real
        // active user.
        if (!row.has_set_password) return <Badge status="warning">Pending setup</Badge>;
        return <Badge status="success">Active</Badge>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 115,
      render: (_: unknown, row: TableRow) => {
        if (row.kind === 'pending') {
          const matchedUserId = userIdByEmail.get(row.invited_email.trim().toLowerCase());
          return (
            <div className="flex gap-1">
              {matchedUserId && (
                <Tooltip title="Change email">
                  <button
                    type="button"
                    aria-label="Change email"
                    className="p-2 rounded-full text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    disabled={isChangingEmail}
                    onClick={() =>
                      startChangeEmail(row.invitation_id, matchedUserId, row.invited_email)
                    }
                  >
                    <MdOutlineEdit />
                  </button>
                </Tooltip>
              )}
              <Tooltip title="Resend invitation">
                <button
                  type="button"
                  aria-label="Resend invitation"
                  className="p-2 rounded-full text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  disabled={isResendingInvite}
                  onClick={() => handleResendInvite(row.invitation_id)}
                >
                  <MdOutlineRefresh />
                </button>
              </Tooltip>
              <Tooltip title="Revoke invitation">
                <button
                  type="button"
                  aria-label="Revoke invitation"
                  className="group p-2 rounded-full hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  disabled={isRevokingInvite}
                  onClick={() => handleRevokeInvite(row.invitation_id)}
                >
                  <MdOutlineBlock className="text-gray-600 transition-colors group-hover:text-red-600" />
                </button>
              </Tooltip>
            </div>
          );
        }
        return row.is_active ? (
          <Tooltip title="Deactivate user">
            <button
              type="button"
              aria-label="Deactivate user"
              className="group p-2 hover:bg-red-50 rounded-full cursor-pointer transition-colors"
              onClick={() => setUserToDeactivate(row)}
            >
              <MdPersonOff className="text-gray-600 transition-colors group-hover:text-red-600" />
            </button>
          </Tooltip>
        ) : (
          <button
            type="button"
            aria-label="Reactivate user"
            className="p-2 hover:bg-green-50 rounded-full disabled:cursor-not-allowed cursor-pointer transition-colors disabled:opacity-50"
            disabled={isReactivating}
            onClick={() => handleReactivate(row)}
          >
            <MdRestore className="text-green-600" />
          </button>
        );
      },
    },
  ];

  const dataSource: TableRow[] = sortedRows.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <Typography variant="body2">This company&apos;s team members.</Typography>
          <span className="text-xs font-medium text-gray-400">
            {users.length} {users.length === 1 ? 'user' : 'users'}
            {pendingInvitations.length > 0 &&
              `, ${pendingInvitations.length} pending ${pendingInvitations.length === 1 ? 'invite' : 'invites'}`}
            {searchText.trim() && ` (${sortedRows.length} shown)`}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-52">
            <Input
              prefix={<MdSearch className="text-gray-400" />}
              placeholder="Search users..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="w-44">
            <Select
              appname="cfp"
              showFilterIcon
              value={includeInactive}
              onChange={(value) => {
                setIncludeInactive(value as 'active' | 'all');
                setPage(0);
              }}
              options={[
                { label: 'Active only', value: 'active' },
                { label: 'Include deactivated', value: 'all' },
              ]}
            />
          </div>
          <Button
            className="rounded-full border border-gray-300 px-4 py-2 flex items-center gap-1 hover:bg-gray-50 transition-colors shrink-0"
            onClick={() => setIsBulkImportOpen(true)}
          >
            <MdOutlineFileUpload /> Import team
          </Button>
          <Button
            className="rounded-full bg-button text-white px-4 py-2 flex items-center gap-1 shadow-sm hover:shadow-md transition-shadow shrink-0"
            onClick={() => setIsAddOpen(true)}
          >
            <MdOutlineAdd /> Add user
          </Button>
        </div>
      </div>

      <RowsPerPageSelect
        pageSize={pageSize}
        options={PAGE_SIZE_OPTIONS}
        onChange={(size) => {
          setPageSize(size);
          setPage(0);
        }}
      />

      <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <CustomTable<TableRow>
          columns={columns}
          dataSource={dataSource}
          onChange={handleTableChange}
          emptyText={
            searchText.trim() ? 'No users match your search.' : 'No users or pending invites yet.'
          }
        />
      </div>

      <MasterPagination
        current={page + 1}
        pageSize={pageSize}
        total={sortedRows.length}
        itemLabel="users"
        onPageChange={(nextPage) => setPage(nextPage - 1)}
      />

      <AntdCommonModal
        open={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setDeactivatedConflict(null);
        }}
        title="Add user"
      >
        <div className="flex flex-col gap-4">
          {deactivatedConflict && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                A deactivated user already exists with the email{' '}
                <span className="font-medium">{deactivatedConflict.email}</span>. Deactivating never
                frees the email, so reactivate that account instead of creating a new one.
              </p>
              <Button
                className="mt-3 rounded-3xl bg-button px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleReactivateConflict}
                disabled={isReactivating}
              >
                {isReactivating ? 'Reactivating…' : 'Reactivate existing user'}
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input placeholder="First name *" {...field('first_name')} />
            <Input placeholder="Last name" {...field('last_name')} />
          </div>
          <Input placeholder="Email *" type="email" {...field('email')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NameTitleSelect
              value={form.title}
              onChange={(value) => setForm((prev) => ({ ...prev, title: value ?? '' }))}
            />
            <PhoneNumberField
              countryCode={form.country_code}
              onCountryCodeChange={(value) => setForm((prev) => ({ ...prev, country_code: value }))}
              phoneNumber={form.phone_no}
              onPhoneNumberChange={(value) => setForm((prev) => ({ ...prev, phone_no: value }))}
            />
          </div>
          <Select
            appname="cfp"
            placeholder="Department (optional)"
            value={form.department_id}
            onChange={(value) => setForm((prev) => ({ ...prev, department_id: value }))}
            options={(departments || []).map((d) => ({
              label: d.name,
              value: d.org_department_id,
            }))}
          />
          <RoleLocationPicker
            roles={roles}
            offices={offices ?? []}
            roleId={form.role_id}
            onRoleChange={(value) => setForm((prev) => ({ ...prev, role_id: value }))}
            locationIds={form.location_ids}
            onLocationIdsChange={(value) => setForm((prev) => ({ ...prev, location_ids: value }))}
            rolePlaceholder="Role (optional, can be assigned later)"
            tenantId={tenantId}
            onCreateRole={createRole}
          />
          <div className="grid grid-cols-2 gap-4">
            <Button
              className="w-full border border-gray-300 rounded-full py-2"
              onClick={() => {
                setIsAddOpen(false);
                setDeactivatedConflict(null);
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              className="w-full bg-button text-white rounded-full py-2"
              onClick={handleAdd}
              disabled={isCreating}
            >
              {isCreating ? 'Creating…' : 'Create user'}
            </Button>
          </div>
        </div>
      </AntdCommonModal>

      {userToDeactivate && (
        <ConfirmationModal
          title={`Deactivate "${userToDeactivate.full_name}"? They'll immediately lose access.`}
          confirmText="DEACTIVATE"
          isLoading={isDeactivating}
          onConfirm={handleDeactivate}
          onClose={() => setUserToDeactivate(null)}
        />
      )}

      <AntdCommonModal
        open={changeEmailTarget !== null}
        onClose={cancelChangeEmail}
        title="Change email"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Correcting a typo? This resends the invitation to the new address —{' '}
            {changeEmailTarget?.currentEmail} will no longer receive it.
          </p>
          <Input
            type="email"
            placeholder="Corrected email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Button
              className="w-full border border-gray-300 rounded-full py-2"
              onClick={cancelChangeEmail}
              disabled={isChangingEmail}
            >
              Cancel
            </Button>
            <Button
              className="w-full bg-button text-white rounded-full py-2"
              onClick={() => void handleChangeEmail()}
              disabled={!newEmail.trim() || isChangingEmail}
            >
              {isChangingEmail ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </AntdCommonModal>

      <BulkImport
        open={isBulkImportOpen}
        tenantId={tenantId}
        isMaster
        onClose={() => setIsBulkImportOpen(false)}
      />

      <ViewPlatformUserModal
        open={viewingUser !== null}
        tenantId={tenantId}
        user={viewingUser}
        onClose={() => setViewingUser(null)}
      />
    </div>
  );
};

export default UsersPanel;
