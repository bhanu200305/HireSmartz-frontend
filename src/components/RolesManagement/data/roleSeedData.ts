import { Authorities } from '../../../constants/authorities.constant';
import type { Role, RoleScope } from '../../../types';
import { getRoleTemplate } from './roleTemplates';

const templatePermissions = (key: string): Authorities[] => getRoleTemplate(key)?.permissions ?? [];

const PLATFORM_SYSTEM_ROLES: Role[] = [
  {
    id: 1,
    roleName: 'Super Admin',
    scope: 'platform',
    isSystemRole: true,
    permissions: templatePermissions('super_admin'),
    locationPermissions: [],
  },
  {
    id: 2,
    roleName: 'CFP Admin',
    scope: 'platform',
    isSystemRole: true,
    permissions: templatePermissions('cfp_admin'),
    locationPermissions: [],
  },
  {
    id: 3,
    roleName: 'CFP Support',
    scope: 'platform',
    isSystemRole: true,
    permissions: templatePermissions('cfp_support'),
    locationPermissions: [],
  },
];

// Two mock offices ("Austin, TX" / "Remote") used only by the example
// custom role below — a real tenant's actual location list comes from
// useListTenantOfficesQuery (see LocationOverrideBlock/Index.tsx), this is
// purely this seed example's own illustrative data.
const orgSystemRoles = (tenantId?: string): Role[] => [
  {
    id: 11,
    roleName: 'Company Admin',
    scope: 'tenant',
    tenantId,
    isSystemRole: true,
    permissions: templatePermissions('company_admin'),
    locationPermissions: [],
  },
  {
    id: 12,
    roleName: 'Hiring Manager',
    scope: 'tenant',
    tenantId,
    isSystemRole: true,
    permissions: templatePermissions('hiring_manager'),
    locationPermissions: [],
  },
  {
    id: 13,
    roleName: 'Recruiter',
    scope: 'tenant',
    tenantId,
    isSystemRole: true,
    permissions: templatePermissions('recruiter'),
    locationPermissions: [],
  },
  {
    id: 14,
    roleName: 'Interviewer',
    scope: 'tenant',
    tenantId,
    isSystemRole: true,
    permissions: templatePermissions('interviewer'),
    locationPermissions: [],
  },
  {
    id: 15,
    roleName: 'Viewer',
    scope: 'tenant',
    tenantId,
    isSystemRole: true,
    permissions: templatePermissions('viewer'),
    locationPermissions: [],
  },
  {
    id: 16,
    roleName: 'Regional Hiring Manager',
    scope: 'tenant',
    tenantId,
    isSystemRole: false,
    permissions: [
      Authorities.DASHBOARD_VIEW,
      Authorities.JOB_OPENING_VIEW,
      Authorities.JOB_OPENING_CREATE,
      Authorities.JOB_OPENING_EDIT,
      Authorities.ACTIVITY_FEED,
    ],
    locationPermissions: [
      {
        locationId: 1,
        locationName: 'Austin, TX',
        permissions: [
          Authorities.DASHBOARD_VIEW,
          Authorities.JOB_OPENING_VIEW,
          Authorities.JOB_OPENING_CREATE,
          Authorities.JOB_OPENING_EDIT,
          Authorities.JOB_OPENING_CLOSE,
          Authorities.ACTIVITY_FEED,
        ],
      },
      {
        locationId: 2,
        locationName: 'Remote',
        permissions: [
          Authorities.DASHBOARD_VIEW,
          Authorities.JOB_OPENING_VIEW,
          Authorities.ACTIVITY_FEED,
        ],
      },
    ],
  },
];

/** Seed data for a fresh (never-mutated-this-session) role catalog. */
export const seedRolesForContext = (scope: RoleScope, tenantId?: string | number): Role[] => {
  if (scope === 'platform') return PLATFORM_SYSTEM_ROLES;
  return orgSystemRoles(tenantId != null ? String(tenantId) : undefined);
};
