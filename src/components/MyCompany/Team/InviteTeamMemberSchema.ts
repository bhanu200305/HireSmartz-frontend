import { z } from 'zod';
import { emailValidation } from '../../../shared/utils/validation/input.helpers';

export const inviteTeamMemberSchema = z.object({
  email: emailValidation(),
  // Optional on the wire (POST /v1/tenants/{id}/users/invitations) — a
  // department isn't required to send an invite.
  departmentId: z.string().optional(),
  // Free text — a job title, not tied to any catalogue on this form (no
  // picker exists yet; the backend resolves it by name, auto-creating if
  // new — see InviteTenantUserInput.designation).
  designation: z.string().optional(),
  // Free text — validated against this tenant's own assignable-role catalog
  // server-side (GET /roles: system roles plus any custom ones), not a
  // fixed set here. See InviteTenantUserRequest's own docstring.
  role: z.string().min(1, 'Role is required.'),
});

export type InviteTeamMemberFormValues = z.infer<typeof inviteTeamMemberSchema>;
