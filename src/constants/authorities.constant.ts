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
//
// PERMISSION-STRING SOURCE OF TRUTH (2026-08-13 alignment pass)
// ---------------------------------------------------------------
// Every value below that organization-service actually guards a route on is
// now the literal string from `Permission` in
// CFPro2.0/shared/cfp-contracts/src/cfp_contracts/permissions.py — the one
// package all three backend services import to avoid exactly the drift this
// pass fixes (see that file's module docstring). A permission string that
// doesn't match a real `Resource:ActionType` pair can be *checked* by
// `useHasAccess` but can never actually be *granted* by the backend — the
// gate just stays permanently shut, which looks identical to "not
// implemented yet" from the UI. Members with no backend route at all
// (dashboard tiles, the job-service catalog, purely-frontend composite
// flags like MY_COMPANY_VIEW) are left as local, not backend-checked,
// concepts — noted inline.
export enum Authorities {
  /** No backend permission — dashboard visibility is a route/tab concept, not an RBAC grant. */
  DASHBOARD_VIEW = 'dashboard:view',

  // -- organization-service: tenant lifecycle (Super Admin "Companies") --
  COMPANY_VIEW = 'tenant:read',
  COMPANY_ADD = 'tenant:write',
  COMPANY_EDIT = 'tenant:update',
  /** Confirm a scraped signup + send the Company Admin invite (`Permission.TENANT_APPROVE`). */
  COMPANY_APPROVE = 'tenant:approve',
  /** Suspend a company — the platform's soft-delete action for a tenant (`Permission.TENANT_DELETE`). */
  COMPANY_ARCHIVE = 'tenant:delete',
  /** A tenant's own profile/settings (`Permission.ORGANIZATION_READ`) — Company Admin side. */
  COMPANY_SETTINGS_VIEW = 'organization:read',
  COMPANY_SETTINGS_EDIT = 'organization:update',

  // -- organization-service: directory (Users) --
  USER_VIEW = 'user:read',
  USER_ADD = 'user:write',
  USER_EDIT = 'user:update',
  USER_ARCHIVE = 'user:delete',

  // -- organization-service: departments & offices ("locations") --
  DEPARTMENT_VIEW = 'department:read',
  DEPARTMENT_ADD = 'department:write',
  DEPARTMENT_EDIT = 'department:update',
  DEPARTMENT_DELETE = 'department:delete',
  LOCATION_VIEW = 'location:read',
  LOCATION_ADD = 'location:write',
  LOCATION_EDIT = 'location:update',
  LOCATION_DELETE = 'location:delete',

  // -- organization-service: team invitations --
  INVITATION_VIEW = 'invitation:read',
  INVITATION_SEND = 'invitation:write',
  INVITATION_REVOKE = 'invitation:delete',

  // -- organization-service: platform administration (Super Admin only —
  // only a principal with NO tenant_id can ever hold these) --
  PLATFORM_VIEW = 'platform:read',
  /** Invite a Super Admin or internal staff member. */
  PLATFORM_INVITE = 'platform:write',
  /** Manage platform (internal) departments. */
  PLATFORM_MANAGE_DEPARTMENTS = 'platform:update',
  /** Offboard internal staff. */
  PLATFORM_OFFBOARD_STAFF = 'platform:delete',

  // -- organization-service: master catalogs (Super Admin) --
  INDUSTRY_VIEW = 'industry:read',
  INDUSTRY_ADD = 'industry:write',
  INDUSTRY_EDIT = 'industry:update',
  INDUSTRY_DELETE = 'industry:delete',
  JOB_TITLE_CATALOG_VIEW = 'job_title:read',
  JOB_TITLE_CATALOG_ADD = 'job_title:write',
  JOB_TITLE_CATALOG_EDIT = 'job_title:update',
  JOB_TITLE_CATALOG_DELETE = 'job_title:delete',

  // -- interview:read/write — a tenant's own interview questions
  // (docs/RBAC's Resource.INTERVIEW has no named Permission constant, but
  // the route literals themselves are "interview:read"/"interview:write",
  // a valid resource:action pair). Distinct from JOB_OPENING_* (job-service).
  INTERVIEW_QUESTIONS_VIEW = 'interview:read',
  INTERVIEW_QUESTIONS_EDIT = 'interview:write',

  /** No dedicated backend permission today — billing-service doesn't exist yet. */
  FINANCES_VIEW = 'finances:view',
  /** No dedicated backend permission today — billing-service doesn't exist yet. */
  SUBSCRIPTIONS_VIEW = 'subscriptions:view',

  // -- job-service (out of this integration's scope — left as-is) --
  JOB_OPENING_VIEW = 'job:view',
  JOB_OPENING_EDIT = 'job:edit',
  JOB_OPENING_DUPLICATE = 'job:duplicate',
  JOB_OPENING_CREATE = 'job:create',
  JOB_OPENING_CLOSE = 'job:close',

  /** No backend permission — job-service concept, out of this integration's scope. */
  JOB_CONFIGURATION_VIEW = 'job_configuration:view',
  /** No dedicated backend permission — the activity feed reads whatever the
   * caller's tenant/platform context already allows. */
  ACTIVITY_FEED = 'activity:view',
  /** No backend permission — purely a frontend tab-visibility flag. */
  MY_COMPANY_VIEW = 'my_company:view',

