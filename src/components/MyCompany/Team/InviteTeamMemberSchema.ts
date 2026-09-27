import { z } from 'zod';
import { emailValidation } from '../../../shared/utils/validation/input.helpers';

export const inviteTeamMemberSchema = z.object({
  // Matches InviteTenantUserRequest.name's single-string wire shape and its
  // max_length (invited_name column, InviteModel).
  name: z.string().trim().min(1, 'Name is required.').max(200, 'Name is too long.'),
  email: emailValidation(),
  // Optional on the wire (POST /v1/tenants/{id}/users/invitations) — a
  // department isn't required to send an invite.
  departmentId: z.string().optional(),
  // Free text — a job title, not tied to any catalogue on this form (no
  // picker exists yet; the backend resolves it by name, auto-creating if
  // new — see InviteTenantUserInput.designation). Capped at
  // OrganizationDesignationModel.designation's column width.
  designation: z.string().max(120, 'Designation is too long.').optional(),
  // Free text — validated against this tenant's own assignable-role catalog
  // server-side (GET /roles: system roles plus any custom ones), not a
  // fixed set here. See InviteTenantUserRequest's own docstring.
  role: z.string().min(1, 'Role is required.'),
});

export type InviteTeamMemberFormValues = z.infer<typeof inviteTeamMemberSchema>;
