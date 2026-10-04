import { Authorities, ROLE_AUTHORITIES } from '../../../constants/authorities.constant';
import type { RoleScope } from '../../../types';

export type RoleTemplate = {
  key: string;
  scope: RoleScope;
  label: string;
  description: string;
  /**
   * Starter permission set a role created from this template begins with —
   * always intersected with the acting user's own escalation ceiling before
   * being applied (see getAssignablePermissionCeiling), so this list is an
   * upper bound/suggestion, never a guarantee of what ends up checked.
   */
  permissions: Authorities[];
};

// The wireframe's Create Role step 1 lists 8 illustrative templates with
// mock permission codes (co_view, jo_create, rp_edit, ...) that don't exist
// in this app's real Authorities enum. Each is mapped below to the closest
// real permission set instead of inventing new codes:
//   - Platform-tier templates reuse ROLE_AUTHORITIES.owner's existing
//     masterSuperAdmin/admin lists — already the curated "what this role
//     should hold" set for those two names.
//   - Company-tier templates reuse ROLE_AUTHORITIES.organization's
//     admin/hiringManager/recruiter lists the same way.
//   - CFP Support, Interviewer, and Viewer have no equivalent entry in
//     ROLE_AUTHORITIES (never seeded system roles) and PERMISSION_CATALOG
//     has no candidate/interview-level granularity yet, so all three are
//     hand-picked from the closest available view-only permissions —
//     flagged here rather than silently invented. A real backend template
//     catalog would presumably define these more precisely once
//     candidate-level RBAC exists.
export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    key: 'super_admin',
    scope: 'platform',
    label: 'Super Admin',
    description: 'Full platform access',
    permissions: ROLE_AUTHORITIES.owner.masterSuperAdmin,
  },
  {
    key: 'cfp_admin',
    scope: 'platform',
    label: 'Admin',
    description: 'Manages client companies',
    permissions: ROLE_AUTHORITIES.owner.admin,
  },
  {
    key: 'cfp_support',
    scope: 'platform',
    label: 'Customer Support',
    description: 'Read-only on a specific client, time-limited',
    permissions: [
      Authorities.DASHBOARD_VIEW,
      Authorities.COMPANY_VIEW,
      Authorities.USER_VIEW,
      Authorities.FINANCES_VIEW,
    ],
  },
  {
    key: 'company_admin',
    scope: 'tenant',
    label: 'Company Admin',
    description: 'Full company config, team management, integrations',
    permissions: ROLE_AUTHORITIES.organization.admin,
  },
  {
    key: 'hiring_manager',
    scope: 'tenant',
    label: 'Hiring Manager',
    description: 'Reviews scores, overrides AI, approves advancement, closes jobs',
    permissions: ROLE_AUTHORITIES.organization.hiringManager,
  },
  {
    key: 'recruiter',
    scope: 'tenant',
    label: 'Recruiter',
    description:
      'Uploads resumes and moves the pipeline on jobs they’re assigned to; cannot create or publish a job opening',
    permissions: ROLE_AUTHORITIES.organization.recruiter,
  },
  {
    key: 'interviewer',
    scope: 'tenant',
    label: 'Interviewer',
    description: 'Joins rounds, submits evaluations, view-only on other data',
    permissions: [
      Authorities.DASHBOARD_VIEW,
      Authorities.JOB_OPENING_VIEW,
      Authorities.ACTIVITY_FEED,
    ],
  },
  {
    key: 'viewer',
    scope: 'tenant',
    label: 'Viewer',
    description: 'Read-only on candidate content, can join live calls',
    permissions: [
      Authorities.DASHBOARD_VIEW,
      Authorities.JOB_OPENING_VIEW,
      Authorities.ACTIVITY_FEED,
    ],
  },
];

export const getRoleTemplate = (key: string): RoleTemplate | undefined =>
  ROLE_TEMPLATES.find((template) => template.key === key);

/**
 * The friendly label for a SYSTEM role's raw identifier (`cfp_admin` ->
 * "Admin"). The backend's `RoleResponse.name`/`base_role_name` fields are
 * literal identifiers, not display strings (see that response model's own
 * docstring) — this is the one place that translates one to the other, so a
 * new system role only needs its label added here, not at every render site.
 * Anything not in this list goes through `humanizeRoleName` instead (see
 * there for why that leaves a typed-in custom role name untouched).
 */
export const systemRoleLabel = (key: string): string =>
  getRoleTemplate(key)?.label ?? humanizeRoleName(key);

// Short role keys that read as acronyms rather than words ("svp" -> "SVP").
const ROLE_ACRONYMS = new Set(['svp', 'vp', 'avp', 'evp', 'hr', 'cfp', 'ceo', 'cto', 'cfo', 'coo']);

/**
 * Display-only formatting for a role identifier with no template label
 * (`regional_hiring_manager` -> "Regional Hiring Manager", `svp` -> "SVP").
 * Only snake_case/lowercase identifiers are touched — a name with spaces or
 * capitals is what an admin typed in and is shown exactly as written. The
 * underlying role name/id sent to the backend never changes.
 */
export const humanizeRoleName = (name: string): string => {
  if (!/^[a-z0-9_]+$/.test(name)) return name;
  return name
    .split('_')
    .filter(Boolean)
    .map((word) =>
      ROLE_ACRONYMS.has(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ');
};

export const roleTemplatesForScope = (scope: RoleScope): RoleTemplate[] =>
  ROLE_TEMPLATES.filter((template) => template.scope === scope);
