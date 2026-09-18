import { describe, expect, it } from 'vitest';
import { editCandidateSchema } from '../../../../src/components/JobsOpening/Candidates/EditCandidateSchema';

const basePayload = {
  firstName: 'Jane',
  lastName: 'Doe',
  countryCode: '+1',
  phoneNumber: '2015550123',
  email: 'jane.doe@example.com',
  education: "Bachelor's Degree",
  address: 'San Francisco, CA',
};

describe('editCandidateSchema', () => {
  it('accepts a complete, valid candidate edit', () => {
    expect(editCandidateSchema.safeParse(basePayload).success).toBe(true);
  });

  it('requires a country code', () => {
    const result = editCandidateSchema.safeParse({ ...basePayload, countryCode: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.countryCode?.[0]).toBe('Country code is required.');
    }
  });

  it('rejects a phone number invalid for the selected country', () => {
    const result = editCandidateSchema.safeParse({ ...basePayload, phoneNumber: '12345' });
    expect(result.success).toBe(false);
  });

  it('requires education and address', () => {
    const missingEducation = editCandidateSchema.safeParse({ ...basePayload, education: '' });
    expect(missingEducation.success).toBe(false);
    if (!missingEducation.success) {
      expect(missingEducation.error.flatten().fieldErrors.education?.[0]).toBe(
        'Qualification is required.'
      );
    }

    const missingAddress = editCandidateSchema.safeParse({ ...basePayload, address: '' });
    expect(missingAddress.success).toBe(false);
    if (!missingAddress.success) {
      expect(missingAddress.error.flatten().fieldErrors.address?.[0]).toBe(
        'Candidate Location is required.'
      );
    }
  });

  it('accepts an omitted communication language and skills list', () => {
    expect(editCandidateSchema.safeParse(basePayload).success).toBe(true);
  });

  it('accepts a valid communication language and rejects an unsupported one', () => {
    expect(
      editCandidateSchema.safeParse({ ...basePayload, candidateCommunicationLanguage: 'es' })
        .success
    ).toBe(true);
    expect(
      editCandidateSchema.safeParse({ ...basePayload, candidateCommunicationLanguage: 'fr' })
        .success
    ).toBe(false);
  });
});
