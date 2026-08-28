import { z } from 'zod';
import { emailValidation, nameValidation } from '../../../shared/utils/validation/input.helpers';
import { phoneWithCountry } from '../../../shared/utils/validation/phoneValidation';

export const editCandidateSchema = z
  .object({
    firstName: nameValidation({ label: 'First name', required: true }),
    lastName: nameValidation({ label: 'Last name', required: true }),
    countryCode: z.string().min(1, 'Country code is required.'),
    phoneNumber: z.string(),
    email: emailValidation(),
    education: z.string().min(1, 'Qualification is required.'),
    address: z.string().min(1, 'Candidate Location is required.'),
    candidateCommunicationLanguage: z
      .union([z.enum(['en', 'es']), z.literal(''), z.null()])
      .optional(),
    skills: z.array(z.number()).optional(),
  })
  .superRefine(phoneWithCountry('countryCode', 'phoneNumber'));

export type EditCandidateFormValues = z.infer<typeof editCandidateSchema>;
