import { describe, it, expect } from 'vitest';
import { getJobErrorMessage } from '../../../../src/shared/utils/auth/jobError.helpers';

// RTK Query error shape: err.data is the platform envelope
// {message, data: {error_code, details}} — see platformErrorEnvelope.ts.
const permissionDeniedError = (required: string | string[]) => ({
  data: {
    message: 'insufficient permissions',
    data: { error_code: 'PERMISSION_DENIED', details: { required } },
  },
});

describe('getJobErrorMessage', () => {
  it('translates a known missing permission into a readable action', () => {
    const message = getJobErrorMessage(permissionDeniedError('job:delete'), 'fallback');
    expect(message).toBe(
      "You don't have permission to delete job openings. Contact your company admin for access."
    );
  });

  it('joins multiple missing permissions', () => {
    const message = getJobErrorMessage(
      permissionDeniedError(['job:delete', 'job:approve']),
      'fallback'
    );
    expect(message).toBe(
      "You don't have permission to delete job openings and publish or close job openings. Contact your company admin for access."
    );
  });

  it('falls back to a generic phrase for an unmapped permission code', () => {
    const message = getJobErrorMessage(permissionDeniedError('audit:export'), 'fallback');
    expect(message).toBe(
      "You don't have permission to do this. Contact your company admin for access."
    );
  });

  it('leaves a non-permission error message untouched', () => {
    const err = {
      data: { message: 'job not found', data: { error_code: 'JOB_NOT_FOUND' } },
    };
    expect(getJobErrorMessage(err, 'fallback')).toBe('Job not found.');
  });

  it('falls back to the generic message when required is missing', () => {
    const err = {
      data: { message: 'insufficient permissions', data: { error_code: 'PERMISSION_DENIED' } },
    };
    expect(getJobErrorMessage(err, 'fallback')).toBe('Insufficient permissions.');
  });

  it('uses the caller-supplied fallback when there is no error at all', () => {
    expect(getJobErrorMessage(undefined, 'Something went wrong.')).toBe('Something went wrong.');
  });
});

describe('getJobErrorMessage - content guardrail', () => {
  it('shows the standard rejection message', () => {
    const err = {
      data: {
        message: "This content doesn't meet our guidelines. Please try again.",
        data: { error_code: 'CONTENT_REJECTED', details: { field: 'prompt_text' } },
      },
    };
    expect(getJobErrorMessage(err, 'fallback')).toBe(
      "This content doesn't meet our guidelines. Please try again."
    );
  });
});

describe('getJobErrorMessage - interview round rules', () => {
  const codeError = (error_code: string) => ({
    data: { message: 'server text', data: { error_code } },
  });

  it('explains where the Intake Call can go', () => {
    expect(getJobErrorMessage(codeError('INTAKE_CALL_POSITION_INVALID'), 'fallback')).toBe(
      'The Intake Call must be round 1 or 2, before or right after the Resume round.'
    );
  });

  it('explains that Resume is required', () => {
    expect(getJobErrorMessage(codeError('RESUME_ROUND_CANNOT_BE_MODIFIED'), 'fallback')).toBe(
      'The Resume round is required and cannot be removed or changed.'
    );
  });
});
