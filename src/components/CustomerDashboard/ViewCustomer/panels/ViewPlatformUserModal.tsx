import React, { useState } from 'react';
import { MdClose } from 'react-icons/md';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { Badge, Button, Typography, showToast } from '../../../shared';
import type { OrgUser } from '../../../../api/organization-service/Users/users';
import { useListPlatformTenantOfficesQuery } from '../../../../api/organization-service/Platform/offices';
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
import RoleLocationPicker from './RoleLocationPicker';

type ViewPlatformUserModalProps = {
  open: boolean;
  tenantId: string;
  user: OrgUser | null;
  onClose: () => void;
};

/**
 * Super Admin's "view this company's user" — Companies -> a company ->
 * Users -> click a name. The basic fields below are already everything
 * `GET /v1/platform/tenants/{tenant_id}/users` returns per row (this
 * service has no single-user GET, same gap the tenant-side
 * ViewOrganisationUser already works around by reading the row off its own
 * list query) — nothing more to fetch for those.
 *
 * EVERYTHING BELOW "Current role(s)" wires real backend capability that had
 * no frontend consumer, or in two cases did not exist until this feature
 * needed it:
 *
 *  - `GET .../roles/users/{user_id}/assignments` (NEW — ListUserRoleAssignmentsUseCase)
 *    returns this person's actual, standing role grants: assignment_id,
 *    role_id, location_id. Deliberately unjoined — role name comes from
 *    `roles` (already fetched for the grant picker below) and location label
 *    from `offices` (ditto), so this needs no extra request to be readable.
 *    This is what makes "already holds 'vp' at Mohali" visible BEFORE a
 *    grant attempt, and what supplies a real assignment_id to revoke ANY
 *    existing grant, not only one made in this browser session.
 *  - `GET .../roles/users/{user_id}/dashboard` (platform mirror of the
 *    tenant-ambient route ViewOrganisationUser already uses — that one
 *    403s for a platform caller regardless of target tenant) resolves the
 *    same effective-permissions pill list this app already shows on the
 *    tenant side, so both views read identically.
 *  - `POST/DELETE .../roles/assignments...` (grant/revoke) already existed
 *    server-side with no frontend caller before this feature.
 *
 * Does NOT attempt an "Attached locations" section the way
 * ViewOrganisationUser has one — `GET/POST/DELETE /v1/users/{id}/locations`
 * only exists on the tenant-ambient router, with no platform-mounted mirror
 * anywhere in this service. That's a real backend gap, not something to
 * fake here.
 */
const ViewPlatformUserModal: React.FC<ViewPlatformUserModalProps> = ({
  open,
  tenantId,
  user,
  onClose,
}) => {
  const { roles } = useRolesCatalog({ scope: 'tenant', tenantId, isMaster: true });
  const { data: offices } = useListPlatformTenantOfficesQuery(tenantId, {
    skip: !open || !tenantId,
  });
  const { data: assignments, isFetching: isAssignmentsLoading } =
    useListUserRoleAssignmentsAsPlatformQuery(
      { tenantId, userId: user?.user_id ?? '' },
      { skip: !open || !tenantId || !user }
    );
  const { data: dashboard, isFetching: isPermissionsLoading } = useGetPlatformUserDashboardQuery(
    { tenantId, userId: user?.user_id ?? '' },
    { skip: !open || !tenantId || !user }
  );
  const [assignRole, { isLoading: isAssigning }] = useAssignRoleAsPlatformMutation();
  const [revokeRole, { isLoading: isRevoking }] = useRevokeRoleAsPlatformMutation();
  const [roleId, setRoleId] = useState<string | undefined>(undefined);
  const [locationId, setLocationId] = useState<string | undefined>(undefined);
  // Collapsed by default, matching ViewOrganisationUser's own "+ Assign
  // role" button — an admin who can now SEE this person's current role(s)
  // above has no need for an open form implying there are none.
  const [showAssign, setShowAssign] = useState(false);

  const officeLabel = (officeId: string | null) => {
    if (!officeId) return 'Applies everywhere';
    const office = offices?.find((o) => o.office_id === officeId);
    return office ? `${office.city} — ${office.address_line_1}` : 'Unknown location';
  };
  const roleName = (id: string) => roles.find((r) => r.id === id)?.roleName ?? 'Unknown role';

  const handleClose = () => {
    setRoleId(undefined);
    setLocationId(undefined);
    setShowAssign(false);
    onClose();
  };

  const handleAssign = async () => {
    if (!user || !roleId) return;
    try {
      const result = await assignRole({
        tenantId,
        user_id: user.user_id,
        role_id: roleId,
        location_id: locationId ?? null,
      }).unwrap();
      showToast({ message: `"${result.role_name}" assigned.`, type: 'success' });
      setRoleId(undefined);
      setLocationId(undefined);
      setShowAssign(false);
    } catch (err) {
      // DUPLICATE_ROLE_ASSIGNMENT's raw message is a bare user_id + role_id,
      // both UUIDs — meaningless in a toast. Now that assignments (and
      // `roles`) are already in hand, translate it into what actually
      // happened instead of surfacing backend internals.
      const message =
        getOrgErrorCode(err) === 'DUPLICATE_ROLE_ASSIGNMENT'
          ? `${user.full_name} already holds "${roleName(roleId)}" — ${officeLabel(locationId ?? null)}.`
          : getOrgErrorMessage(err, 'Failed to assign role.');
      showToast({ message, type: 'error' });
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

  if (!user) return null;

  return (
    <AntdCommonModal open={open} onClose={handleClose} title={user.full_name}>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Typography variant="subtitle2">Email</Typography>
            <Typography variant="body1">{user.email}</Typography>
          </div>
          <div>
            <Typography variant="subtitle2">Phone</Typography>
            <Typography variant="body1">
              {user.phone_no ? `${user.country_code || ''}${user.phone_no}` : '-'}
            </Typography>
          </div>
          <div>
            <Typography variant="subtitle2">Title</Typography>
            <Typography variant="body1">{user.title || '-'}</Typography>
          </div>
          <div>
            <Typography variant="subtitle2">Status</Typography>
            <Badge status={user.is_active ? 'success' : 'neutral'}>
              {user.is_active ? 'Active' : 'Deactivated'}
            </Badge>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Typography variant="subtitle1">Current role(s)</Typography>
            {user.is_active && !showAssign && (
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
                  {user.is_active && (
                    <button
                      type="button"
                      aria-label={`Revoke ${roleName(assignment.role_id)}`}
                      disabled={isRevoking}
                      onClick={() =>
                        handleRevoke(assignment.assignment_id, roleName(assignment.role_id))
                      }
                      className="p-1.5 rounded-full hover:bg-red-50 text-red-500 disabled:opacity-50"
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

          {user.is_active && showAssign && (
            <div className="mt-3">
              <RoleLocationPicker
                roles={roles}
                offices={offices ?? []}
                roleId={roleId}
                onRoleChange={setRoleId}
                locationId={locationId}
                onLocationChange={setLocationId}
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
                    setLocationId(undefined);
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
          <Typography variant="subtitle1" className="mb-2 block">
            Effective permissions
          </Typography>
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
            <p className="text-sm text-gray-400">No permissions granted yet.</p>
          )}
        </div>
      </div>
    </AntdCommonModal>
  );
};

export default ViewPlatformUserModal;
