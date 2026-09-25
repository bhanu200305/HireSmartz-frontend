import React, { useEffect, useMemo, useState } from 'react';
import { Select } from 'antd';
import { MdClose, MdEdit } from 'react-icons/md';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import {
  Badge,
  Button,
  Input,
  NameTitleSelect,
  PhoneNumberField,
  Typography,
  showToast,
} from '../../../shared';
import ConfirmationModal from '../../../shared/ui/ConfirmationModal';
import type { OrgUser } from '../../../../api/organization-service/Users/users';
import { useListPlatformTenantOfficesQuery } from '../../../../api/organization-service/Platform/offices';
import { useListPlatformTenantDepartmentsQuery } from '../../../../api/organization-service/Platform/departments';
import {
  useUpdatePlatformTenantUserMutation,
  useListPlatformTenantUserLocationsQuery,
  useAttachPlatformTenantUserLocationMutation,
  useDetachPlatformTenantUserLocationMutation,
} from '../../../../api/organization-service/Platform/users';
import {
  useAssignRoleAsPlatformMutation,
  useRevokeRoleAsPlatformMutation,
  useListUserRoleAssignmentsAsPlatformQuery,
} from '../../../../api/organization-service/Roles/assignments';
import { useGetPlatformUserDashboardQuery } from '../../../../api/organization-service/Roles/dashboard';
import { useRolesCatalog } from '../../../../hooks/useRolesCatalog';
import {
  getOrgErrorCode,
  getOrgErrorMessage,
} from '../../../../shared/utils/auth/orgError.helpers';
import {
  isPhoneValidForCountry,
  PHONE_VALIDATION_MESSAGE,
} from '../../../../shared/utils/validation/phoneValidation';
import RoleLocationPicker from './RoleLocationPicker';

type ViewPlatformUserModalProps = {
  open: boolean;
  tenantId: string;
  user: OrgUser | null;
  onClose: () => void;
};

const DEFAULT_COUNTRY_CODE = '+1';

type EditFormState = {
  email: string;
  first_name: string;
  last_name: string;
  title: string;
  country_code: string;
  phone_no: string;
  department_id: string | undefined;
};

const toEditForm = (user: OrgUser): EditFormState => ({
  email: user.email,
  first_name: user.first_name,
  last_name: user.last_name || '',
  title: user.title || '',
  country_code: user.country_code || DEFAULT_COUNTRY_CODE,
  phone_no: user.phone_no || '',
  department_id: user.department_id || undefined,
});

/** "All locations" sentinel for the permissions-view switcher — antd's
 * `Select` needs a real value, and `undefined` (what the dashboard query
 * actually wants for "the all-locations union") isn't one. */
const ALL_LOCATIONS = '__ALL__';

