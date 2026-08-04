import { z } from 'zod';
import {
  emailValidation,
  nameValidation,
  phoneNumberValidation,
} from '../../../shared/utils/validation/input.helpers';

const addOrgUserSchema = z.object({
  profilePicture: z.string().optional().nullable(),
  profilePictureType: z.string().optional().nullable(),
  firstName: nameValidation({ label: 'First name', required: true }),
  lastName: nameValidation({ label: 'Last name', required: true }),
  emailId: emailValidation(),
  phoneNumber: phoneNumberValidation(),
  employeeId: z.string().nonempty('Employee ID is required.'),
  countryCode: z.string().nonempty('Country code is required.'),
  roleTypeMappingId: z.number({
    required_error: 'Role is required.',
    invalid_type_error: 'Role ID must be a number.',
  }),
  allowMultiLocationAccess: z.boolean().optional(),
  canManageCompanySettings: z.boolean().optional(),
  baseLocationId: z.number({
    required_error: 'Location is required.',
  }),
  selectedLocations: z.array(z.number()).optional(),
  accessibleLocationIds: z.array(z.number()).optional(),
});

export default addOrgUserSchema;
