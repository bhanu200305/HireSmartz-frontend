import { describe, it, expect } from 'vitest';
import { getSmsBlockedReason } from '../../../../src/components/JobsOpening/Candidates/candidateDisplay';
import { describeSkippedReason } from '../../../../src/components/JobsOpening/Candidates/Modal/messageSkipReasons';

describe('getSmsBlockedReason (SMS is on unless the candidate opted out)', () => {
  it('allows SMS when there is a phone and no opt-out, whatever the old consent field says', () => {
    expect(getSmsBlockedReason({ contact_no: '+19252065400' })).toBeNull();
    expect(getSmsBlockedReason({ contact_no: '+19252065400', sms_opted_out_at: null })).toBeNull();
    expect(
      getSmsBlockedReason({ contact_no: '+19252065400', sms_opted_out_at: undefined })
    ).toBeNull();
  });

  it('blocks SMS once the candidate has opted out', () => {
    expect(
      getSmsBlockedReason({ contact_no: '+19252065400', sms_opted_out_at: '2026-10-08T10:00:00Z' })
    ).toBe('Candidate opted out of SMS');
  });

  it('blocks SMS without a phone number, ahead of any opt-out message', () => {
    expect(getSmsBlockedReason({ contact_no: null })).toBe('No phone number on file');
    expect(getSmsBlockedReason({ contact_no: '', sms_opted_out_at: '2026-10-08T10:00:00Z' })).toBe(
      'No phone number on file'
    );
    expect(getSmsBlockedReason(undefined)).toBe('No phone number on file');
  });
});

describe('bulk SMS skip reasons', () => {
  it('shows readable text for the renamed sms_opted_out reason', () => {
    expect(describeSkippedReason('sms_opted_out')).toBe('Candidate opted out of SMS');
  });

  it('explains when SMS consent could not be checked but the email still went out', () => {
    expect(describeSkippedReason('sms_consent_unavailable')).toBe(
      "Couldn't check SMS consent. Email was still sent."
    );
  });

  it('labels an explicit duplicate reason', () => {
    expect(describeSkippedReason('duplicate')).toBe('Already sent a moment ago.');
  });

  it('keeps the old no_sms_consent label harmlessly', () => {
    expect(describeSkippedReason('no_sms_consent')).toBe('Candidate has not given SMS consent');
  });
});
