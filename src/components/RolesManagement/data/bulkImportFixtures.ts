import { getRoleTemplate } from './roleTemplates';
import type { RoleScope } from '../../../types';
import type { BulkImportRoleRow } from '../types';

let fixtureSeq = 1;
const nextId = (): string => `bulk-${fixtureSeq++}`;

const permissionsFor = (templateKey: string) => getRoleTemplate(templateKey)?.permissions ?? [];

/** "No file handy? Next →" placeholder rows — mirrors the wireframe's own
 * mock-parse behavior so the flow is demoable without a real spreadsheet. */
export const bulkImportPlaceholderRows = (scope: RoleScope): BulkImportRoleRow[] => {
  if (scope === 'platform') {
    return [
      {
        id: nextId(),
        roleName: 'Regional CFP Support — West',
        scope: 'platform',
        templateKey: 'cfp_support',
        templateLabel: 'CFP Support',
        permissions: permissionsFor('cfp_support'),
        locationPermissions: [],
        status: 'ready',
      },
      {
        id: nextId(),
        roleName: 'Regional CFP Support — East',
        scope: 'platform',
        templateKey: 'cfp_support',
        templateLabel: 'CFP Support',
        permissions: permissionsFor('cfp_support'),
        locationPermissions: [],
        status: 'ready',
      },
      {
        id: nextId(),
        roleName: 'Client Onboarding Admin',
        scope: 'platform',
        templateKey: 'cfp_admin',
        templateLabel: 'CFP Admin',
        permissions: permissionsFor('cfp_admin'),
        locationPermissions: [],
        status: 'ready',
      },
    ];
  }

  return [
    {
      id: nextId(),
      roleName: 'Field Recruiter — Austin',
      scope: 'tenant',
      templateKey: 'recruiter',
      templateLabel: 'Recruiter',
      permissions: permissionsFor('recruiter'),
      locationPermissions: [
        { locationId: 1, locationName: 'Austin, TX', permissions: permissionsFor('recruiter') },
      ],
      status: 'ready',
    },
    {
      id: nextId(),
      roleName: 'Field Recruiter — Chicago',
      scope: 'tenant',
      templateKey: 'recruiter',
      templateLabel: 'Recruiter',
      permissions: permissionsFor('recruiter'),
      locationPermissions: [
        { locationId: 2, locationName: 'Chicago, IL', permissions: permissionsFor('recruiter') },
      ],
      status: 'ready',
    },
    {
      id: nextId(),
      roleName: 'Onsite Interviewer — NYC',
      scope: 'tenant',
      templateKey: 'interviewer',
      templateLabel: 'Interviewer',
      permissions: permissionsFor('interviewer'),
      locationPermissions: [
        { locationId: 3, locationName: 'New York, NY', permissions: permissionsFor('interviewer') },
      ],
      status: 'ready',
    },
    {
      id: nextId(),
      roleName: 'Weekend Support Viewer',
      scope: 'tenant',
      templateKey: 'viewer',
      templateLabel: 'Viewer',
      permissions: permissionsFor('viewer'),
      locationPermissions: [],
      status: 'ready',
    },
  ];
};

/** Column-preview sample rows shown above the dropzone — purely
 * illustrative, never imported. */
export const bulkImportTemplatePreview: {
  designation: string;
  tier: string;
  baseTemplate: string;
  locationLabel: string;
}[] = [
  {
    designation: 'Regional Hiring Manager',
    tier: 'Company',
    baseTemplate: 'hiring_manager',
    locationLabel: 'Austin, TX',
  },
  {
    designation: 'CFP Support — APAC',
    tier: 'Platform',
    baseTemplate: 'cfp_support',
    locationLabel: '—',
  },
];
