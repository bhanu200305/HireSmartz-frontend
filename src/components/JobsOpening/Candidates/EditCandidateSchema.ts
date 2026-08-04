import { z } from 'zod';
import { emailValidation, nameValidation } from '../../../shared/utils/validation/input.helpers';

// Flexible phone validation for candidate details: accepts 7–15 digits (international range).
// The strict US-only 10-digit format is intentionally NOT enforced here.
const candidatePhoneValidation = () =>
  z
    .string()
    .nonempty('Phone number is required.')
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, '');
        return digits.length >= 7 && digits.length <= 15;
      },
      { message: 'Phone number must be between 7 and 15 digits.' }
    );

export const editCandidateSchema = z.object({
  firstName: nameValidation({ label: 'First name', required: true }),
  lastName: nameValidation({ label: 'Last name', required: true }),
  countryCode: z.string().min(1, 'Country code is required.'),
  phoneNumber: candidatePhoneValidation(),
  email: emailValidation(),
  education: z.string().min(1, 'Qualification is required.'),
  address: z.string().min(1, 'Candidate Location is required.'),
  candidateCommunicationLanguage: z
    .union([z.enum(['en', 'es']), z.literal(''), z.null()])
    .optional(),
  skills: z.array(z.number()).optional(),
});

export type EditCandidateFormValues = z.infer<typeof editCandidateSchema>;
