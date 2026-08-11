import { z } from 'zod';
import { emailValidation } from '../../../shared/utils/validation/input.helpers';

export const inviteTeamMemberSchema = z.object({
  email: emailValidation(),
  departmentId: z.string().nonempty('Department is required.'),
  role: z.enum(['recruiter', 'hiring_manager'], {
    errorMap: () => ({ message: 'Role is required.' }),
  }),
});

export type InviteTeamMemberFormValues = z.infer<typeof inviteTeamMemberSchema>;
