import { z } from 'zod';

/**
 * Validation schemas for assessment form inputs
 * Handles both score-based and pass/fail questions
 */

// Score validation: clamp between 1-5
export const scoreSchema = z
  .number()
  .min(1, 'Score must be at least 1')
  .max(5, 'Score must not exceed 5')
  .default(1)
  .transform((val) => {
    // Clamp value between 1 and 5
    if (val < 1) return 1;
    if (val > 5) return 5;
    return val;
  });

// Pass/Fail validation: boolean value
export const passFailSchema = z.boolean().nullable().default(null);

// Assessment question form data type
export type AssessmentQuestionScore = z.infer<typeof scoreSchema>;
export type AssessmentQuestionPassFail = z.infer<typeof passFailSchema>;

// Individual question scoring state
export type QuestionScore = {
  questionId: number;
  score?: number;
  passFailResult?: boolean;
};

// Assessment form state
export type AssessmentFormState = {
  [questionId: number]: {
    score?: number;
    passFailResult?: boolean;
  };
};