/**
 * Super Admin's "view this company's user" — Companies -> a company ->
 * Users -> click a name. The basic fields below are already everything
 * `GET /v1/platform/tenants/{tenant_id}/users` returns per row (this
 * service has no single-user GET, same gap the tenant-side
 * ViewOrganisationUser already works around by reading the row off its own
 * list query) — nothing more to fetch for those.
 *
 * EDITING (new): wires the platform mirror of `PATCH /v1/users/{user_id}` —
 * `update_user_as_platform` in users_platform_router.py already existed
 * server-side with no frontend caller, same situation the role-assignment
 * routes were in before this feature. `override` holds the mutation's own
 * response so the modal reflects the save immediately without waiting on
 * the list query's tag-invalidation refetch (which updates the table behind
 * this modal, not this already-open snapshot of one row).
 *
 * PER-LOCATION PERMISSIONS (new): a role can carry different permissions at
 * different offices (Roles & Permissions' own per-location overrides), so
 * "Effective permissions" is no longer just the all-locations union — a
 * switcher built from every location any of this person's ROLES actually
 * apply at (`assignments[].location_id`, not `available_locations` — that's
 * an unrelated HR "attached to" fact) re-queries
 * `GET .../dashboard?location_id=` for exactly that office. Same endpoint,
 * same query param the tenant-ambient dashboard route already supported;
 * this view just wasn't using it yet.
 *
 * "Current role(s)" and "Grant a role" wire real backend capability that had
 * no frontend consumer, or in one case did not exist until this feature
 * needed it:
 *
 *  - `GET .../roles/users/{user_id}/assignments` (ListUserRoleAssignmentsUseCase)
 *    returns this person's actual, standing role grants: assignment_id,
 *    role_id, location_id. Deliberately unjoined — role name comes from
 *    `roles` (already fetched for the grant picker below) and location label
 *    from `offices` (ditto), so this needs no extra request to be readable.
 *  - `GET .../roles/users/{user_id}/dashboard` (platform mirror of the
 *    tenant-ambient route ViewOrganisationUser already uses) resolves
 *    effective permissions, optionally scoped to one location.
 *  - `POST/DELETE .../roles/assignments...` (grant/revoke) already existed
 *    server-side with no frontend caller before the earlier pass of this
 *    feature.
 *
 * A role grant now names MULTIPLE locations at once (`RoleLocationPicker`'s
 * own multi-select) — the backend has no bulk shape, only one location_id
 * per assignment, so this fires one call per selected location.
 *
 * ATTACHED LOCATIONS (new): granting a role scoped to an office ONLY writes
 * `organization_role` — it does not attach the holder there. That gap is
 * exactly what left a location-scoped grant invisible in the HOLDER's OWN
 * portal: `useActiveLocation`'s switcher reads `user_location_mapping` (via
 * `dashboard.available_locations`), a separate HR fact nothing else writes.
 * So `handleAssign` below now attaches the user to every location a grant
 * just succeeded at, and the "Attached locations" section (the platform
 * mirror of `ViewOrganisationUser`'s own — `GET/POST/DELETE
 * /v1/platform/tenants/{tenant_id}/users/{user_id}/locations`, previously a
 * real backend gap, now closed the same "bind explicitly" way as every
 * other route in this file) lets an admin fix or extend that by hand too.
 */
