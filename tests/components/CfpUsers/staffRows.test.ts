import { describe, it, expect } from 'vitest';
import {
  assignableRoles,
  buildStaffRows,
  filterStaffRows,
  platformRoleLabel,
} from '../../../src/components/CfpUsers/staffRows';

const member = {
  membership_id: 'm1',
  email: 'asha@cfp.com',
  role: 'cfp_support',
  department_id: 'd1',
  department_name: 'Support',
  status: 'active',
  created_at: null,
  first_name: 'Asha',
  last_name: 'Rao',
  title: 'Ms',
  country_code: '+91',
  phone_no: '9876543210',
};

const invitation = {
  invitation_id: 'i1',
  email: 'ravi@cfp.com',
  role: 'cfp_admin',
  first_name: 'Ravi',
  last_name: 'Kumar',
  title: 'Mr',
  phone: '+14155550123',
  department_id: null,
  department_name: null,
  expires_at: '2026-10-20T00:00:00Z',
};

describe('CFP Users roles', () => {
  it('shows friendly role names', () => {
    expect(platformRoleLabel('super_admin')).toBe('Superadmin');
    expect(platformRoleLabel('cfp_admin')).toBe('Admin');
    expect(platformRoleLabel('cfp_support')).toBe('Support User');
  });

  it('lets a Superadmin pick all three and anyone else only Support User', () => {
    expect(assignableRoles(true).map((r) => r.value)).toEqual([
      'super_admin',
      'cfp_admin',
      'cfp_support',
    ]);
    expect(assignableRoles(false).map((r) => r.value)).toEqual(['cfp_support']);
  });
});

describe('CFP Users table rows', () => {
  const rows = buildStaffRows([member], [invitation]);

  it('lists members and waiting invitations together', () => {
    expect(rows.map((r) => r.kind)).toEqual(['member', 'invited']);
    expect(rows[0]).toMatchObject({
      name: 'Ms Asha Rao',
      phone: '+91 9876543210',
      department: 'Support',
      status: 'active',
    });
    expect(rows[1]).toMatchObject({
      name: 'Mr Ravi Kumar',
      phone: '+14155550123',
      status: 'Invited',
    });
  });

  it('leaves a missing name or phone empty', () => {
    const [row] = buildStaffRows(
      [
        {
          ...member,
          first_name: null,
          last_name: null,
          title: null,
          country_code: null,
          phone_no: null,
        },
      ],
      []
    );
    expect(row.name).toBe('');
    expect(row.phone).toBe('');
  });

  it('searches name, email and phone (spacing in the phone does not matter)', () => {
    expect(filterStaffRows(rows, 'asha')).toHaveLength(1);
    expect(filterStaffRows(rows, 'RAVI@')).toHaveLength(1);
    expect(filterStaffRows(rows, '987 654 3210')).toHaveLength(1);
    expect(filterStaffRows(rows, '4155550123')).toHaveLength(1);
    expect(filterStaffRows(rows, 'nobody')).toHaveLength(0);
    expect(filterStaffRows(rows, '  ')).toHaveLength(2);
  });
});
