import { z } from 'zod';
import {
  emailValidation,
  nameValidation,
  phoneNumberValidation,
} from '../../../shared/utils/validation/input.helpers';

const editOrgUserSchema = z.object({
  profilePicture: z.string().optional(),
  profilePictureType: z.string().optional(),
  firstName: nameValidation({ label: 'First name', required: true }),
  lastName: nameValidation({ label: 'Last name', required: true }),
  emailId: emailValidation(),
  status: z.boolean(),
  phoneNumber: phoneNumberValidation(),
  employeeId: z.string().nonempty('Employee ID is required.'),
  countryCode: z.string().nonempty('Country code is required.'),
  role: z.number({
    required_error: 'Role is required.',
    invalid_type_error: 'Role ID must be a number.',
  }),
  baseLocationId: z.number({
    required_error: 'Location is required.',
    invalid_type_error: 'Location is required.',
  }),
  allowMultiLocationAccess: z.boolean().optional(),
  canManageCompanySettings: z.boolean().optional(),
  selectedLocations: z.array(z.number()).default([]),
});

export default editOrgUserSchema;
