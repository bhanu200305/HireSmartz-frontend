import { z } from 'zod';

export const interviewFeedbackSchema = z.object({
  answers: z
    .record(
      z.string(),
      z.object({
        score: z.number().min(1).max(5).nullable().optional(),
        pass: z.boolean().nullable().optional(),
      })
    )
    .optional(),
  finalScore: z.number().min(1).max(5).nullable().optional(),
});

export type InterviewFeedbackFormValues = z.infer<typeof interviewFeedbackSchema>;
