import { z } from 'zod';

export const candidateStatusSchema = z.object({
  comments: z
    .string()
    .trim()
    .min(1, 'Comments are required.')
    .max(1000, 'Comments cannot exceed 1000 characters.'),
  notifyCandidate: z.boolean().default(false),
  reason: z.string().optional(),
  finalRating: z.number().optional().nullable(),
});

export const createCandidateStatusValidation = (statusType: string) => {
  return candidateStatusSchema.refine(
    (data) => {
      if (statusType === 'NOT_SELECTED') {
        return !!data.reason && data.reason.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Reason is required for rejection.',
      path: ['reason'],
    }
  );
  // .refine(
  //   (data) => {
  //     if (statusType === 'SELECTED' || statusType === 'NOT_SELECTED') {
  //       return data.finalRating !== null && data.finalRating !== undefined
  //     }
  //     return true
  //   },
  //   {
  //     message: 'Final rating is required',
  //     path: ['finalRating']
  //   }
  // )
};

export type CandidateStatusFormData = z.infer<typeof candidateStatusSchema>;
