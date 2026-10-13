import { useMemo } from 'react';
import { useListPlatformStaffQuery } from '../../../api/organization-service/Platform/staff';
import { useListRolesQuery } from '../../../api/organization-service/Roles/roles';
import type {
  PermissionMatrixResponse,
  MatrixUser,
} from '../../../api/organization-service/Roles/permissionMatrix';

export type PlatformPermissionMatrixArgs = {
  /** Only people holding every one of these codes. */
  codes?: string[];
  /** Only this membership. */
  membershipId?: string;
  /** Only people whose email contains this text. */
  q?: string;
};

/** `Organization_Id` this hook stamps on every row it produces — a real
 * tenant's rows always carry a real tenant UUID, so this string can never
 * collide with one. Callers merging this with a cross-org search use it to
 * tell "CFP staff" and "a client company's user" apart in one combined
 * result. */
export const PLATFORM_ORGANIZATION_ID = 'platform';

/**
 * CFP's own internal staff (Super Admin, CFP Admin, CFP Support) have no
 * `GET /v1/roles/permission-matrix` equivalent — that endpoint reads
 * `organization_role`, which only ever holds TENANT assignments (see its own
 * module docstring: a platform account is "absent from every count, not
 * missing from it"). Platform staff are assigned via a completely different
 * table (`platform_role_assignment`, keyed on `membership_id`) with no
 * office/location dimension at all, so a parallel backend endpoint would
 * mostly re-derive data two existing, already-fetched endpoints already
 * carry: `GET /v1/platform/staff` (membership -> role NAME, a free string)
 * and `GET /v1/platform/roles` (role NAME -> its baseline `permissions`).
 * This composes those two client-side into the SAME `PermissionMatrixResponse`
 * shape the tenant hook returns, so `PermissionHoldersModal`/
 * `PersonPermissionsModal` can render either source through one code path.
 *
 * What this deliberately leaves out: a `cfp_support` grant is always
 * time-limited and scoped to ONE client (`platform_role_assignment.
 * scoped_tenant_id`), never a standing platform-wide ability — folding it
 * into "permissions this person holds" here would misrepresent a one-client,
 * expiring grant as a permanent platform-wide one. `cfp_support`'s own
 * baseline role permissions (normally near-empty by design) are what render
 * here; live support grants are their own existing "Support Access" feature.
 */
export const usePlatformPermissionMatrix = (
  args: PlatformPermissionMatrixArgs = {},
  /** Skip both underlying reads — a Company Admin session holds no
   * `platform:read` and would just 403 on `GET /v1/platform/staff`; only a
   * Super Admin actually viewing the CFP-staff tier should ever fire these. */
  skip = false
): {
  data: PermissionMatrixResponse | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
} => {
  const {
    data: staff,
    isLoading: staffLoading,
    isFetching: staffFetching,
    error: staffError,
  } = useListPlatformStaffQuery(undefined, { skip });
  const {
    data: roles,
    isLoading: rolesLoading,
    isFetching: rolesFetching,
    error: rolesError,
  } = useListRolesQuery({ scope: 'platform', isMaster: true }, { skip });

  const data = useMemo<PermissionMatrixResponse | undefined>(() => {
    if (!staff || !roles) return undefined;

    const permissionsByRole = new Map<string, string[]>(roles.map((r) => [r.name, r.permissions]));
    const q = args.q?.trim().toLowerCase();

    const users: MatrixUser[] = staff
      .filter((member) => {
        const permissions = permissionsByRole.get(member.role) ?? [];
        if (args.membershipId && member.membership_id !== args.membershipId) return false;
        if (args.codes?.length && !args.codes.every((code) => permissions.includes(code))) {
          return false;
        }
        if (q && !member.email.toLowerCase().includes(q)) return false;
        return true;
      })
      .map((member) => {
        const permissions = permissionsByRole.get(member.role) ?? [];
        return {
          User_Id: member.membership_id,
          // No display name on this endpoint (PlatformStaffSummaryView
          // carries no first/last name) — email is the only identifier a
          // person actually recognises here.
          User_Name: member.email,
          Is_Active: member.status === 'active',
          Email: member.email,
          Location_Permission: [
            {
              Location_Id: 'ALL_LOCATIONS',
              Location_Name: null,
              Roles: [member.role],
              Permissions: {},
            },
          ],
          Permission_Details: permissions.map((code) => {
            const [resource, action] = code.split(':');
            return {
              code,
              // Left blank on purpose: PersonPermissionsModal already falls
              // back to the permission catalog (flattenPermissionCatalog)
              // whenever label/description/category come back empty, same
              // as it does for any tenant permission the matrix endpoint
              // doesn't have curated text for.
              label: '',
              description: '',
              resource,
              resource_label: '',
              category: '',
              action: action ?? '',
              sensitive: false,
              enforced: true,
              all_locations: true,
              locations: [],
              via_roles: [member.role],
              direct_grant: false,
            };
          }),
          Denied_Permissions: [],
        };
      });

    return {
      Organization_User_Permissions: [
        {
          Organization_Id: PLATFORM_ORGANIZATION_ID,
          Organization_Name: 'HireSmartz',
          Users_Permission: users,
        },
      ],
      total_users: users.length,
      limit: users.length,
      offset: 0,
    };
  }, [staff, roles, args.codes, args.membershipId, args.q]);

  return {
    data,
    isLoading: staffLoading || rolesLoading,
    isFetching: staffFetching || rolesFetching,
    error: staffError ?? rolesError,
  };
};
