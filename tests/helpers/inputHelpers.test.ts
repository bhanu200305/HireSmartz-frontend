import { describe, it, expect } from 'vitest';
import {
  sanitizeInput,
  capitalizeFirstLetter,
  getChangedFields,
  getVisibleValidationErrors,
  websiteLinkValidation,
  nameValidation,
  getFormEmailValidationError,
  emailValidation,
  passwordValidation,
  titleHasHtml,
} from '../../src/shared/utils/validation/input.helpers';
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from '../../src/constants/app.constants';

describe('sanitizeInput', () => {
  it('trims leading and trailing whitespace', () => {
    expect(sanitizeInput('  hello world  ')).toBe('hello world');
  });
});

describe('capitalizeFirstLetter', () => {
  it('uppercases only the first character', () => {
    expect(capitalizeFirstLetter('new york')).toBe('New york');
  });

  it('returns falsy input unchanged', () => {
    expect(capitalizeFirstLetter('')).toBe('');
  });
});

describe('getChangedFields', () => {
  it('returns only the keys whose values differ', () => {
    const previous = { firstName: 'Jane', lastName: 'Doe', age: 30 };
    const next = { firstName: 'Jane', lastName: 'Smith', age: 31 };

    expect(getChangedFields(previous, next, ['firstName', 'lastName', 'age'])).toEqual([
      'lastName',
      'age',
    ]);
  });

  it('returns an empty array when nothing changed', () => {
    const previous = { firstName: 'Jane' };
    const next = { firstName: 'Jane' };

    expect(getChangedFields(previous, next, ['firstName'])).toEqual([]);
  });
});

describe('getVisibleValidationErrors', () => {
  const errors = { email: 'Email is required.', password: 'Password is required.' };

  it('only surfaces errors for touched fields by default', () => {
    const touched = { email: true, password: false };

    expect(getVisibleValidationErrors(errors, touched, false)).toEqual({
      email: 'Email is required.',
    });
  });

  it('surfaces every error when showAllErrors is true, regardless of touch state', () => {
    const touched = { email: false, password: false };

    expect(getVisibleValidationErrors(errors, touched, true)).toEqual(errors);
  });
});

describe('websiteLinkValidation', () => {
  const schema = websiteLinkValidation();

  it('accepts an empty string (optional field)', () => {
    expect(schema.safeParse('').success).toBe(true);
  });

  it('accepts a bare domain', () => {
    expect(schema.safeParse('example.com').success).toBe(true);
  });

  it('accepts a full URL with protocol and path', () => {
    expect(schema.safeParse('https://example.com/careers').success).toBe(true);
  });

  it('rejects a value with no dot', () => {
    expect(schema.safeParse('not-a-url').success).toBe(false);
  });
});

describe('nameValidation', () => {
  const schema = nameValidation({ label: 'First Name' });

  it('rejects an empty value when required', () => {
    const result = schema.safeParse('');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('First Name is required.');
    }
  });

  it('allows an empty value when not required', () => {
    const optionalSchema = nameValidation({ label: 'Middle name', required: false });
    expect(optionalSchema.safeParse('').success).toBe(true);
  });

  it('rejects a single character', () => {
    const result = schema.safeParse('J');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('at least 2 characters');
    }
  });

  it('rejects more than 100 characters', () => {
    const result = schema.safeParse('a'.repeat(101));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('cannot exceed 100 characters');
    }
  });

  it('accepts a normal name and collapses internal whitespace', () => {
    expect(schema.safeParse('Jane   Doe').success).toBe(true);
  });
});

describe('getFormEmailValidationError', () => {
  it('flags an empty email as required', () => {
    expect(getFormEmailValidationError('')).toBe('Email is required.');
  });

  it('flags an email with a space', () => {
    expect(getFormEmailValidationError('jane doe@example.com')).toBe(
      'Enter a valid email address.'
    );
  });

  it('flags a malformed email', () => {
    expect(getFormEmailValidationError('not-an-email')).toBe('Enter a valid email address.');
  });

  it('returns null for a valid email', () => {
    expect(getFormEmailValidationError('jane.doe@example.com')).toBeNull();
  });
});

describe('emailValidation', () => {
  const schema = emailValidation();

  it('accepts a valid email', () => {
    expect(schema.safeParse('jane.doe@example.com').success).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(schema.safeParse('invalid').success).toBe(false);
  });
});

describe('passwordValidation', () => {
  const schema = passwordValidation();

  it('rejects an empty password', () => {
    const result = schema.safeParse('');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Password is required.');
    }
  });

  it('rejects a password with no character-class variety even if it meets the length policy', () => {
    // Composition rules (uppercase/lowercase/number/special) were re-added
    // on top of length when MAX_PASSWORD_LENGTH was capped at 16 — see
    // passwordPolicy.ts's own comment: NIST's "skip composition" advice
    // assumes a long passphrase is available as a fallback, and a 16-char
    // cap removes that option. authentication-service's PasswordPolicy
    // mirrors this exactly, so a length-only password fails there too.
    const result = schema.safeParse('lowercaseonly');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('uppercase letter');
    }
  });

  it('accepts a password that satisfies both length and every composition rule', () => {
    const result = schema.safeParse('Valid1!Pass');
    expect(result.success).toBe(true);
  });

  it('rejects a password shorter than MIN_PASSWORD_LENGTH', () => {
    const result = schema.safeParse('Sh1!');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        `${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters long`
      );
    }
  });

  it('rejects a password longer than MAX_PASSWORD_LENGTH', () => {
    const result = schema.safeParse('ThisPasswordIsWayTooLong1!');
    expect(result.success).toBe(false);
    if (!result.success) {
      // Same range check both directions — too short and too long fail the
      // same "length" requirement with the same message, there's no
      // separate over-length wording.
      expect(result.error.issues[0].message).toContain(
        `${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters long`
      );
    }
  });

  it('rejects control characters', () => {
    const result = schema.safeParse('Valid1!\x00Pass');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Password cannot contain control or non-printable characters.'
      );
    }
  });

  it('accepts a password meeting every requirement', () => {
    // 12+ characters — matches authentication-service's MIN_PASSWORD_LENGTH.
    expect(schema.safeParse('Valid1!Password').success).toBe(true);
  });
});

describe('titleHasHtml', () => {
  it('detects an HTML tag', () => {
    expect(titleHasHtml('<b>Senior Engineer</b>')).toBe(true);
  });

  it('returns false for plain text', () => {
    expect(titleHasHtml('Senior Engineer')).toBe(false);
  });
});
