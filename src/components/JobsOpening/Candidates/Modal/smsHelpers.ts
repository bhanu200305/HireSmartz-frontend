import { formatPhoneNumber } from '../../../../shared/utils/methods';
import type { CandidateByIdResponse } from '../../../../types';

/** National mobile number length (digits in `phoneNumber`, excluding country code). */
export const SMS_NATIONAL_DIGIT_COUNT = 10;

/** E.164 subscriber number max length (country + national). */
const SMS_MAX_TOTAL_DIGITS = 15;

export function jobTitleFromCandidate(c: CandidateByIdResponse): string {
  const jobTitle = (c as { jobTitle?: string }).jobTitle?.trim();
  if (jobTitle) return jobTitle;
  const applied = (c as { appliedPosition?: string }).appliedPosition?.trim();
  if (applied) return applied;
  const roundName = c.nextRoundDetails?.nextRound?.round?.name?.trim();
  if (roundName) return roundName;
  if (c.currentJobTitle?.trim()) return c.currentJobTitle.trim();
  return 'the position';
}

/** True when `nationalDigits` is exactly 10 digits (local mobile number). */
export function isValidSmsPhoneDigits(nationalDigits: string): boolean {
  return nationalDigits.length === SMS_NATIONAL_DIGIT_COUNT && /^\d+$/.test(nationalDigits);
}

/**
 * Validates a dial target like `+9198…` or `+1987…`.
 * Accepts exactly 10 digits total, or 11–15 digits where the last 10 are the national mobile.
 */
export function isValidSmsPhoneTarget(target: string): boolean {
  const digits = target.replace(/\D/g, '');
  if (digits.length === SMS_NATIONAL_DIGIT_COUNT) {
    return /^\d{10}$/.test(digits);
  }
  if (digits.length < SMS_NATIONAL_DIGIT_COUNT || digits.length > SMS_MAX_TOTAL_DIGITS) {
    return false;
  }
  const national = digits.slice(-SMS_NATIONAL_DIGIT_COUNT);
  return isValidSmsPhoneDigits(national);
}

export type SmsInfoForCandidate = {
  canSms: boolean;
  smsPhoneTarget: string;
  smsPhoneDisplay: string;
  /** Has some digits on file but they fail length/format rules (show as invalid in bulk SMS). */
  hasInvalidPhone: boolean;
};

export function getSmsInfoForCandidate(candidate: any): SmsInfoForCandidate {
  const nationalDigits = String(candidate?.phoneNumber ?? '').replace(/\D/g, '');
  const formattedPhone = formatPhoneNumber(nationalDigits);
  const display =
    [candidate?.countryCode, formattedPhone].filter(Boolean).join(' ').trim() ||
    formattedPhone ||
    '';

  if (nationalDigits.length === 0) {
    return {
      canSms: false,
      smsPhoneTarget: '',
      smsPhoneDisplay: display,
      hasInvalidPhone: false,
    };
  }

  if (!isValidSmsPhoneDigits(nationalDigits)) {
    return {
      canSms: false,
      smsPhoneTarget: '',
      smsPhoneDisplay: display,
      hasInvalidPhone: true,
    };
  }

  const countryDigits = String(candidate?.countryCode ?? '').replace(/\D/g, '');
  const fullDigits = countryDigits ? `${countryDigits}${nationalDigits}` : nationalDigits;
  const target = `+${fullDigits}`;

  if (!isValidSmsPhoneTarget(target)) {
    return {
      canSms: false,
      smsPhoneTarget: '',
      smsPhoneDisplay: display,
      hasInvalidPhone: true,
    };
  }

  return {
    canSms: true,
    smsPhoneTarget: target,
    smsPhoneDisplay: display || target,
    hasInvalidPhone: false,
  };
}

export function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
}

export function candidateDisplayName(candidate: any): string {
  const n = `${(candidate?.firstName ?? '').trim()} ${(candidate?.lastName ?? '').trim()}`.trim();
  return toTitleCase(n) || 'Candidate';
}
