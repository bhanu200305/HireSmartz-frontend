import { describe, it, expect } from 'vitest';
import { skipsAiConsent } from '../../src/pages/ScheduleCalendarPage/consentRule';

describe('skipsAiConsent (the AI consent only fits AI-led rounds)', () => {
  it('skips it for in-person and live video panel rounds', () => {
    expect(skipsAiConsent('inperson')).toBe(true);
    expect(skipsAiConsent('video')).toBe(true);
    expect(skipsAiConsent('panel')).toBe(true);
    expect(skipsAiConsent(' InPerson ')).toBe(true);
  });

  it('still shows it for AI rounds, unknown values and older links with no value', () => {
    expect(skipsAiConsent('ai')).toBe(false);
    expect(skipsAiConsent('something-else')).toBe(false);
    expect(skipsAiConsent(undefined)).toBe(false);
    expect(skipsAiConsent(null)).toBe(false);
    expect(skipsAiConsent('')).toBe(false);
  });
});
