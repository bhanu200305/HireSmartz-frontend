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
  officeId: z.string().optional(),
  role: z.enum(['company_admin', 'hiring_manager', 'recruiter', 'interviewer'], {
    errorMap: () => ({ message: 'Role is required.' }),
  }),
  // Every permission code CURRENTLY CHECKED in the Permissions tab, kept in
  // sync with the selected role (see InviteTeamMemberModal's effect) rather
  // than free-standing — this is never something the form itself validates
  // against a role's set, only the backend does (PERMISSION_NOT_GRANTED_BY_ROLE).
  selectedPermissions: z.array(z.string()),
});

export type InviteTeamMemberFormValues = z.infer<typeof inviteTeamMemberSchema>;
