import { z } from 'zod';

export const interviewAssessmentSchema = z.object({
  answers: z
    .record(
      z.string(),
      z.object({
        score: z.number().min(1).max(5).nullable().optional(),
        pass: z.boolean().nullable().optional(),
      })
    )
    .optional(),
});

export type InterviewAssessmentFormValues = z.infer<typeof interviewAssessmentSchema>;