const ViewPlatformUserModal: React.FC<ViewPlatformUserModalProps> = ({
  open,
  tenantId,
  user,
  onClose,
}) => {
  const { roles, createRole } = useRolesCatalog({ scope: 'tenant', tenantId, isMaster: true });
  const { data: offices } = useListPlatformTenantOfficesQuery(tenantId, {
    skip: !open || !tenantId,
  });
  const { data: departments } = useListPlatformTenantDepartmentsQuery(tenantId, {
    skip: !open || !tenantId,
  });
  const { data: assignments, isFetching: isAssignmentsLoading } =
    useListUserRoleAssignmentsAsPlatformQuery(
      { tenantId, userId: user?.user_id ?? '' },
      { skip: !open || !tenantId || !user }
    );
  const { data: userLocations, isFetching: isUserLocationsLoading } =
    useListPlatformTenantUserLocationsQuery(
      { tenantId, userId: user?.user_id ?? '' },
      { skip: !open || !tenantId || !user }
    );

  const [viewLocationId, setViewLocationId] = useState<string>(ALL_LOCATIONS);
  const { data: dashboard, isFetching: isPermissionsLoading } = useGetPlatformUserDashboardQuery(
    {
      tenantId,
      userId: user?.user_id ?? '',
      locationId: viewLocationId === ALL_LOCATIONS ? undefined : viewLocationId,
    },
    { skip: !open || !tenantId || !user }
  );

  const [assignRole, { isLoading: isAssigning }] = useAssignRoleAsPlatformMutation();
  const [revokeRole, { isLoading: isRevoking }] = useRevokeRoleAsPlatformMutation();
  const [updateUser, { isLoading: isSaving }] = useUpdatePlatformTenantUserMutation();
  const [attachLocation, { isLoading: isAttachingLocation }] =
    useAttachPlatformTenantUserLocationMutation();
  const [detachLocation, { isLoading: isDetachingLocation }] =
    useDetachPlatformTenantUserLocationMutation();
  const [pendingAttachLocationId, setPendingAttachLocationId] = useState<string | undefined>(
    undefined
  );

  const [roleId, setRoleId] = useState<string | undefined>(undefined);
  const [locationIds, setLocationIds] = useState<string[]>([]);
  // Collapsed by default, matching ViewOrganisationUser's own "+ Assign
  // role" button — an admin who can now SEE this person's current role(s)
  // above has no need for an open form implying there are none.
  const [showAssign, setShowAssign] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [override, setOverride] = useState<OrgUser | null>(null);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  const displayUser = override ?? user;

  // A different user was opened (or this one was re-fetched) — drop
  // whatever local edit state belonged to the previous one rather than
  // showing it stitched onto someone else's row.
  useEffect(() => {
    setOverride(null);
    setIsEditing(false);
    setEditForm(null);
    setViewLocationId(ALL_LOCATIONS);
  }, [user?.user_id]);

  const officeLabel = (officeId: string | null) => {
    if (!officeId) return 'Applies everywhere';
    const office = offices?.find((o) => o.office_id === officeId);
    return office ? `${office.city}, ${office.address_line_1}` : 'Unknown location';
  };
  const roleName = (id: string) => roles.find((r) => r.id === id)?.roleName ?? 'Unknown role';

  const assignmentLocationIds = useMemo(
    () =>
      Array.from(
        new Set((assignments ?? []).map((a) => a.location_id).filter((id): id is string => !!id))
      ),
    [assignments]
  );

  const handleClose = () => {
    setRoleId(undefined);
    setLocationIds([]);
    setShowAssign(false);
    setIsEditing(false);
    setEditForm(null);
    setPendingAttachLocationId(undefined);
    onClose();
  };

  const handleAssign = async () => {
    if (!user || !roleId) return;
    // Empty selection = "applies everywhere", exactly like before this was
    // multi-select — a single call with location_id: null. Otherwise, one
    // call PER selected location: the backend has no bulk-grant shape, and
    // a role can confer different permissions at each (Roles & Permissions'
    // own per-location overrides), so naming every office is the point.
    const targets: (string | null)[] = locationIds.length > 0 ? locationIds : [null];
    const failures: string[] = [];
    const attachFailures: string[] = [];
    let successCount = 0;
    for (const target of targets) {
      try {
        const result = await assignRole({
          tenantId,
          user_id: user.user_id,
          role_id: roleId,
          location_id: target,
        }).unwrap();
        successCount += 1;
        void result;

        // Granting a role scoped to an office only writes organization_role
        // — it doesn't attach the holder there, so their OWN location
        // switcher (useActiveLocation, reading dashboard.available_locations)
        // would stay empty for a spot they just gained a role at. Best-effort
        // and silent when they're already attached (DUPLICATE_USER_LOCATION_MAPPING
        // — not a problem, just means someone attached them earlier); a
        // genuine failure here is surfaced separately below rather than
        // silently leaving the switcher broken again.
        if (target) {
          try {
            await attachLocation({
              tenantId,
              userId: user.user_id,
              orgAddressLocationId: target,
            }).unwrap();
          } catch (attachErr) {
            if (getOrgErrorCode(attachErr) !== 'DUPLICATE_USER_LOCATION_MAPPING') {
              attachFailures.push(officeLabel(target));
            }
          }
        }
      } catch (err) {
        const label = target ? officeLabel(target) : 'Applies everywhere';
        // DUPLICATE_ROLE_ASSIGNMENT's raw message is a bare user_id +
        // role_id, both UUIDs — meaningless in a toast. Translate it into
        // what actually happened instead of surfacing backend internals.
        failures.push(
          getOrgErrorCode(err) === 'DUPLICATE_ROLE_ASSIGNMENT'
            ? `${label} (already held)`
            : `${label} (${getOrgErrorMessage(err, 'failed')})`
        );
      }
    }

    if (successCount > 0) {
      showToast({
        message: `"${roleName(roleId)}" assigned at ${successCount} ${successCount === 1 ? 'location' : 'locations'}.`,
        type: 'success',
      });
    }
    if (failures.length > 0) {
      showToast({
        message: `Some grants didn't go through: ${failures.join('; ')}.`,
        type: 'error',
      });
    }
    if (attachFailures.length > 0) {
      showToast({
        message: `Role granted, but ${user.full_name} couldn't be attached to: ${attachFailures.join(', ')}. Their own location switcher won't show ${attachFailures.length === 1 ? 'it' : 'these'} until attached from "Attached locations" below.`,
        type: 'error',
      });
    }
    if (failures.length === 0) {
      setRoleId(undefined);
      setLocationIds([]);
      setShowAssign(false);
    }
  };

  const handleAttachLocation = async () => {
    if (!user || !pendingAttachLocationId) return;
    try {
      await attachLocation({
        tenantId,
        userId: user.user_id,
        orgAddressLocationId: pendingAttachLocationId,
      }).unwrap();
      setPendingAttachLocationId(undefined);
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to attach location.'), type: 'error' });
    }
  };

  const handleDetachLocation = async (orgAddressLocationId: string) => {
    if (!user) return;
    try {
      await detachLocation({ tenantId, userId: user.user_id, orgAddressLocationId }).unwrap();
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to detach location.'), type: 'error' });
    }
  };

  const handleRevoke = async (assignmentId: string, label: string) => {
    if (!user) return;
    try {
      await revokeRole({ tenantId, assignmentId, userId: user.user_id }).unwrap();
      showToast({ message: `"${label}" revoked.`, type: 'success' });
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to revoke role.'), type: 'error' });
    }
  };

  const startEditing = () => {
    if (!displayUser) return;
    setEditForm(toEditForm(displayUser));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm(null);
  };

  const field = (key: keyof EditFormState) => ({
    value: editForm?.[key] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setEditForm((prev) => (prev ? { ...prev, [key]: e.target.value } : prev)),
  });

  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const newEmail = e.target.value.trim();
    if (newEmail && displayUser && newEmail !== displayUser.email) {
      setPendingEmail(newEmail);
      setShowEmailConfirm(true);
    }
  };

  const save = async (email?: string) => {
    if (!user || !editForm) return;
    if (
      editForm.phone_no.trim() &&
      !isPhoneValidForCountry(editForm.phone_no, editForm.country_code)
    ) {
      showToast({ message: PHONE_VALIDATION_MESSAGE, type: 'error' });
      return;
    }
    try {
      const updated = await updateUser({
        tenantId,
        userId: user.user_id,
        first_name: editForm.first_name.trim() || undefined,
        last_name: editForm.last_name.trim() || undefined,
        title: editForm.title.trim() || undefined,
        country_code: editForm.phone_no.trim() ? editForm.country_code : undefined,
        phone_no: editForm.phone_no.trim() || undefined,
        department_id: editForm.department_id,
        ...(email ? { email } : {}),
      }).unwrap();
      setOverride(updated);
      showToast({ message: 'User updated.', type: 'success' });
      // null when email wasn't touched. true/false only appear alongside an
      // email change — true means they still had a pending, un-accepted
      // invite and a fresh one just went to the corrected address, so the
      // admin knows the corrected address actually got a working link.
      if (updated.invite_resent === true) {
        showToast({ message: 'Invitation resent to the new email.', type: 'success' });
      }
      setIsEditing(false);
      setEditForm(null);
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to update user.'), type: 'error' });
    }
  };

  if (!displayUser) return null;

  return (
    <AntdCommonModal open={open} onClose={handleClose}>
      <div className="flex flex-col gap-5">
        {/* pr-10: clears antd's absolutely-positioned close button — see
            TenantAnalyticsModal's own header row for the same gutter. */}
        <div className="flex items-center justify-between pr-10">
          <Typography variant="h4">{displayUser.full_name}</Typography>
          {displayUser.is_active && !isEditing && (
            <Button
              className="rounded-full border border-gray-300 px-4 py-1.5 flex items-center gap-1 text-sm"
              onClick={startEditing}
            >
              <MdEdit size={14} /> Edit
            </Button>
          )}
        </div>

        {isEditing && editForm ? (
          <div className="pb-4 border-b border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input placeholder="Email" defaultValue={editForm.email} onBlur={handleEmailBlur} />
              <Input placeholder="First name *" {...field('first_name')} />
              <Input placeholder="Last name" {...field('last_name')} />
              <NameTitleSelect
                className="w-full"
                value={editForm.title}
                onChange={(value) =>
                  setEditForm((prev) => (prev ? { ...prev, title: value ?? '' } : prev))
                }
              />
              <PhoneNumberField
                countryCode={editForm.country_code}
                onCountryCodeChange={(value) =>
                  setEditForm((prev) => (prev ? { ...prev, country_code: value } : prev))
                }
                phoneNumber={editForm.phone_no}
                onPhoneNumberChange={(value) =>
                  setEditForm((prev) => (prev ? { ...prev, phone_no: value } : prev))
                }
              />
              <Select
                placeholder="Department (optional)"
                value={editForm.department_id}
                onChange={(value) =>
                  setEditForm((prev) => (prev ? { ...prev, department_id: value } : prev))
                }
                allowClear
                options={(departments ?? []).map((d) => ({
                  label: d.name,
                  value: d.org_department_id,
                }))}
              />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button
                className="rounded-full bg-button text-white px-6 py-2 disabled:opacity-60"
                onClick={() => save()}
                disabled={isSaving}
              >
                {isSaving ? 'Saving…' : 'Save changes'}
              </Button>
              <Button
                className="rounded-full border border-gray-300 px-6 py-2"
                onClick={cancelEditing}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Typography variant="subtitle2">Email</Typography>
              <Typography variant="body1">{displayUser.email}</Typography>
            </div>
            <div>
              <Typography variant="subtitle2">Phone</Typography>
              <Typography variant="body1">
                {displayUser.phone_no
                  ? `${displayUser.country_code || ''}${displayUser.phone_no}`
                  : '-'}
              </Typography>
            </div>
            <div>
              <Typography variant="subtitle2">Title</Typography>
              <Typography variant="body1">{displayUser.title || '-'}</Typography>
            </div>
            <div>
              <Typography variant="subtitle2">Status</Typography>
              {/* is_active alone can't tell a real, logged-in user apart
                  from someone still sitting on an unaccepted invite — see
                  OrgUser.has_set_password's own docstring. */}
              <Badge
                status={
                  !displayUser.is_active
                    ? 'neutral'
                    : displayUser.has_set_password
                      ? 'success'
                      : 'warning'
                }
              >
                {!displayUser.is_active
                  ? 'Deactivated'
                  : displayUser.has_set_password
                    ? 'Active'
                    : 'Pending setup'}
              </Badge>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Typography variant="subtitle1">Current role(s)</Typography>
            {displayUser.is_active && !showAssign && (
              <Button
                className="text-xs font-semibold text-primary-600 border border-primary-200 rounded-full px-3 py-1.5"
                onClick={() => setShowAssign(true)}
              >
                + Grant a role
              </Button>
            )}
          </div>

          {isAssignmentsLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : assignments?.length ? (
            <div className="flex flex-col gap-2 mb-1">
              {assignments.map((assignment) => (
                <div
                  key={assignment.assignment_id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-gray-50/60 px-3 py-2"
                >
                  <div>
                    <span className="text-sm font-medium text-gray-800">
                      {roleName(assignment.role_id)}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {officeLabel(assignment.location_id)}
                    </span>
                  </div>
                  {displayUser.is_active && (
                    <button
                      type="button"
                      aria-label={`Revoke ${roleName(assignment.role_id)}`}
                      disabled={isRevoking}
                      onClick={() =>
                        handleRevoke(assignment.assignment_id, roleName(assignment.role_id))
                      }
                      className="p-1.5 rounded-full hover:bg-red-50 text-red-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <MdClose size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-1">No role assigned yet.</p>
          )}

          {displayUser.is_active && showAssign && (
            <div className="mt-3">
              <RoleLocationPicker
                roles={roles}
                offices={offices ?? []}
                roleId={roleId}
                onRoleChange={setRoleId}
                locationIds={locationIds}
                onLocationIdsChange={setLocationIds}
                tenantId={tenantId}
                onCreateRole={createRole}
              />
              <div className="flex items-center gap-2 mt-3">
                <Button
                  className="rounded-full bg-button text-white px-6 py-2 disabled:opacity-60"
                  onClick={handleAssign}
                  disabled={!roleId || isAssigning}
                >
                  {isAssigning ? 'Assigning…' : 'Grant role'}
                </Button>
                <Button
                  className="rounded-full border border-gray-300 px-6 py-2"
                  onClick={() => {
                    setShowAssign(false);
                    setRoleId(undefined);
                    setLocationIds([]);
                  }}
                  disabled={isAssigning}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-gray-100">
          <Typography variant="subtitle1" className="mb-1 block">
            Attached locations
          </Typography>
          <p className="text-xs text-gray-500 mb-3">
            Offices this person is attached to. This is what powers the location switcher on their
            OWN dashboard. Granting a role at an office (above) attaches them here automatically;
            use this to fix or extend that by hand.
          </p>

          {isUserLocationsLoading ? (
            <p className="text-sm text-gray-400 mb-3">Loading…</p>
          ) : (
            <div className="flex flex-wrap gap-2 mb-3">
              {(userLocations?.org_address_location_ids ?? []).length === 0 ? (
                <p className="text-sm text-gray-400">Not attached to any office yet.</p>
              ) : (
                userLocations?.org_address_location_ids.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 pl-3 pr-1.5 py-1 text-sm text-gray-700"
                  >
                    {officeLabel(id)}
                    {displayUser.is_active && (
                      <button
                        type="button"
                        aria-label={`Detach ${officeLabel(id)}`}
                        disabled={isDetachingLocation}
                        onClick={() => handleDetachLocation(id)}
                        className="p-0.5 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <MdClose size={14} />
                      </button>
                    )}
                  </span>
                ))
              )}
            </div>
          )}

          {displayUser.is_active && (
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                allowClear
                className="w-full max-w-xs"
                placeholder="Select an office…"
                value={pendingAttachLocationId}
                onChange={(value) => setPendingAttachLocationId(value ?? undefined)}
                options={(offices ?? [])
                  .filter(
                    (office) =>
                      !(userLocations?.org_address_location_ids ?? []).includes(office.office_id)
                  )
                  .map((office) => ({
                    label: officeLabel(office.office_id),
                    value: office.office_id,
                  }))}
              />
              <Button
                className="text-xs font-semibold text-primary-600 border border-primary-200 rounded-full px-3 py-2 disabled:opacity-40"
                onClick={handleAttachLocation}
                disabled={!pendingAttachLocationId || isAttachingLocation}
              >
                {isAttachingLocation ? 'Attaching…' : '+ Attach location'}
              </Button>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <Typography variant="subtitle1">Effective permissions</Typography>
            {assignmentLocationIds.length > 0 && (
              <Select
                size="small"
                className="w-56"
                value={viewLocationId}
                onChange={setViewLocationId}
                options={[
                  { label: 'All locations (union)', value: ALL_LOCATIONS },
                  ...assignmentLocationIds.map((id) => ({ label: officeLabel(id), value: id })),
                ]}
              />
            )}
          </div>
          {/* A role can carry different permissions per office (Roles &
              Permissions' own per-location overrides) — this toggle is what
              makes "more at Location A, less at Location B" visible instead
              of only ever showing the all-locations union. */}
          {isPermissionsLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : dashboard?.permissions.length ? (
            <div className="flex flex-wrap gap-2">
              {dashboard.permissions.map((permission) => (
                <span key={permission} className="text-xs bg-gray-100 rounded-full px-3 py-1">
                  {permission}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              {viewLocationId === ALL_LOCATIONS
                ? 'No permissions granted yet.'
                : 'No permissions granted at this location.'}
            </p>
          )}
        </div>
      </div>

      {showEmailConfirm && (
        <ConfirmationModal
          title={`Change this user's login email to "${pendingEmail}"? This resets their email verification.`}
          confirmText="CHANGE EMAIL"
          isLoading={isSaving}
          onConfirm={() => {
            setShowEmailConfirm(false);
            save(pendingEmail);
          }}
          onClose={() => setShowEmailConfirm(false)}
        />
      )}
    </AntdCommonModal>
  );
};

export default ViewPlatformUserModal;