  // Roles & Permissions management itself is a permission — so access to the
  // feature that grants access is gated the same way as everything else.
  // Only assign/revoke/resolve exist as real routes today (RBAC_API.md) —
  // ROLE_CREATE is really "grant a role to a user" (`Permission.ROLE_WRITE`).
  // ROLE_EDIT has no backend permission or route at all; the Roles &
  // Permissions UI renders Add/Edit/Delete Role as "not available yet"
  // rather than calling anything with it (see RolesManagement).
  ROLE_VIEW = 'role:read',
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
  | 'Team & Invitations'
  | 'Platform Administration'
  | 'Masters'
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
  {
    code: Authorities.COMPANY_APPROVE,
    label: 'Confirm a company & send invite',
    module: 'Company',
  },
  { code: Authorities.COMPANY_ARCHIVE, label: 'Archive companies', module: 'Company' },
  { code: Authorities.COMPANY_SETTINGS_VIEW, label: 'View company settings', module: 'Company' },
  { code: Authorities.COMPANY_SETTINGS_EDIT, label: 'Edit company settings', module: 'Company' },

  { code: Authorities.USER_VIEW, label: 'View CFP users', module: 'CFP Users' },
  { code: Authorities.USER_ADD, label: 'Add CFP users', module: 'CFP Users' },
  { code: Authorities.USER_EDIT, label: 'Edit CFP users', module: 'CFP Users' },
  { code: Authorities.USER_ARCHIVE, label: 'Archive CFP users', module: 'CFP Users' },

  { code: Authorities.DEPARTMENT_VIEW, label: 'View departments', module: 'My Company' },
  { code: Authorities.DEPARTMENT_ADD, label: 'Add departments', module: 'My Company' },
  { code: Authorities.DEPARTMENT_EDIT, label: 'Edit departments', module: 'My Company' },
  { code: Authorities.DEPARTMENT_DELETE, label: 'Delete departments', module: 'My Company' },
  { code: Authorities.LOCATION_VIEW, label: 'View locations', module: 'My Company' },
  { code: Authorities.LOCATION_ADD, label: 'Add locations', module: 'My Company' },
  { code: Authorities.LOCATION_EDIT, label: 'Edit locations', module: 'My Company' },
  { code: Authorities.LOCATION_DELETE, label: 'Delete locations', module: 'My Company' },

  {
    code: Authorities.INVITATION_VIEW,
    label: 'View team invitations',
    module: 'Team & Invitations',
  },
  {
    code: Authorities.INVITATION_SEND,
    label: 'Send/resend team invitations',
    module: 'Team & Invitations',
  },
  {
    code: Authorities.INVITATION_REVOKE,
    label: 'Revoke team invitations',
    module: 'Team & Invitations',
  },

  {
    code: Authorities.PLATFORM_VIEW,
    label: 'View platform administration',
    module: 'Platform Administration',
  },
  {
    code: Authorities.PLATFORM_INVITE,
    label: 'Invite Super Admins / internal staff',
    module: 'Platform Administration',
  },
  {
    code: Authorities.PLATFORM_MANAGE_DEPARTMENTS,
    label: 'Manage internal departments',
    module: 'Platform Administration',
  },
  {
    code: Authorities.PLATFORM_OFFBOARD_STAFF,
    label: 'Offboard internal staff',
    module: 'Platform Administration',
  },

  { code: Authorities.INDUSTRY_VIEW, label: 'View industries', module: 'Masters' },
  { code: Authorities.INDUSTRY_ADD, label: 'Add industries', module: 'Masters' },
  { code: Authorities.INDUSTRY_EDIT, label: 'Edit industries', module: 'Masters' },
  { code: Authorities.INDUSTRY_DELETE, label: 'Delete industries', module: 'Masters' },
  { code: Authorities.JOB_TITLE_CATALOG_VIEW, label: 'View job title catalog', module: 'Masters' },
  { code: Authorities.JOB_TITLE_CATALOG_ADD, label: 'Add job titles', module: 'Masters' },
  { code: Authorities.JOB_TITLE_CATALOG_EDIT, label: 'Edit job titles', module: 'Masters' },
  { code: Authorities.JOB_TITLE_CATALOG_DELETE, label: 'Delete job titles', module: 'Masters' },

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
    code: Authorities.USER_ADD,
    label: 'Add organization users',
    module: 'Organization Users',
  },
  {
    code: Authorities.JOB_CONFIGURATION_VIEW,
    label: 'View job configuration',
    module: 'Job Configuration',
  },
  {
    code: Authorities.INTERVIEW_QUESTIONS_VIEW,
    label: 'View interview questions',
    module: 'My Company',
  },
  {
    code: Authorities.INTERVIEW_QUESTIONS_EDIT,
    label: 'Edit interview questions',
    module: 'My Company',
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
      Authorities.INVITATION_SEND,
      Authorities.ROLE_VIEW,
      Authorities.ROLE_CREATE,
      Authorities.ROLE_EDIT,
      Authorities.ROLE_DELETE,
      Authorities.INDUSTRY_VIEW,
      Authorities.INDUSTRY_ADD,
      Authorities.INDUSTRY_EDIT,
      Authorities.INDUSTRY_DELETE,
      Authorities.JOB_TITLE_CATALOG_VIEW,
      Authorities.JOB_TITLE_CATALOG_ADD,
      Authorities.JOB_TITLE_CATALOG_EDIT,
      Authorities.JOB_TITLE_CATALOG_DELETE,
      Authorities.PLATFORM_VIEW,
      Authorities.PLATFORM_INVITE,
      Authorities.PLATFORM_MANAGE_DEPARTMENTS,
      Authorities.PLATFORM_OFFBOARD_STAFF,
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
      Authorities.INVITATION_SEND,
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
      Authorities.USER_ADD,
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
      Authorities.USER_ADD,
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
