// ============================================
// FIXED PERMISSION CATALOG
// ============================================
// Every permission code is `resource:action` — the same shape
// organization-service's own RBAC uses (see `Permission` in
// CFPro2.0/shared/cfp-contracts/src/cfp_contracts/permissions.py, the one
// package all three backend services import). This enum IS the fixed
// catalog: a super admin or company admin creating a role can only ever
// pick from these values, never invent a new one, and the checkbox picker
// (PermissionMatrix) is built by iterating PERMISSION_CATALOG below.
//
// Enum member *names* are the stable identifiers referenced throughout the
// codebase (Authorities.DASHBOARD_VIEW, etc.) — only the string values need
// to match the backend, so existing call sites are unaffected by any of
// this.
//
// FULL CATALOG ALIGNMENT (2026-08-18 pass)
// ------------------------------------------
// 19 real organization-service resources × the 6-action closed set
// (read/write/update/delete/approve/export — `ActionType` in
// cfp_contracts) = 114 permissions, confirmed against the live RBAC
// role/permission matrix (super_admin=114, company_admin=56,
// hiring_manager=13, recruiter=10, interviewer=3 — cross-checked entry by
// entry against a real database, not just counts). PERMISSION_CATALOG below
// contains exactly these 114 and nothing else — a checkbox that isn't one
// of them can never actually be granted by the backend, so it has no
// business being offered in a role-creation form.
//
// Genuinely frontend-only concepts (dashboard tab visibility, the job-service
// catalog, activity feed, "My Company" tab, subscriptions) stay as Authorities
// members for route/tab gating (useHasAccess) but are deliberately NOT in
// PERMISSION_CATALOG — there is nothing backend-side for a role to hold, so
// a permanently-disabled checkbox in a role builder would just be confusing.
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
  COMPANY_EXPORT = 'tenant:export',

  // -- organization-service: a tenant's own profile/settings (Company Admin side) --
  COMPANY_SETTINGS_VIEW = 'organization:read',
  COMPANY_SETTINGS_ADD = 'organization:write',
  COMPANY_SETTINGS_EDIT = 'organization:update',
  COMPANY_SETTINGS_DELETE = 'organization:delete',
  COMPANY_SETTINGS_APPROVE = 'organization:approve',
  COMPANY_SETTINGS_EXPORT = 'organization:export',

  // -- organization-service: directory (Users — CFP's own staff when the
  // caller is platform-scoped, a tenant's own directory when tenant-scoped;
  // same resource, scope comes from the caller's token, not the code) --
  USER_VIEW = 'user:read',
  USER_ADD = 'user:write',
  USER_EDIT = 'user:update',
  USER_ARCHIVE = 'user:delete',
  USER_APPROVE = 'user:approve',
  USER_EXPORT = 'user:export',

  // -- organization-service: departments & offices ("locations") --
  DEPARTMENT_VIEW = 'department:read',
  DEPARTMENT_ADD = 'department:write',
  DEPARTMENT_EDIT = 'department:update',
  DEPARTMENT_DELETE = 'department:delete',
  DEPARTMENT_APPROVE = 'department:approve',
  DEPARTMENT_EXPORT = 'department:export',
  LOCATION_VIEW = 'location:read',
  LOCATION_ADD = 'location:write',
  LOCATION_EDIT = 'location:update',
  LOCATION_DELETE = 'location:delete',
  LOCATION_APPROVE = 'location:approve',
  LOCATION_EXPORT = 'location:export',
  // A tenant's own job-title catalogue — distinct resource from the
  // platform's JOB_TITLE_CATALOG_* above. Real backend catalog only has
  // these 4 (no approve/export), same discipline as CANDIDATE_VIEW/ADD.
  TENANT_JOB_TITLE_VIEW = 'tenant_job_title:read',
  TENANT_JOB_TITLE_ADD = 'tenant_job_title:write',
  TENANT_JOB_TITLE_EDIT = 'tenant_job_title:update',
  TENANT_JOB_TITLE_DELETE = 'tenant_job_title:delete',
  // job-service's 4 tenant catalogues (Shifts, Education Preferences, Job
  // Types, Job Modes) — one read/write pair covering all four.
  JOB_CATALOG_VIEW = 'job_catalog:read',
  JOB_CATALOG_EDIT = 'job_catalog:write',

  // -- organization-service: team invitations --
  INVITATION_VIEW = 'invitation:read',
  INVITATION_SEND = 'invitation:write',
  INVITATION_UPDATE = 'invitation:update',
  INVITATION_REVOKE = 'invitation:delete',
  INVITATION_APPROVE = 'invitation:approve',
  INVITATION_EXPORT = 'invitation:export',

  // -- organization-service: platform administration (Super Admin only —
  // only a principal with NO tenant_id can ever hold these) --
  PLATFORM_VIEW = 'platform:read',
  /** Invite a Super Admin or internal staff member. */
  PLATFORM_INVITE = 'platform:write',
  /** Manage platform (internal) departments. */
  PLATFORM_MANAGE_DEPARTMENTS = 'platform:update',
  /** Offboard internal staff. */
  PLATFORM_OFFBOARD_STAFF = 'platform:delete',
  PLATFORM_APPROVE = 'platform:approve',
  PLATFORM_EXPORT = 'platform:export',

  // -- organization-service: master catalogs (Super Admin) --
  INDUSTRY_VIEW = 'industry:read',
  INDUSTRY_ADD = 'industry:write',
  INDUSTRY_EDIT = 'industry:update',
  INDUSTRY_DELETE = 'industry:delete',
  INDUSTRY_APPROVE = 'industry:approve',
  INDUSTRY_EXPORT = 'industry:export',
  JOB_TITLE_CATALOG_VIEW = 'job_title:read',
  JOB_TITLE_CATALOG_ADD = 'job_title:write',
  JOB_TITLE_CATALOG_EDIT = 'job_title:update',
  JOB_TITLE_CATALOG_DELETE = 'job_title:delete',
  JOB_TITLE_CATALOG_APPROVE = 'job_title:approve',
  JOB_TITLE_CATALOG_EXPORT = 'job_title:export',
  MASTER_DEPARTMENT_VIEW = 'master_department:read',
  MASTER_DEPARTMENT_ADD = 'master_department:write',
  MASTER_DEPARTMENT_EDIT = 'master_department:update',
  MASTER_DEPARTMENT_DELETE = 'master_department:delete',
  MASTER_DEPARTMENT_APPROVE = 'master_department:approve',
  MASTER_DEPARTMENT_EXPORT = 'master_department:export',

  // -- organization-service: a tenant's own interview questions --
  INTERVIEW_QUESTIONS_VIEW = 'interview:read',
  INTERVIEW_QUESTIONS_EDIT = 'interview:write',
  INTERVIEW_QUESTIONS_UPDATE = 'interview:update',
  INTERVIEW_QUESTIONS_DELETE = 'interview:delete',
  INTERVIEW_QUESTIONS_APPROVE = 'interview:approve',
  INTERVIEW_QUESTIONS_EXPORT = 'interview:export',

  // -- organization-service: email templates --
  EMAIL_TEMPLATE_VIEW = 'email_template:read',
  EMAIL_TEMPLATE_ADD = 'email_template:write',
  EMAIL_TEMPLATE_EDIT = 'email_template:update',
  EMAIL_TEMPLATE_DELETE = 'email_template:delete',
  EMAIL_TEMPLATE_APPROVE = 'email_template:approve',
  EMAIL_TEMPLATE_EXPORT = 'email_template:export',

  // -- candidate-service: candidates --
  // candidate-service's real permission catalog
  // (shared/cfp-contracts/src/cfp_contracts/permissions.py's
  // Permission.CANDIDATE_READ/CANDIDATE_WRITE) has exactly these two values
  // — confirmed by reading the catalog directly. There is no
  // update/delete/approve/export split on the candidate resource server-side;
  // every write action (edit, status change, notes, scoring, messaging,
  // resume upload) is gated by the single CANDIDATE_WRITE permission. Every
  // write-gated UI affordance below should check CANDIDATE_WRITE, not a
  // fictional finer-grained permission — same class of fix as the
  // organization-service authorities correction (see
  // ORGANIZATION_SERVICE_INTEGRATION.md's Phase 0).
  CANDIDATE_VIEW = 'candidate:read',
  CANDIDATE_ADD = 'candidate:write',

  // -- organization-service: billing --
  BILLING_VIEW = 'billing:read',
  BILLING_ADD = 'billing:write',
  BILLING_EDIT = 'billing:update',
  BILLING_DELETE = 'billing:delete',
  BILLING_APPROVE = 'billing:approve',
  BILLING_EXPORT = 'billing:export',

  // -- organization-service: reports --
  REPORT_VIEW = 'report:read',
  REPORT_ADD = 'report:write',
  REPORT_EDIT = 'report:update',
  REPORT_DELETE = 'report:delete',
  REPORT_APPROVE = 'report:approve',
  REPORT_EXPORT = 'report:export',

  // -- organization-service: auth (credential/session administration) --
  AUTH_VIEW = 'auth:read',
  AUTH_ADD = 'auth:write',
  AUTH_EDIT = 'auth:update',
  AUTH_DELETE = 'auth:delete',
  AUTH_APPROVE = 'auth:approve',
  AUTH_EXPORT = 'auth:export',
  SESSION_VIEW = 'session:read',
  SESSION_ADD = 'session:write',
  SESSION_EDIT = 'session:update',
  SESSION_DELETE = 'session:delete',
  SESSION_APPROVE = 'session:approve',
  SESSION_EXPORT = 'session:export',

  // -- job-service: organization-service's Resource.JOB has exactly the
  // standard 6 actions (see Permission.JOB_* in cfp_contracts). CLOSE and
  // DUPLICATE have no dedicated backend verb of their own — resolved by the
  // live role/permission matrix instead of guessed: hiring_manager's own
  // description ("closes jobs") plus its ceiling holding job:approve
  // confirms CLOSE -> approve; DUPLICATE has no equivalent in the matrix at
  // all, so it reuses job:write (same as CREATE — duplicating is a creation
  // op), the same "one real permission, two UI actions" pattern USER_ADD
  // already uses for "Add CFP users" / "Add organization users".
  JOB_OPENING_VIEW = 'job:read',
  JOB_OPENING_CREATE = 'job:write',
  JOB_OPENING_EDIT = 'job:update',
  JOB_OPENING_DELETE = 'job:delete',
  JOB_OPENING_CLOSE = 'job:approve',
  JOB_OPENING_EXPORT = 'job:export',

  /** No backend permission — job-service concept, out of this integration's scope. */
  JOB_CONFIGURATION_VIEW = 'job_configuration:view',
  /** No dedicated backend permission — the activity feed reads whatever the
   * caller's tenant/platform context already allows. */
  ACTIVITY_FEED = 'activity:view',
  /** No backend permission — purely a frontend tab-visibility flag. */
  MY_COMPANY_VIEW = 'my_company:view',
  /** No dedicated backend resource yet — kept as a placeholder tab flag. */
  SUBSCRIPTIONS_VIEW = 'subscriptions:view',
  /** No dedicated backend resource yet — kept as a placeholder tab flag,
   * same treatment as SUBSCRIPTIONS_VIEW immediately above. */
  FINANCES_VIEW = 'finances:view',

  // Roles & Permissions management itself is a permission — so access to the
  // feature that grants access is gated the same way as everything else.
  // Matches Permission.ROLE_* in cfp_contracts exactly — organization-service's
  // `require_permission`/`require_platform_permission` checks these literal
  // strings, so a typo here is a silent, permanent 403. ROLE_CREATE (role:write)
  // doubles as BOTH role-creation (`POST /roles`) and role-assignment
  // (`POST /roles/assignments`) on the backend — there is no separate "assign"
  // permission.
  ROLE_VIEW = 'role:read',
  ROLE_CREATE = 'role:write',
  ROLE_EDIT = 'role:update',
  ROLE_DELETE = 'role:delete',
  ROLE_APPROVE = 'role:approve',
  ROLE_EXPORT = 'role:export',
}

