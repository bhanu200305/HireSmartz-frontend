import type {
  PendingPlatformInvitation,
  PlatformStaffMember,
} from '../../api/organization-service/Platform/staff';

// Friendly names for the three platform roles, and who may hand out which.
export type PlatformRole = 'super_admin' | 'cfp_admin' | 'cfp_support';

export const PLATFORM_ROLE_OPTIONS: { value: PlatformRole; label: string }[] = [
  { value: 'super_admin', label: 'Superadmin' },
  { value: 'cfp_admin', label: 'Admin' },
  { value: 'cfp_support', label: 'Support User' },
];

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  PLATFORM_ROLE_OPTIONS.map((option) => [option.value, option.label])
);

/** "Superadmin", "Admin" or "Support User"; any other role is shown as is. */
export const platformRoleLabel = (role: string): string => ROLE_LABELS[role] ?? role;

/** A Superadmin (platform:write) may add any role; anyone else only a Support User. */
export const assignableRoles = (canAddAnyRole: boolean) =>
  canAddAnyRole
    ? PLATFORM_ROLE_OPTIONS
    : PLATFORM_ROLE_OPTIONS.filter((option) => option.value === 'cfp_support');

/** One row of the CFP Users table: a member, or an invitation still waiting. */
export type StaffListRow = {
  key: string;
  kind: 'member' | 'invited';
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: string;
  /** Only members can be offboarded. */
  member?: PlatformStaffMember;
};

const fullName = (title?: string | null, first?: string | null, last?: string | null) =>
  [title, first, last]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');

export const buildStaffRows = (
  staff: PlatformStaffMember[],
  invitations: PendingPlatformInvitation[]
): StaffListRow[] => [
  ...staff.map(
    (member): StaffListRow => ({
      key: member.membership_id,
      kind: 'member',
      name: fullName(member.title, member.first_name, member.last_name),
      email: member.email,
      phone: [member.country_code, member.phone_no].filter(Boolean).join(' '),
      role: member.role,
      department: member.department_name ?? '',
      status: member.status,
      member,
    })
  ),
  ...invitations.map(
    (invitation): StaffListRow => ({
      key: `invite-${invitation.invitation_id}`,
      kind: 'invited',
      name: fullName(invitation.title, invitation.first_name, invitation.last_name),
      email: invitation.email,
      phone: invitation.phone ?? '',
      role: invitation.role,
      department: invitation.department_name ?? '',
      status: 'Invited',
    })
  ),
];

/** Search across name, email and phone (digits only for the phone, so spacing doesn't matter). */
export const filterStaffRows = (rows: StaffListRow[], query: string): StaffListRow[] => {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  const digits = q.replace(/\D/g, '');
  return rows.filter(
    (row) =>
      row.name.toLowerCase().includes(q) ||
      row.email.toLowerCase().includes(q) ||
      row.phone.toLowerCase().includes(q) ||
      (digits.length > 0 && row.phone.replace(/\D/g, '').includes(digits)) ||
      platformRoleLabel(row.role).toLowerCase().includes(q) ||
      row.department.toLowerCase().includes(q)
  );
};
