import { z } from 'zod';
import { nameValidation, emailValidation } from '../../../shared/utils/validation/input.helpers';

const inviteUserSchema = z.object({
  firstName: nameValidation({ label: 'First name', required: true }),
  lastName: nameValidation({ label: 'Last name', required: false }),
  email: emailValidation(),
  roleId: z.number({ required_error: 'Role is required.' }),
  locationId: z.number().nullable(),
});

export default inviteUserSchema;
export type InviteUserFormValues = z.infer<typeof inviteUserSchema>;
