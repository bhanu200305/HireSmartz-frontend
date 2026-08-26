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
  // InviteTenantUserRequest's `role` is every tenant-invitable SystemRole —
  // company_admin, hiring_manager, recruiter, interviewer (see requests.py).
  role: z.enum(['company_admin', 'hiring_manager', 'recruiter', 'interviewer'], {
    errorMap: () => ({ message: 'Role is required.' }),
  }),
});

export type InviteTeamMemberFormValues = z.infer<typeof inviteTeamMemberSchema>;
