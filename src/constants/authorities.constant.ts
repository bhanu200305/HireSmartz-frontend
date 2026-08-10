// ============================================
// FIXED PERMISSION CATALOG
// ============================================
// Every permission code is `resource:action` — the same shape the
// authentication-service / RBAC design docs use (see PermissionCode in
// RBAC_ARCHITECTURE.md). This enum IS the fixed catalog: a super admin or
// company admin creating a role can only ever pick from these values, never
// invent a new one, and the checkbox picker (PermissionMatrix) is built by
// iterating PERMISSION_CATALOG below.
//
// Enum member *names* are the stable identifiers referenced throughout the
// codebase (Authorities.DASHBOARD_VIEW, etc.) — only the string values were
// migrated to `resource:action` form, so existing call sites are unaffected.
export enum Authorities {
  DASHBOARD_VIEW = 'dashboard:view',

  COMPANY_VIEW = 'company:view',
  COMPANY_ADD = 'company:create',
  COMPANY_EDIT = 'company:edit',
  COMPANY_ARCHIVE = 'company:archive',
  COMPANY_SETTINGS_VIEW = 'company_settings:view',

  USER_VIEW = 'user:view',
  USER_ADD = 'user:create',
  USER_EDIT = 'user:edit',
  USER_ARCHIVE = 'user:archive',
  USER_RESEND = 'user:resend',

  FINANCES_VIEW = 'finances:view',
  SUBSCRIPTIONS_VIEW = 'subscriptions:view',

  JOB_OPENING_VIEW = 'job:view',
  JOB_OPENING_EDIT = 'job:edit',
  JOB_OPENING_DUPLICATE = 'job:duplicate',
  JOB_OPENING_CREATE = 'job:create',
  JOB_OPENING_CLOSE = 'job:close',

  ORGANIZATION_USER_ADD = 'org_user:create',
  JOB_CONFIGURATION_VIEW = 'job_configuration:view',
  ACTIVITY_FEED = 'activity:view',
  MY_COMPANY_VIEW = 'my_company:view',

  // Roles & Permissions management itself is a permission — so access to the
  // feature that grants access is gated the same way as everything else.
  ROLE_VIEW = 'role:view',
  ROLE_CREATE = 'role:write',
  ROLE_EDIT = 'role:edit',
  ROLE_DELETE = 'role:delete',
}

/** Groups the catalog for the permission-picker UI (PermissionMatrix). */
export type PermissionModule =
  | 'Dashboard'
  | 'Company'
  | 'CFP Users'
  | 'Finances'
  | 'Subscriptions'
  | 'Job Openings'
  | 'Organization Users'
  | 'Job Configuration'
  | 'Activity'
  | 'My Company'
  | 'Roles & Permissions';

export type PermissionCatalogEntry = {
  code: Authorities;
  label: string;
  module: PermissionModule;
};

/**
 * The fixed permission catalog, grouped by module + human labels — this is
 * what a role-creation/edit form iterates to render checkboxes. Nothing may
 * be added to a role's permission set that isn't in this list.
 */
export const PERMISSION_CATALOG: PermissionCatalogEntry[] = [
  { code: Authorities.DASHBOARD_VIEW, label: 'View dashboard', module: 'Dashboard' },

  { code: Authorities.COMPANY_VIEW, label: 'View companies', module: 'Company' },
  { code: Authorities.COMPANY_ADD, label: 'Add companies', module: 'Company' },
  { code: Authorities.COMPANY_EDIT, label: 'Edit companies', module: 'Company' },
  { code: Authorities.COMPANY_ARCHIVE, label: 'Archive companies', module: 'Company' },
  { code: Authorities.COMPANY_SETTINGS_VIEW, label: 'View company settings', module: 'Company' },

  { code: Authorities.USER_VIEW, label: 'View CFP users', module: 'CFP Users' },
  { code: Authorities.USER_ADD, label: 'Add CFP users', module: 'CFP Users' },
  { code: Authorities.USER_EDIT, label: 'Edit CFP users', module: 'CFP Users' },
  { code: Authorities.USER_ARCHIVE, label: 'Archive CFP users', module: 'CFP Users' },
  { code: Authorities.USER_RESEND, label: 'Resend CFP user invite', module: 'CFP Users' },

  { code: Authorities.FINANCES_VIEW, label: 'View finances', module: 'Finances' },
  { code: Authorities.SUBSCRIPTIONS_VIEW, label: 'View subscriptions', module: 'Subscriptions' },

  { code: Authorities.JOB_OPENING_VIEW, label: 'View job openings', module: 'Job Openings' },
  { code: Authorities.JOB_OPENING_CREATE, label: 'Create job openings', module: 'Job Openings' },
  { code: Authorities.JOB_OPENING_EDIT, label: 'Edit job openings', module: 'Job Openings' },
  {
    code: Authorities.JOB_OPENING_DUPLICATE,
    label: 'Duplicate job openings',
    module: 'Job Openings',
  },
  { code: Authorities.JOB_OPENING_CLOSE, label: 'Close job openings', module: 'Job Openings' },

  {
    code: Authorities.ORGANIZATION_USER_ADD,
    label: 'Add organization users',
    module: 'Organization Users',
  },
  {
    code: Authorities.JOB_CONFIGURATION_VIEW,
    label: 'View job configuration',
    module: 'Job Configuration',
  },
  { code: Authorities.ACTIVITY_FEED, label: 'View activity feed', module: 'Activity' },
  { code: Authorities.MY_COMPANY_VIEW, label: 'View my company', module: 'My Company' },

  { code: Authorities.ROLE_VIEW, label: 'View roles & permissions', module: 'Roles & Permissions' },
  { code: Authorities.ROLE_CREATE, label: 'Create roles', module: 'Roles & Permissions' },
  { code: Authorities.ROLE_EDIT, label: 'Edit role permissions', module: 'Roles & Permissions' },
  { code: Authorities.ROLE_DELETE, label: 'Delete roles', module: 'Roles & Permissions' },
];