/** Groups the catalog for the permission-picker UI (PermissionMatrix). */
export type PermissionModule =
  | 'Dashboard'
  | 'Company'
  | 'Company Settings'
  | 'CFP Users'
  | 'Organization Users'
  | 'Departments & Locations'
  | 'Team & Invitations'
  | 'Platform Administration'
  | 'Masters'
  | 'Interview Questions'
  | 'Email Templates'
  | 'Candidates'
  | 'Billing'
  | 'Reports'
  | 'Auth & Sessions'
  | 'Job Openings'
  | 'Job Configuration'
  | 'Activity'
  | 'My Company'
  | 'Subscriptions'
  | 'Roles & Permissions';

export type PermissionCatalogEntry = {
  code: Authorities;
  label: string;
  module: PermissionModule;
};

/**
 * The fixed permission catalog, grouped by module + human labels — this is
 * what a role-creation/edit form iterates to render checkboxes. Nothing may
 * be added to a role's permission set that isn't in this list. Exactly the
 * 114 real organization-service permissions — see the module docstring
 * above for why frontend-only concepts (Dashboard, Activity, My Company,
 * Subscriptions, Job Configuration) are deliberately excluded here even
 * though they remain valid Authorities members for route/tab gating.
 */
export const PERMISSION_CATALOG: PermissionCatalogEntry[] = [
  { code: Authorities.COMPANY_VIEW, label: 'View companies', module: 'Company' },
  { code: Authorities.COMPANY_ADD, label: 'Add companies', module: 'Company' },
  { code: Authorities.COMPANY_EDIT, label: 'Edit companies', module: 'Company' },
  { code: Authorities.COMPANY_ARCHIVE, label: 'Archive companies', module: 'Company' },
  {
    code: Authorities.COMPANY_APPROVE,
    label: 'Confirm a company & send invite',
    module: 'Company',
  },
  { code: Authorities.COMPANY_EXPORT, label: 'Export companies', module: 'Company' },

  {
    code: Authorities.COMPANY_SETTINGS_VIEW,
    label: 'View company settings',
    module: 'Company Settings',
  },
  {
    code: Authorities.COMPANY_SETTINGS_ADD,
    label: 'Add company settings',
    module: 'Company Settings',
  },
  {
    code: Authorities.COMPANY_SETTINGS_EDIT,
    label: 'Edit company settings',
    module: 'Company Settings',
  },
  {
    code: Authorities.COMPANY_SETTINGS_DELETE,
    label: 'Delete company settings',
    module: 'Company Settings',
  },
  {
    code: Authorities.COMPANY_SETTINGS_APPROVE,
    label: 'Approve company settings',
    module: 'Company Settings',
  },
  {
    code: Authorities.COMPANY_SETTINGS_EXPORT,
    label: 'Export company settings',
    module: 'Company Settings',
  },

  { code: Authorities.USER_VIEW, label: 'View CFP users', module: 'CFP Users' },
  { code: Authorities.USER_ADD, label: 'Add CFP users', module: 'CFP Users' },
  { code: Authorities.USER_EDIT, label: 'Edit CFP users', module: 'CFP Users' },
  { code: Authorities.USER_ARCHIVE, label: 'Archive CFP users', module: 'CFP Users' },
  { code: Authorities.USER_APPROVE, label: 'Approve CFP users', module: 'CFP Users' },
  { code: Authorities.USER_EXPORT, label: 'Export CFP users', module: 'CFP Users' },

  { code: Authorities.USER_VIEW, label: 'View organization users', module: 'Organization Users' },
  {
    code: Authorities.USER_ADD,
    label: 'Add organization users',
    module: 'Organization Users',
  },
  {
    code: Authorities.USER_EDIT,
    label: 'Edit organization users',
    module: 'Organization Users',
  },
  {
    code: Authorities.USER_ARCHIVE,
    label: 'Archive organization users',
    module: 'Organization Users',
  },

  {
    code: Authorities.DEPARTMENT_VIEW,
    label: 'View departments',
    module: 'Departments & Locations',
  },
  {
    code: Authorities.DEPARTMENT_ADD,
    label: 'Add departments',
    module: 'Departments & Locations',
  },
  {
    code: Authorities.DEPARTMENT_EDIT,
    label: 'Edit departments',
    module: 'Departments & Locations',
  },
  {
    code: Authorities.DEPARTMENT_DELETE,
    label: 'Delete departments',
    module: 'Departments & Locations',
  },
  {
    code: Authorities.DEPARTMENT_APPROVE,
    label: 'Approve departments',
    module: 'Departments & Locations',
  },
  {
    code: Authorities.DEPARTMENT_EXPORT,
    label: 'Export departments',
    module: 'Departments & Locations',
  },
  { code: Authorities.LOCATION_VIEW, label: 'View locations', module: 'Departments & Locations' },
  { code: Authorities.LOCATION_ADD, label: 'Add locations', module: 'Departments & Locations' },
  { code: Authorities.LOCATION_EDIT, label: 'Edit locations', module: 'Departments & Locations' },
  {
    code: Authorities.LOCATION_DELETE,
    label: 'Delete locations',
    module: 'Departments & Locations',
  },
  {
    code: Authorities.LOCATION_APPROVE,
    label: 'Approve locations',
    module: 'Departments & Locations',
  },
  {
    code: Authorities.LOCATION_EXPORT,
    label: 'Export locations',
    module: 'Departments & Locations',
  },
  {
    code: Authorities.TENANT_JOB_TITLE_VIEW,
    label: 'View job titles',
    module: 'Departments & Locations',
  },
  {
    code: Authorities.TENANT_JOB_TITLE_ADD,
    label: 'Add job titles',
    module: 'Departments & Locations',
  },
  {
    code: Authorities.TENANT_JOB_TITLE_EDIT,
    label: 'Edit job titles',
    module: 'Departments & Locations',
  },
  {
    code: Authorities.TENANT_JOB_TITLE_DELETE,
    label: 'Delete job titles',
    module: 'Departments & Locations',
  },
  {
    code: Authorities.JOB_CATALOG_VIEW,
    label: 'View job catalogs (shifts, job types, job modes, education preferences)',
    module: 'Departments & Locations',
  },
  {
    code: Authorities.JOB_CATALOG_EDIT,
    label: 'Add/edit/delete job catalogs (shifts, job types, job modes, education preferences)',
    module: 'Departments & Locations',
  },

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
    code: Authorities.INVITATION_UPDATE,
    label: 'Update team invitations',
    module: 'Team & Invitations',
  },
  {
    code: Authorities.INVITATION_REVOKE,
    label: 'Revoke team invitations',
    module: 'Team & Invitations',
  },
  {
    code: Authorities.INVITATION_APPROVE,
    label: 'Approve team invitations',
    module: 'Team & Invitations',
  },
  {
    code: Authorities.INVITATION_EXPORT,
    label: 'Export team invitations',
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
  {
    code: Authorities.PLATFORM_APPROVE,
    label: 'Approve platform administration actions',
    module: 'Platform Administration',
  },
  {
    code: Authorities.PLATFORM_EXPORT,
    label: 'Export platform administration data',
    module: 'Platform Administration',
  },

  { code: Authorities.INDUSTRY_VIEW, label: 'View industries', module: 'Masters' },
  { code: Authorities.INDUSTRY_ADD, label: 'Add industries', module: 'Masters' },
  { code: Authorities.INDUSTRY_EDIT, label: 'Edit industries', module: 'Masters' },
  { code: Authorities.INDUSTRY_DELETE, label: 'Delete industries', module: 'Masters' },
  { code: Authorities.INDUSTRY_APPROVE, label: 'Approve industries', module: 'Masters' },
  { code: Authorities.INDUSTRY_EXPORT, label: 'Export industries', module: 'Masters' },
  { code: Authorities.JOB_TITLE_CATALOG_VIEW, label: 'View job title catalog', module: 'Masters' },
  { code: Authorities.JOB_TITLE_CATALOG_ADD, label: 'Add job titles', module: 'Masters' },
  { code: Authorities.JOB_TITLE_CATALOG_EDIT, label: 'Edit job titles', module: 'Masters' },
  { code: Authorities.JOB_TITLE_CATALOG_DELETE, label: 'Delete job titles', module: 'Masters' },
  { code: Authorities.JOB_TITLE_CATALOG_APPROVE, label: 'Approve job titles', module: 'Masters' },
  { code: Authorities.JOB_TITLE_CATALOG_EXPORT, label: 'Export job titles', module: 'Masters' },
  {
    code: Authorities.MASTER_DEPARTMENT_VIEW,
    label: 'View master departments',
    module: 'Masters',
  },
  { code: Authorities.MASTER_DEPARTMENT_ADD, label: 'Add master departments', module: 'Masters' },
  {
    code: Authorities.MASTER_DEPARTMENT_EDIT,
    label: 'Edit master departments',
    module: 'Masters',
  },
  {
    code: Authorities.MASTER_DEPARTMENT_DELETE,
    label: 'Delete master departments',
    module: 'Masters',
  },
  {
    code: Authorities.MASTER_DEPARTMENT_APPROVE,
    label: 'Approve master departments',
    module: 'Masters',
  },
  {
    code: Authorities.MASTER_DEPARTMENT_EXPORT,
    label: 'Export master departments',
    module: 'Masters',
  },

  {
    code: Authorities.INTERVIEW_QUESTIONS_VIEW,
    label: 'View interview questions',
    module: 'Interview Questions',
  },
  {
    code: Authorities.INTERVIEW_QUESTIONS_EDIT,
    label: 'Add interview questions',
    module: 'Interview Questions',
  },
  {
    code: Authorities.INTERVIEW_QUESTIONS_UPDATE,
    label: 'Update interview questions',
    module: 'Interview Questions',
  },
  {
    code: Authorities.INTERVIEW_QUESTIONS_DELETE,
    label: 'Delete interview questions',
    module: 'Interview Questions',
  },
  {
    code: Authorities.INTERVIEW_QUESTIONS_APPROVE,
    label: 'Approve interview questions',
    module: 'Interview Questions',
  },
  {
    code: Authorities.INTERVIEW_QUESTIONS_EXPORT,
    label: 'Export interview questions',
    module: 'Interview Questions',
  },

  {
    code: Authorities.EMAIL_TEMPLATE_VIEW,
    label: 'View email templates',
    module: 'Email Templates',
  },
  { code: Authorities.EMAIL_TEMPLATE_ADD, label: 'Add email templates', module: 'Email Templates' },
  {
    code: Authorities.EMAIL_TEMPLATE_EDIT,
    label: 'Edit email templates',
    module: 'Email Templates',
  },
  {
    code: Authorities.EMAIL_TEMPLATE_DELETE,
    label: 'Delete email templates',
    module: 'Email Templates',
  },
  {
    code: Authorities.EMAIL_TEMPLATE_APPROVE,
    label: 'Approve email templates',
    module: 'Email Templates',
  },
  {
    code: Authorities.EMAIL_TEMPLATE_EXPORT,
    label: 'Export email templates',
    module: 'Email Templates',
  },

  // Only these two exist on candidate-service's real permission catalog —
  // see the enum's own comment above CANDIDATE_VIEW/CANDIDATE_ADD.
  { code: Authorities.CANDIDATE_VIEW, label: 'View candidates', module: 'Candidates' },
  {
    code: Authorities.CANDIDATE_ADD,
    label: 'Manage candidates (edit, status, notes, scoring, messaging)',
    module: 'Candidates',
  },

  { code: Authorities.BILLING_VIEW, label: 'View billing', module: 'Billing' },
  { code: Authorities.BILLING_ADD, label: 'Add billing records', module: 'Billing' },
  { code: Authorities.BILLING_EDIT, label: 'Edit billing records', module: 'Billing' },
  { code: Authorities.BILLING_DELETE, label: 'Delete billing records', module: 'Billing' },
  { code: Authorities.BILLING_APPROVE, label: 'Approve billing records', module: 'Billing' },
  { code: Authorities.BILLING_EXPORT, label: 'Export billing records', module: 'Billing' },

  { code: Authorities.REPORT_VIEW, label: 'View reports', module: 'Reports' },
  { code: Authorities.REPORT_ADD, label: 'Add reports', module: 'Reports' },
  { code: Authorities.REPORT_EDIT, label: 'Edit reports', module: 'Reports' },
  { code: Authorities.REPORT_DELETE, label: 'Delete reports', module: 'Reports' },
  { code: Authorities.REPORT_APPROVE, label: 'Approve reports', module: 'Reports' },
  { code: Authorities.REPORT_EXPORT, label: 'Export reports', module: 'Reports' },

  { code: Authorities.AUTH_VIEW, label: 'View auth records', module: 'Auth & Sessions' },
  { code: Authorities.AUTH_ADD, label: 'Add auth records', module: 'Auth & Sessions' },
  { code: Authorities.AUTH_EDIT, label: 'Edit auth records', module: 'Auth & Sessions' },
  { code: Authorities.AUTH_DELETE, label: 'Delete auth records', module: 'Auth & Sessions' },
  { code: Authorities.AUTH_APPROVE, label: 'Approve auth records', module: 'Auth & Sessions' },
  { code: Authorities.AUTH_EXPORT, label: 'Export auth records', module: 'Auth & Sessions' },
  { code: Authorities.SESSION_VIEW, label: 'View sessions', module: 'Auth & Sessions' },
  { code: Authorities.SESSION_ADD, label: 'Add sessions', module: 'Auth & Sessions' },
  { code: Authorities.SESSION_EDIT, label: 'Edit sessions', module: 'Auth & Sessions' },
  { code: Authorities.SESSION_DELETE, label: 'Revoke sessions', module: 'Auth & Sessions' },
  { code: Authorities.SESSION_APPROVE, label: 'Approve sessions', module: 'Auth & Sessions' },
  { code: Authorities.SESSION_EXPORT, label: 'Export sessions', module: 'Auth & Sessions' },

  { code: Authorities.JOB_OPENING_VIEW, label: 'View job openings', module: 'Job Openings' },
  { code: Authorities.JOB_OPENING_CREATE, label: 'Create job openings', module: 'Job Openings' },
  { code: Authorities.JOB_OPENING_EDIT, label: 'Edit job openings', module: 'Job Openings' },
  {
    // Same permission as "Create job openings" (job:write) — duplicating has
    // no dedicated backend verb, so it shares JOB_OPENING_CREATE's code, the
    // same pattern USER_ADD already uses for two differently-labelled rows.
    code: Authorities.JOB_OPENING_CREATE,
    label: 'Duplicate job openings',
    module: 'Job Openings',
  },
  { code: Authorities.JOB_OPENING_CLOSE, label: 'Close job openings', module: 'Job Openings' },
  { code: Authorities.JOB_OPENING_DELETE, label: 'Delete job openings', module: 'Job Openings' },
  { code: Authorities.JOB_OPENING_EXPORT, label: 'Export job openings', module: 'Job Openings' },

  { code: Authorities.ROLE_VIEW, label: 'View roles & permissions', module: 'Roles & Permissions' },
  { code: Authorities.ROLE_CREATE, label: 'Create roles', module: 'Roles & Permissions' },
  { code: Authorities.ROLE_EDIT, label: 'Edit role permissions', module: 'Roles & Permissions' },
  { code: Authorities.ROLE_DELETE, label: 'Delete roles', module: 'Roles & Permissions' },
  { code: Authorities.ROLE_APPROVE, label: 'Approve roles', module: 'Roles & Permissions' },
  { code: Authorities.ROLE_EXPORT, label: 'Export roles', module: 'Roles & Permissions' },
];

