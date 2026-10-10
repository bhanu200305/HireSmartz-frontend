import { describe, it, expect } from 'vitest';
import { buildSaveJobDetailsPayload } from '../../../src/api/job-service/buildSaveJobDetailsPayload';
import type { SuggestedSkill } from '../../../src/api/job-service/JobOpenings/types';
import { SKILL_SOURCE } from '../../../src/api/job-service/sourceIds';

const SKILL_A = '11111111-1111-1111-1111-111111111111';
const SKILL_B = '22222222-2222-2222-2222-222222222222';

const suggestion = (overrides: Partial<SuggestedSkill> = {}): SuggestedSkill => ({
  skill_id: SKILL_A,
  skill_label: 'Python',
  category: null,
  suggested_skill_type: 'required',
  source_id: SKILL_SOURCE.AI_EXTRACTED,
  ...overrides,
});

describe('buildSaveJobDetailsPayload — skill source tagging', () => {
  it('tags a mandatory skill still in the suggestion list as AI extracted', () => {
    const result = buildSaveJobDetailsPayload({
      data: { mandatorySkills: [SKILL_A] },
      suggestedSkills: [suggestion({ source_id: SKILL_SOURCE.AI_EXTRACTED })],
    });

    expect(result.skills).toEqual([
      { skill_id: SKILL_A, skill_type: 'required', source_id: SKILL_SOURCE.AI_EXTRACTED },
    ]);
  });

  it('tags a title-mapped skill as title mapping', () => {
    const result = buildSaveJobDetailsPayload({
      data: { optionalSkills: [SKILL_A] },
      suggestedSkills: [
        suggestion({
          suggested_skill_type: 'optional',
          source_id: SKILL_SOURCE.TITLE_MAPPING,
        }),
      ],
    });

    expect(result.skills).toEqual([
      { skill_id: SKILL_A, skill_type: 'optional', source_id: SKILL_SOURCE.TITLE_MAPPING },
    ]);
  });

  it('leaves source_id undefined for a skill not in the suggestion list', () => {
    const result = buildSaveJobDetailsPayload({
      data: { mandatorySkills: [SKILL_B] },
      suggestedSkills: [suggestion({ skill_id: SKILL_A })],
    });

    expect(result.skills).toEqual([
      { skill_id: SKILL_B, skill_type: 'required', source_id: undefined },
    ]);
  });

  it('leaves source_id undefined when no suggestions were passed at all', () => {
    const result = buildSaveJobDetailsPayload({ data: { mandatorySkills: [SKILL_A] } });

    expect(result.skills).toEqual([
      { skill_id: SKILL_A, skill_type: 'required', source_id: undefined },
    ]);
  });

  it('does not cross-match a suggestion of the wrong skill_type', () => {
    // Suggested as optional, but the recruiter put it in mandatorySkills.
    const result = buildSaveJobDetailsPayload({
      data: { mandatorySkills: [SKILL_A] },
      suggestedSkills: [suggestion({ suggested_skill_type: 'optional' })],
    });

    expect(result.skills).toEqual([
      { skill_id: SKILL_A, skill_type: 'required', source_id: undefined },
    ]);
  });
});

describe('buildSaveJobDetailsPayload — salary', () => {
  it('sends the typed amounts with their cents, not rounded', () => {
    const result = buildSaveJobDetailsPayload({
      data: {
        nonExemptMinSalary: '16.90',
        nonExemptMaxSalary: '21.45',
        exemptMinSalary: '85000.50',
        exemptMaxSalary: '95000',
      },
      suggestedSkills: [],
    });

    expect(result.non_exempt_lower_salary_range).toBe(16.9);
    expect(result.non_exempt_upper_salary_range).toBe(21.45);
    expect(result.exempt_lower_salary_range).toBe(85000.5);
    expect(result.exempt_upper_salary_range).toBe(95000);
  });

  it('sends the referral bonus with its cents', () => {
    const result = buildSaveJobDetailsPayload({
      data: { referralBonus: '100.50' },
      suggestedSkills: [],
    });

    expect(result.referral_bonus).toBe(100.5);
  });
});
