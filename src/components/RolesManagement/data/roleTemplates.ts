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
    label: 'CFP Admin',
    description: 'Manages client companies',
    permissions: ROLE_AUTHORITIES.owner.admin,
  },
  {
    key: 'cfp_support',
    scope: 'platform',
    label: 'CFP Support',
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
    description: 'Creates jobs, uploads resumes, moves pipeline',
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

export const roleTemplatesForScope = (scope: RoleScope): RoleTemplate[] =>
  ROLE_TEMPLATES.filter((template) => template.scope === scope);
