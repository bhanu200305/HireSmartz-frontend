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
  // InviteTenantUserRequest's `role` is `Literal["recruiter",
  // "hiring_manager"]` — the only two roles this endpoint (or the bulk
  // roster import) will accept; `company_admin` and `interviewer` 422
  // immediately (see requests.py). A Company Admin invite goes through a
  // separate flow (ADMIN_ROLE_REQUIRES_INVITE), and there's no self-serve
  // interviewer invite at all yet.
  role: z.enum(['hiring_manager', 'recruiter'], {
    errorMap: () => ({ message: 'Role is required.' }),
  }),
});

export type InviteTeamMemberFormValues = z.infer<typeof inviteTeamMemberSchema>;
