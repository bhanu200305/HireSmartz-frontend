import { describe, expect, it } from 'vitest';
import {
  candidateStatusSchema,
  createCandidateStatusValidation,
} from '../../../../src/components/JobsOpening/Candidates/CandidateStatusSchema';

describe('candidateStatusSchema', () => {
  it('accepts comments alone, defaulting notifyCandidate to false', () => {
    const result = candidateStatusSchema.safeParse({ comments: 'Great interview.' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notifyCandidate).toBe(false);
    }
  });

  it('requires non-empty comments', () => {
    const result = candidateStatusSchema.safeParse({ comments: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.comments?.[0]).toBe('Comments are required.');
    }
  });

  it('rejects comments over 1000 characters', () => {
    const result = candidateStatusSchema.safeParse({ comments: 'a'.repeat(1001) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.comments?.[0]).toBe(
        'Comments cannot exceed 1000 characters.'
      );
    }
  });
});

describe('createCandidateStatusValidation', () => {
  it('does not require a reason for a status other than NOT_SELECTED', () => {
    const schema = createCandidateStatusValidation('SELECTED');
    expect(schema.safeParse({ comments: 'Strong candidate.' }).success).toBe(true);
  });

  it('requires a reason when the status is NOT_SELECTED', () => {
    const schema = createCandidateStatusValidation('NOT_SELECTED');
    const result = schema.safeParse({ comments: 'Did not meet the bar.' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.reason?.[0]).toBe(
        'Reason is required for rejection.'
      );
    }
  });

  it('accepts NOT_SELECTED once a non-empty reason is given', () => {
    const schema = createCandidateStatusValidation('NOT_SELECTED');
    const result = schema.safeParse({
      comments: 'Did not meet the bar.',
      reason: 'Insufficient experience',
    });
    expect(result.success).toBe(true);
  });
});

// Logs should be logged