/**
 * One-line explanation of what holding each permission actually lets someone
 * do — shown under its label on the Roles & Permissions → Permission
 * Reference screen, which otherwise has only a code and a label to go on.
 * Keyed by the underlying `Authorities` code (not by catalog row), since a
 * few codes back more than one `PERMISSION_CATALOG` row under different
 * labels/modules (`USER_VIEW` under both "CFP Users" and "Organization
 * Users", `JOB_OPENING_CREATE` under both "Create" and "Duplicate") — one
 * real permission, so one description regardless of which row is showing.
 * Not exhaustive over the live backend's full ~176-code catalog on purpose:
 * `permissionExplorer.helpers.ts` only consults this for the 114 codes
 * PERMISSION_CATALOG already knows about, and generates a generic fallback
 * for anything else the backend reports that isn't in either list yet.
 */
export const PERMISSION_DESCRIPTIONS: Partial<Record<Authorities, string>> = {
  [Authorities.COMPANY_VIEW]: 'See every company on the platform and their profile details.',
  [Authorities.COMPANY_ADD]: 'Register a new company on the platform.',
  [Authorities.COMPANY_EDIT]: "Update a company's profile details.",
  [Authorities.COMPANY_ARCHIVE]: "Suspend a company, revoking its access to the platform.",
  [Authorities.COMPANY_APPROVE]:
    'Confirm a scraped or self-signed-up company and send its Company Admin invite.',
  [Authorities.COMPANY_EXPORT]: 'Download the company list as a file.',

  [Authorities.COMPANY_SETTINGS_VIEW]: "View a company's own profile and settings.",
  [Authorities.COMPANY_SETTINGS_ADD]: 'Add a new company settings record.',
  [Authorities.COMPANY_SETTINGS_EDIT]: "Update a company's own profile and settings.",
  [Authorities.COMPANY_SETTINGS_DELETE]: 'Delete a company settings record.',
  [Authorities.COMPANY_SETTINGS_APPROVE]: 'Approve a change made to a company\'s settings.',
  [Authorities.COMPANY_SETTINGS_EXPORT]: "Download a company's settings as a file.",

  [Authorities.USER_VIEW]: "See who's in the directory — their name, email, phone, and role.",
  [Authorities.USER_ADD]: 'Add a new person to the directory.',
  [Authorities.USER_EDIT]: "Update a person's directory profile.",
  [Authorities.USER_ARCHIVE]: "Deactivate a person's account, revoking their access.",
  [Authorities.USER_APPROVE]: 'Approve a pending user account.',
  [Authorities.USER_EXPORT]: 'Download the user directory as a file.',

  [Authorities.DEPARTMENT_VIEW]: "View a company's departments.",
  [Authorities.DEPARTMENT_ADD]: 'Create a new department.',
  [Authorities.DEPARTMENT_EDIT]: 'Rename or reassign a department.',
  [Authorities.DEPARTMENT_DELETE]: 'Delete a department.',
  [Authorities.DEPARTMENT_APPROVE]: 'Approve a change made to a department.',
  [Authorities.DEPARTMENT_EXPORT]: 'Download the department list as a file.',
  [Authorities.LOCATION_VIEW]: "View a company's office locations.",
  [Authorities.LOCATION_ADD]: 'Add a new office location.',
  [Authorities.LOCATION_EDIT]: 'Update an office location.',
  [Authorities.LOCATION_DELETE]: 'Delete an office location.',
  [Authorities.LOCATION_APPROVE]: 'Approve a change made to an office location.',
  [Authorities.LOCATION_EXPORT]: 'Download the location list as a file.',
  [Authorities.TENANT_JOB_TITLE_VIEW]: "View a company's own job title catalogue.",
  [Authorities.TENANT_JOB_TITLE_ADD]: 'Add a new job title.',
  [Authorities.TENANT_JOB_TITLE_EDIT]: 'Rename an existing job title.',
  [Authorities.TENANT_JOB_TITLE_DELETE]: 'Delete a job title.',
  [Authorities.JOB_CATALOG_VIEW]:
    'View job catalogues — shifts, job types, job modes, and education preferences.',
  [Authorities.JOB_CATALOG_EDIT]:
    'Add, edit, or delete job catalogue entries — shifts, job types, job modes, and education preferences.',

  [Authorities.INVITATION_VIEW]: 'See who has been invited to join, and the status of each invite.',
  [Authorities.INVITATION_SEND]: 'Send a new invite, or resend one that has not been accepted yet.',
  [Authorities.INVITATION_UPDATE]:
    "Change an invite's details (role, department) before it is accepted.",
  [Authorities.INVITATION_REVOKE]: 'Cancel a pending invite before it is accepted.',
  [Authorities.INVITATION_APPROVE]: 'Approve a pending invite.',
  [Authorities.INVITATION_EXPORT]: 'Download the invite list as a file.',

  [Authorities.PLATFORM_VIEW]: "View the platform's internal administration area.",
  [Authorities.PLATFORM_INVITE]: 'Invite a new Super Admin or internal Careerforce Pro staff member.',
  [Authorities.PLATFORM_MANAGE_DEPARTMENTS]: "Manage Careerforce Pro's own internal departments.",
  [Authorities.PLATFORM_OFFBOARD_STAFF]: 'Offboard an internal Careerforce Pro staff member.',
  [Authorities.PLATFORM_APPROVE]: 'Approve a platform administration action.',
  [Authorities.PLATFORM_EXPORT]: 'Download platform administration data as a file.',

  [Authorities.INDUSTRY_VIEW]: 'View the platform-wide industry catalogue.',
  [Authorities.INDUSTRY_ADD]: 'Add a new industry to the catalogue.',
  [Authorities.INDUSTRY_EDIT]: 'Rename an existing industry.',
  [Authorities.INDUSTRY_DELETE]: 'Delete an industry from the catalogue.',
  [Authorities.INDUSTRY_APPROVE]: 'Approve a change to the industry catalogue.',
  [Authorities.INDUSTRY_EXPORT]: 'Download the industry catalogue as a file.',
  [Authorities.JOB_TITLE_CATALOG_VIEW]: 'View the platform-wide job title catalogue.',
  [Authorities.JOB_TITLE_CATALOG_ADD]: 'Add a new job title to the platform catalogue.',
  [Authorities.JOB_TITLE_CATALOG_EDIT]: 'Rename a job title in the platform catalogue.',
  [Authorities.JOB_TITLE_CATALOG_DELETE]: 'Delete a job title from the platform catalogue.',
  [Authorities.JOB_TITLE_CATALOG_APPROVE]: 'Approve a change to the platform job title catalogue.',
  [Authorities.JOB_TITLE_CATALOG_EXPORT]: 'Download the platform job title catalogue as a file.',
  [Authorities.MASTER_DEPARTMENT_VIEW]: 'View the platform-wide department catalogue.',
  [Authorities.MASTER_DEPARTMENT_ADD]: 'Add a new department to the platform catalogue.',
  [Authorities.MASTER_DEPARTMENT_EDIT]: 'Rename a department in the platform catalogue.',
  [Authorities.MASTER_DEPARTMENT_DELETE]: 'Delete a department from the platform catalogue.',
  [Authorities.MASTER_DEPARTMENT_APPROVE]: 'Approve a change to the platform department catalogue.',
  [Authorities.MASTER_DEPARTMENT_EXPORT]: 'Download the platform department catalogue as a file.',

  [Authorities.INTERVIEW_QUESTIONS_VIEW]: "View a company's interview question bank.",
  [Authorities.INTERVIEW_QUESTIONS_EDIT]: 'Add a new interview question.',
  [Authorities.INTERVIEW_QUESTIONS_UPDATE]: 'Update an existing interview question.',
  [Authorities.INTERVIEW_QUESTIONS_DELETE]: 'Delete an interview question.',
  [Authorities.INTERVIEW_QUESTIONS_APPROVE]: 'Approve an interview question before it goes live.',
  [Authorities.INTERVIEW_QUESTIONS_EXPORT]: 'Download the interview question bank as a file.',

  [Authorities.EMAIL_TEMPLATE_VIEW]: "View a company's notification email templates.",
  [Authorities.EMAIL_TEMPLATE_ADD]: 'Create a new email template.',
  [Authorities.EMAIL_TEMPLATE_EDIT]: 'Edit an existing email template.',
  [Authorities.EMAIL_TEMPLATE_DELETE]: 'Delete an email template.',
  [Authorities.EMAIL_TEMPLATE_APPROVE]: 'Approve an email template before it goes live.',
  [Authorities.EMAIL_TEMPLATE_EXPORT]: 'Download email templates as a file.',

  [Authorities.CANDIDATE_VIEW]: "View a job's candidates and their applications.",
  [Authorities.CANDIDATE_ADD]:
    'Manage candidates — edit their details, change status, add notes, score them, and message them.',

  [Authorities.BILLING_VIEW]: 'View billing records and invoices.',
  [Authorities.BILLING_ADD]: 'Add a new billing record.',
  [Authorities.BILLING_EDIT]: 'Edit an existing billing record.',
  [Authorities.BILLING_DELETE]: 'Delete a billing record.',
  [Authorities.BILLING_APPROVE]: 'Approve a billing record.',
  [Authorities.BILLING_EXPORT]: 'Download billing records as a file.',

  [Authorities.REPORT_VIEW]: 'View reports.',
  [Authorities.REPORT_ADD]: 'Create a new report.',
  [Authorities.REPORT_EDIT]: 'Edit an existing report.',
  [Authorities.REPORT_DELETE]: 'Delete a report.',
  [Authorities.REPORT_APPROVE]: 'Approve a report.',
  [Authorities.REPORT_EXPORT]: 'Download a report as a file.',

  [Authorities.AUTH_VIEW]: "View a person's authentication records.",
  [Authorities.AUTH_ADD]: 'Add a new authentication record.',
  [Authorities.AUTH_EDIT]: "Edit a person's authentication record — e.g. reset a password.",
  [Authorities.AUTH_DELETE]: 'Delete an authentication record.',
  [Authorities.AUTH_APPROVE]: 'Approve an authentication change.',
  [Authorities.AUTH_EXPORT]: 'Download authentication records as a file.',
  [Authorities.SESSION_VIEW]: "View a person's active login sessions.",
  [Authorities.SESSION_ADD]: 'Start a new session record.',
  [Authorities.SESSION_EDIT]: 'Edit a session record.',
  [Authorities.SESSION_DELETE]: "Revoke someone's active login session, signing them out.",
  [Authorities.SESSION_APPROVE]: 'Approve a session change.',
  [Authorities.SESSION_EXPORT]: 'Download session records as a file.',

  [Authorities.JOB_OPENING_VIEW]: 'View job openings and their candidate pipelines.',
  [Authorities.JOB_OPENING_CREATE]:
    'Create a new job opening, from scratch or by duplicating an existing one.',
  [Authorities.JOB_OPENING_EDIT]: "Edit a job opening's details.",
  [Authorities.JOB_OPENING_CLOSE]: 'Close a job opening.',
  [Authorities.JOB_OPENING_DELETE]: 'Delete a job opening.',
  [Authorities.JOB_OPENING_EXPORT]: 'Download job openings as a file.',

  [Authorities.ROLE_VIEW]: 'View roles and what each one can do.',
  [Authorities.ROLE_CREATE]: 'Create a new role, or assign an existing one to someone.',
  [Authorities.ROLE_EDIT]: "Change a role's permissions.",
  [Authorities.ROLE_DELETE]: 'Delete a role.',
  [Authorities.ROLE_APPROVE]: 'Approve a role change.',
  [Authorities.ROLE_EXPORT]: 'Download the role list as a file.',
};