// ============================================
// SEEDED SYSTEM ROLES (fallback only)
// ============================================
// These are the historical, hardcoded role→authority mappings. They remain
// as a fallback for the 6 pre-existing system role names so nothing already
// shipped regresses, but going forward a role's permissions come from the
// dynamic Role record (see src/types/rbac.d.ts) resolved through
// resolveEffectivePermissions — not from this map. Do not add new roles
// here; create them through the Roles & Permissions UI instead.
export const ROLE_AUTHORITIES: Record<string, Record<string, Authorities[]>> = {
  owner: {
    masterSuperAdmin: [
      Authorities.DASHBOARD_VIEW,
      Authorities.COMPANY_VIEW,
      Authorities.COMPANY_ADD,
      Authorities.COMPANY_EDIT,
      Authorities.COMPANY_ARCHIVE,
      Authorities.COMPANY_SETTINGS_VIEW,
      Authorities.USER_VIEW,
      Authorities.USER_ADD,
      Authorities.USER_EDIT,
      Authorities.USER_ARCHIVE,
      Authorities.FINANCES_VIEW,
      Authorities.SUBSCRIPTIONS_VIEW,
      Authorities.USER_RESEND,
      Authorities.ROLE_VIEW,
      Authorities.ROLE_CREATE,
      Authorities.ROLE_EDIT,
      Authorities.ROLE_DELETE,
    ],
    admin: [
      Authorities.DASHBOARD_VIEW,
      Authorities.COMPANY_VIEW,
      Authorities.COMPANY_ADD,
      Authorities.COMPANY_EDIT,
      Authorities.COMPANY_ARCHIVE,
      Authorities.COMPANY_SETTINGS_VIEW,
      Authorities.USER_ADD,
      Authorities.USER_VIEW,
      Authorities.USER_EDIT,
      Authorities.USER_ARCHIVE,
      Authorities.USER_RESEND,
      Authorities.ROLE_VIEW,
    ],
    user: [Authorities.DASHBOARD_VIEW, Authorities.COMPANY_VIEW, Authorities.USER_VIEW],
  },
  organization: {
    superAdmin: [
      Authorities.DASHBOARD_VIEW,
      Authorities.JOB_OPENING_CREATE,
      Authorities.JOB_OPENING_CLOSE,
      Authorities.JOB_OPENING_VIEW,
      Authorities.JOB_OPENING_EDIT,
      Authorities.JOB_OPENING_DUPLICATE,
      Authorities.ORGANIZATION_USER_ADD,
      Authorities.JOB_CONFIGURATION_VIEW,
      Authorities.ACTIVITY_FEED,
      Authorities.MY_COMPANY_VIEW,
      Authorities.ROLE_VIEW,
      Authorities.ROLE_CREATE,
      Authorities.ROLE_EDIT,
      Authorities.ROLE_DELETE,
    ],
    hiringManager: [
      Authorities.DASHBOARD_VIEW,
      Authorities.JOB_OPENING_VIEW,
      Authorities.JOB_OPENING_CREATE,
      Authorities.JOB_OPENING_CLOSE,
      Authorities.JOB_OPENING_EDIT,
      Authorities.JOB_OPENING_DUPLICATE,
      Authorities.ACTIVITY_FEED,
    ],
    recruiter: [
      Authorities.DASHBOARD_VIEW,
      Authorities.JOB_OPENING_VIEW,
      Authorities.JOB_OPENING_CREATE,
      Authorities.JOB_OPENING_CLOSE,
      Authorities.JOB_OPENING_EDIT,
      Authorities.JOB_OPENING_DUPLICATE,
      Authorities.ACTIVITY_FEED,
    ],
    admin: [
      Authorities.DASHBOARD_VIEW,
      Authorities.JOB_OPENING_VIEW,
      Authorities.JOB_OPENING_CREATE,
      Authorities.JOB_OPENING_CLOSE,
      Authorities.JOB_OPENING_EDIT,
      Authorities.JOB_OPENING_DUPLICATE,
      Authorities.ORGANIZATION_USER_ADD,
      Authorities.JOB_CONFIGURATION_VIEW,
      Authorities.ACTIVITY_FEED,
      Authorities.MY_COMPANY_VIEW,
      Authorities.ROLE_VIEW,
      Authorities.ROLE_CREATE,
      Authorities.ROLE_EDIT,
      Authorities.ROLE_DELETE,
    ],
    user: [Authorities.DASHBOARD_VIEW, Authorities.JOB_OPENING_VIEW],
  },
};

export const ALL_AUTHORITIES = Object.values(Authorities);
