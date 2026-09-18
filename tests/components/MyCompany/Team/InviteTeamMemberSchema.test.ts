import { describe, expect, it } from 'vitest';
import { inviteTeamMemberSchema } from '../../../../src/components/MyCompany/Team/InviteTeamMemberSchema';

describe('inviteTeamMemberSchema', () => {
  it('accepts a minimal valid invite', () => {
    const result = inviteTeamMemberSchema.safeParse({
      email: 'newhire@example.com',
      role: 'recruiter',
    });
    expect(result.success).toBe(true);
  });

  it('does not require a department or designation', () => {
    const result = inviteTeamMemberSchema.safeParse({
      email: 'newhire@example.com',
      role: 'recruiter',
      departmentId: undefined,
      designation: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = inviteTeamMemberSchema.safeParse({ email: 'not-an-email', role: 'recruiter' });
    expect(result.success).toBe(false);
  });

  it('requires a role', () => {
    const result = inviteTeamMemberSchema.safeParse({ email: 'newhire@example.com', role: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.role?.[0]).toBe('Role is required.');
    }
  });
});