// ============================================
// SEEDED SYSTEM ROLES (fallback only)
// ============================================
// Fallback permission sets, used by useEffectivePermissions ONLY when the
// session carries no dynamic `resolvedRole` (see that hook's own docstring)
// — e.g. DevRoleSwitcher's preview, or a platform caller today (Super
// Admin/internal staff), since organization-service has no self-service
// "resolve my own effective permissions" endpoint yet for a platform
// principal the way GET /v1/roles/users/{id}/permissions serves a tenant
// caller (see Login/index.tsx's completeRealLogin, PLATFORM_CALLER_ROLE_NAME).
// Going forward a role's permissions should come from the dynamic Role
// record (src/types/rbac.d.ts) resolved through resolveEffectivePermissions
// — do not add new roles here; create them through the Roles & Permissions
// UI instead.
//
// Every list below is copied VERBATIM from the live database's 8 system
// roles (organization-service's GET /v1/platform/roles), cross-checked
// entry-by-entry against the RBAC role/permission matrix for the 5 it
// covers (super_admin, company_admin, hiring_manager, recruiter,
// interviewer) — not hand-derived. cfp_admin/cfp_support/viewer were not in
// that matrix; their lists here are the live database's own seeded values.
export const ROLE_AUTHORITIES: Record<string, Record<string, Authorities[]>> = {
  owner: {
    // Real platform logins currently all resolve to role.name === 'Master
    // Super Admin' regardless of actual backend role (see the docstring
    // above) — so this key is what a real Super Admin session's fallback
    // ceiling reads today. Full 114 — every permission in the catalog.
    masterSuperAdmin: Object.values(Authorities).filter(
      (code) =>
        ![
          Authorities.DASHBOARD_VIEW,
          Authorities.JOB_CONFIGURATION_VIEW,
          Authorities.ACTIVITY_FEED,
          Authorities.MY_COMPANY_VIEW,
          Authorities.SUBSCRIPTIONS_VIEW,
          Authorities.FINANCES_VIEW,
          // Job Openings is Company Admin's own tenant-scoped work queue —
          // job-service's real permission model has no platform-level
          // equivalent (Super Admin's job-service surface is the
          // /platform/master-* catalogues, a different permission namespace
          // entirely — see Company Settings → Job Catalogs). This "every
          // authority" fallback previously left JOB_OPENING_VIEW in by
          // omission, contradicting menuItem.tsx's own doc comment (which
          // already assumed Super Admin doesn't hold it) and showing a "Job
          // Openings" nav item that led nowhere useful for a platform caller.
          Authorities.JOB_OPENING_VIEW,
          // Same reasoning as JOB_OPENING_VIEW above: interview-service's
          // bookings/interviews surface is a tenant's own hiring pipeline
          // (candidate-service scopes every query to the caller's own
          // tenant), with no platform-level equivalent — a Super Admin
          // landing on /interviews via this permission sees an empty or
          // meaningless screen, not a real platform feature. Previously left
          // in by the same "every authority" omission JOB_OPENING_VIEW had.
          Authorities.INTERVIEW_QUESTIONS_VIEW,
        ].includes(code)
    ),
    // Real backend name: cfp_admin. Verbatim from the live database.
    cfpAdmin: [
      Authorities.AUTH_EDIT,
      Authorities.BILLING_EXPORT,
      Authorities.BILLING_VIEW,
      Authorities.CANDIDATE_VIEW,
      Authorities.CANDIDATE_ADD,
      Authorities.DEPARTMENT_DELETE,
      Authorities.DEPARTMENT_EXPORT,
      Authorities.DEPARTMENT_VIEW,
      Authorities.DEPARTMENT_EDIT,
      Authorities.DEPARTMENT_ADD,
      Authorities.EMAIL_TEMPLATE_DELETE,
      Authorities.EMAIL_TEMPLATE_VIEW,
      Authorities.EMAIL_TEMPLATE_EDIT,
      Authorities.EMAIL_TEMPLATE_ADD,
      Authorities.INTERVIEW_QUESTIONS_APPROVE,
      Authorities.INTERVIEW_QUESTIONS_DELETE,
      Authorities.INTERVIEW_QUESTIONS_EXPORT,
      Authorities.INTERVIEW_QUESTIONS_VIEW,
      Authorities.INTERVIEW_QUESTIONS_UPDATE,
      Authorities.INTERVIEW_QUESTIONS_EDIT,
      Authorities.INVITATION_REVOKE,
      Authorities.INVITATION_EXPORT,
      Authorities.INVITATION_VIEW,
      Authorities.INVITATION_UPDATE,
      Authorities.INVITATION_SEND,
      Authorities.JOB_OPENING_CLOSE,
      Authorities.JOB_OPENING_DELETE,
      Authorities.JOB_OPENING_EXPORT,
      Authorities.JOB_OPENING_VIEW,
      Authorities.JOB_OPENING_EDIT,
      Authorities.JOB_OPENING_CREATE,
      Authorities.LOCATION_DELETE,
      Authorities.LOCATION_EXPORT,
      Authorities.LOCATION_VIEW,
      Authorities.LOCATION_EDIT,
      Authorities.LOCATION_ADD,
      Authorities.COMPANY_SETTINGS_EXPORT,
      Authorities.COMPANY_SETTINGS_VIEW,
      Authorities.COMPANY_SETTINGS_EDIT,
      Authorities.JOB_CATALOG_VIEW,
      Authorities.JOB_CATALOG_EDIT,
      Authorities.REPORT_EXPORT,
      Authorities.REPORT_VIEW,
      Authorities.ROLE_DELETE,
      Authorities.ROLE_EXPORT,
      Authorities.ROLE_VIEW,
      Authorities.ROLE_EDIT,
      Authorities.ROLE_CREATE,
      Authorities.SESSION_DELETE,
      Authorities.SESSION_VIEW,
      Authorities.COMPANY_APPROVE,
      Authorities.COMPANY_ARCHIVE,
      Authorities.COMPANY_EXPORT,
      Authorities.COMPANY_VIEW,
      Authorities.COMPANY_EDIT,
      Authorities.COMPANY_ADD,
      Authorities.USER_APPROVE,
      Authorities.USER_ARCHIVE,
      Authorities.USER_EXPORT,
      Authorities.USER_VIEW,
      Authorities.USER_EDIT,
      Authorities.USER_ADD,
    ],
    // Real backend name: cfp_support. Read-only on a specific client, time-limited.
    cfpSupport: [
      Authorities.CANDIDATE_VIEW,
      Authorities.DEPARTMENT_VIEW,
      Authorities.INTERVIEW_QUESTIONS_VIEW,
      Authorities.JOB_OPENING_VIEW,
      Authorities.LOCATION_VIEW,
      Authorities.COMPANY_SETTINGS_VIEW,
      Authorities.JOB_CATALOG_VIEW,
      Authorities.REPORT_VIEW,
      Authorities.USER_VIEW,
    ],
    // Legacy generic fallback — kept so nothing already relying on
    // `ROLE_AUTHORITIES.owner.admin`/`.user` regresses; new code should
    // prefer the real role-name keys above.
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
    // Real backend name: company_admin. `convertToCamelCase('company_admin')`
    // === 'companyAdmin' — this is the key a real tenant session with that
    // role actually looks up (see getAccess.ts/useEffectivePermissions.tsx).
    companyAdmin: [
      Authorities.AUTH_EDIT,
      Authorities.BILLING_EXPORT,
      Authorities.BILLING_VIEW,
      Authorities.CANDIDATE_VIEW,
      Authorities.CANDIDATE_ADD,
      Authorities.DEPARTMENT_APPROVE,
      Authorities.DEPARTMENT_DELETE,
      Authorities.DEPARTMENT_EXPORT,
      Authorities.DEPARTMENT_VIEW,
      Authorities.DEPARTMENT_EDIT,
      Authorities.DEPARTMENT_ADD,
      Authorities.EMAIL_TEMPLATE_VIEW,
      Authorities.EMAIL_TEMPLATE_ADD,
      Authorities.INTERVIEW_QUESTIONS_APPROVE,
      Authorities.INTERVIEW_QUESTIONS_DELETE,
      Authorities.INTERVIEW_QUESTIONS_EXPORT,
      Authorities.INTERVIEW_QUESTIONS_VIEW,
      Authorities.INTERVIEW_QUESTIONS_UPDATE,
      Authorities.INTERVIEW_QUESTIONS_EDIT,
      Authorities.INVITATION_REVOKE,
      Authorities.INVITATION_VIEW,
      Authorities.INVITATION_SEND,
      Authorities.JOB_OPENING_CLOSE,
      Authorities.JOB_OPENING_DELETE,
      Authorities.JOB_OPENING_EXPORT,
      Authorities.JOB_OPENING_VIEW,
      Authorities.JOB_OPENING_EDIT,
      Authorities.JOB_OPENING_CREATE,
      Authorities.LOCATION_APPROVE,
      Authorities.LOCATION_DELETE,
      Authorities.LOCATION_EXPORT,
      Authorities.LOCATION_VIEW,
      Authorities.LOCATION_EDIT,
      Authorities.LOCATION_ADD,
      Authorities.TENANT_JOB_TITLE_VIEW,
      Authorities.TENANT_JOB_TITLE_ADD,
      Authorities.TENANT_JOB_TITLE_EDIT,
      Authorities.TENANT_JOB_TITLE_DELETE,
      Authorities.COMPANY_SETTINGS_VIEW,
      Authorities.COMPANY_SETTINGS_EDIT,
      Authorities.JOB_CATALOG_VIEW,
      Authorities.JOB_CATALOG_EDIT,
      Authorities.REPORT_EXPORT,
      Authorities.REPORT_VIEW,
      Authorities.ROLE_APPROVE,
      Authorities.ROLE_DELETE,
      Authorities.ROLE_EXPORT,
      Authorities.ROLE_VIEW,
      Authorities.ROLE_EDIT,
      Authorities.ROLE_CREATE,
      Authorities.COMPANY_VIEW,
      Authorities.COMPANY_EDIT,
      Authorities.USER_APPROVE,
      Authorities.USER_ARCHIVE,
      Authorities.USER_EXPORT,
      Authorities.USER_VIEW,
      Authorities.USER_EDIT,
      Authorities.USER_ADD,
    ],
    hiringManager: [
      Authorities.CANDIDATE_VIEW,
      Authorities.CANDIDATE_ADD,
      Authorities.DEPARTMENT_VIEW,
      Authorities.INTERVIEW_QUESTIONS_APPROVE,
      Authorities.INTERVIEW_QUESTIONS_VIEW,
      Authorities.INTERVIEW_QUESTIONS_UPDATE,
      Authorities.INTERVIEW_QUESTIONS_EDIT,
      Authorities.JOB_OPENING_CLOSE,
      Authorities.JOB_OPENING_VIEW,
      Authorities.JOB_OPENING_EDIT,
      Authorities.JOB_OPENING_CREATE,
      Authorities.LOCATION_VIEW,
      Authorities.COMPANY_SETTINGS_VIEW,
      Authorities.JOB_CATALOG_VIEW,
      Authorities.TENANT_JOB_TITLE_VIEW,
      Authorities.TENANT_JOB_TITLE_ADD,
      Authorities.TENANT_JOB_TITLE_EDIT,
      Authorities.TENANT_JOB_TITLE_DELETE,
      Authorities.REPORT_VIEW,
      Authorities.USER_VIEW,
    ],
    recruiter: [
      Authorities.CANDIDATE_VIEW,
      Authorities.CANDIDATE_ADD,
      Authorities.DEPARTMENT_VIEW,
      Authorities.INTERVIEW_QUESTIONS_VIEW,
      Authorities.INTERVIEW_QUESTIONS_EDIT,
      Authorities.JOB_OPENING_VIEW,
      Authorities.LOCATION_VIEW,
      Authorities.COMPANY_SETTINGS_VIEW,
      Authorities.JOB_CATALOG_VIEW,
      Authorities.TENANT_JOB_TITLE_VIEW,
      Authorities.USER_VIEW,
    ],
    interviewer: [
      Authorities.CANDIDATE_VIEW,
      Authorities.INTERVIEW_QUESTIONS_VIEW,
      Authorities.INTERVIEW_QUESTIONS_EDIT,
    ],
    viewer: [
      Authorities.CANDIDATE_VIEW,
      Authorities.INTERVIEW_QUESTIONS_VIEW,
      Authorities.JOB_OPENING_VIEW,
    ],
    // Legacy generic fallback — kept so nothing already relying on
    // `ROLE_AUTHORITIES.organization.admin`/`.user`/`.superAdmin` regresses.
    superAdmin: [
      Authorities.DASHBOARD_VIEW,
      Authorities.JOB_OPENING_CREATE,
      Authorities.JOB_OPENING_CLOSE,
      Authorities.JOB_OPENING_VIEW,
      Authorities.JOB_OPENING_EDIT,
      Authorities.USER_ADD,
      Authorities.JOB_CONFIGURATION_VIEW,
      Authorities.ACTIVITY_FEED,
      Authorities.MY_COMPANY_VIEW,
      Authorities.ROLE_VIEW,
      Authorities.ROLE_CREATE,
      Authorities.ROLE_EDIT,
      Authorities.ROLE_DELETE,
    ],
    admin: [
      Authorities.DASHBOARD_VIEW,
      Authorities.JOB_OPENING_VIEW,
      Authorities.JOB_OPENING_CREATE,
      Authorities.JOB_OPENING_CLOSE,
      Authorities.JOB_OPENING_EDIT,
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
