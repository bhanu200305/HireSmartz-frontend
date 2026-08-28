import React, { useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import {
  MdOutlineAdd,
  MdOutlineFileUpload,
  MdPersonOff,
  MdRestore,
  MdSearch,
} from 'react-icons/md';
import {
  Badge,
  Button,
  CustomTable,
  Input,
  PhoneNumberField,
  Select,
  Typography,
  paginationConfig,
  showToast,
} from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import ConfirmationModal from '../../../shared/ui/ConfirmationModal';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import {
  useListPlatformTenantUsersQuery,
  useCreatePlatformTenantUserMutation,
  useDeactivatePlatformTenantUserMutation,
  useReactivatePlatformTenantUserMutation,
  useAttachPlatformTenantUserLocationMutation,
} from '../../../../api/organization-service/Platform/users';
import { useListPlatformTenantDepartmentsQuery } from '../../../../api/organization-service/Platform/departments';
import { useListPlatformTenantOfficesQuery } from '../../../../api/organization-service/Platform/offices';
import { useAssignRoleAsPlatformMutation } from '../../../../api/organization-service/Roles/assignments';
import { useRolesCatalog } from '../../../../hooks/useRolesCatalog';
import type { OrgUser } from '../../../../api/organization-service/Users/users';
import {
  getOrgErrorCode,
  getOrgErrorMessage,
} from '../../../../shared/utils/auth/orgError.helpers';
import {
  isPhoneValidForCountry,
  PHONE_VALIDATION_MESSAGE,
} from '../../../../shared/utils/validation/phoneValidation';
import BulkImport from '../../../MyCompany/Team/BulkImport';
import ViewPlatformUserModal from './ViewPlatformUserModal';
import RoleLocationPicker from './RoleLocationPicker';

type UserRow = OrgUser & { key: string };

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
 * tabs instead of the plain divided list this used to be.
 */
const UsersPanel: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [includeInactive, setIncludeInactive] = useState<'active' | 'all'>('active');
  const { data, isLoading } = useListPlatformTenantUsersQuery({
    tenantId,
    includeInactive: includeInactive === 'all',
  });
  const { data: departments } = useListPlatformTenantDepartmentsQuery(tenantId);
  const { data: offices } = useListPlatformTenantOfficesQuery(tenantId);
  const { roles, createRole } = useRolesCatalog({ scope: 'tenant', tenantId, isMaster: true });

  const [createUser, { isLoading: isCreating }] = useCreatePlatformTenantUserMutation();
  const [deactivateUser, { isLoading: isDeactivating }] = useDeactivatePlatformTenantUserMutation();
  const [reactivateUser, { isLoading: isReactivating }] = useReactivatePlatformTenantUserMutation();
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

  const field = (key: keyof FormState) => ({
    value: form[key] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  const departmentName = (id: string | null) =>
    departments?.find((d) => d.org_department_id === id)?.name || '-';

  const users = data?.items ?? [];

  const filteredUsers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (user) =>
        user.full_name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        (user.title ?? '').toLowerCase().includes(q)
    );
  }, [users, searchText]);

  const handleAdd = async () => {
    if (!form.email.trim() || !form.first_name.trim()) {
      showToast({ message: 'Email and first name are required.', type: 'error' });
      return;
    }
    if (form.phone_no.trim() && !isPhoneValidForCountry(form.phone_no, form.country_code)) {
      showToast({ message: PHONE_VALIDATION_MESSAGE, type: 'error' });
      return;
    }
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
      showToast({ message: getOrgErrorMessage(err, 'Failed to create user.'), type: 'error' });
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

  if (isLoading) return <Loader />;

  const columns: TableProps<UserRow>['columns'] = [
    {
      title: 'Name',
      key: 'full_name',
      sorter: (a: UserRow, b: UserRow) => a.full_name.localeCompare(b.full_name),
      render: (_: unknown, user: UserRow) => (
        <button
          type="button"
          onClick={() => setViewingUser(user)}
          className="text-left cursor-pointer"
        >
          <div className="font-semibold text-gray-900 hover:text-primary-600 hover:underline">
            {user.full_name}
          </div>
          <div className="text-xs text-gray-400">{user.email}</div>
        </button>
      ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      sorter: (a: UserRow, b: UserRow) => (a.title ?? '').localeCompare(b.title ?? ''),
      render: (_: unknown, user: UserRow) => (
        <span className="text-gray-600 text-sm">{user.title || '—'}</span>
      ),
    },
    {
      title: 'Department',
      key: 'department',
      sorter: (a: UserRow, b: UserRow) =>
        departmentName(a.department_id).localeCompare(departmentName(b.department_id)),
      render: (_: unknown, user: UserRow) =>
        user.department_id ? (
          <Badge status="neutral" dot={false}>
            {departmentName(user.department_id)}
          </Badge>
        ) : (
          <span className="text-gray-300 text-sm">Unassigned</span>
        ),
    },
    {
      title: 'Status',
      key: 'status',
      sorter: (a: UserRow, b: UserRow) => Number(a.is_active) - Number(b.is_active),
      render: (_: unknown, user: UserRow) => (
        <Badge status={user.is_active ? 'success' : 'neutral'}>
          {user.is_active ? 'Active' : 'Deactivated'}
        </Badge>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_: unknown, user: UserRow) =>
        user.is_active ? (
          <button
            type="button"
            aria-label="Deactivate user"
            className="p-2 hover:bg-red-50 rounded-full cursor-pointer transition-colors"
            onClick={() => setUserToDeactivate(user)}
          >
            <MdPersonOff className="text-red-500" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Reactivate user"
            className="p-2 hover:bg-green-50 rounded-full cursor-pointer transition-colors disabled:opacity-50"
            disabled={isReactivating}
            onClick={() => handleReactivate(user)}
          >
            <MdRestore className="text-green-600" />
          </button>
        ),
    },
  ];

  const dataSource: UserRow[] = filteredUsers.map((user) => ({ ...user, key: user.user_id }));

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <Typography variant="body2">This company&apos;s team members.</Typography>
          <span className="text-xs font-medium text-gray-400">
            {dataSource.length} {dataSource.length === 1 ? 'user' : 'users'}
            {searchText.trim() && ` of ${users.length}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-52">
            <Input
              prefix={<MdSearch className="text-gray-400" />}
              placeholder="Search users..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div className="w-44">
            <Select
              appname="cfp"
              value={includeInactive}
              onChange={(value) => setIncludeInactive(value as 'active' | 'all')}
              options={[
                { label: 'Active only', value: 'active' },
                { label: 'Include deactivated', value: 'all' },
              ]}
            />
          </div>
          <Button
            className="rounded-full border border-gray-300 px-4 py-1.5 flex items-center gap-1 hover:bg-gray-50 transition-colors shrink-0"
            onClick={() => setIsBulkImportOpen(true)}
          >
            <MdOutlineFileUpload /> Import team
          </Button>
          <Button
            className="rounded-full bg-button text-white px-4 py-1.5 flex items-center gap-1 shadow-sm hover:shadow-md transition-shadow shrink-0"
            onClick={() => setIsAddOpen(true)}
          >
            <MdOutlineAdd /> Add user
          </Button>
        </div>
      </div>

      <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <CustomTable<UserRow>
          columns={columns}
          dataSource={dataSource}
          emptyText={searchText.trim() ? 'No users match your search.' : 'No users yet.'}
          pagination={paginationConfig('users')}
        />
      </div>

      <AntdCommonModal open={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add user">
        <div className="flex flex-col gap-4">
          <Input placeholder="Email *" type="email" {...field('email')} />
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="First name *" {...field('first_name')} />
            <Input placeholder="Last name" {...field('last_name')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Title" {...field('title')} />
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
            rolePlaceholder="Role (optional — can be assigned later)"
            tenantId={tenantId}
            onCreateRole={createRole}
          />
          <div className="grid grid-cols-2 gap-4">
            <Button
              className="w-full border border-gray-300 rounded-full py-2"
              onClick={() => setIsAddOpen(false)}
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
