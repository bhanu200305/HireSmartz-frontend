import { describe, it, expect } from 'vitest';
import { buildSaveJobDetailsPayload } from '../../../src/api/job-service/buildSaveJobDetailsPayload';
import type { SuggestedSkill } from '../../../src/api/job-service/JobOpenings/types';

const SKILL_A = '11111111-1111-1111-1111-111111111111';
const SKILL_B = '22222222-2222-2222-2222-222222222222';

const suggestion = (overrides: Partial<SuggestedSkill> = {}): SuggestedSkill => ({
  skill_id: SKILL_A,
  skill_label: 'Python',
  category: null,
  suggested_skill_type: 'required',
  source: 'AI_EXTRACTED',
  ...overrides,
});

describe('buildSaveJobDetailsPayload — skill source tagging', () => {
  it('tags a mandatory skill still in the suggestion list as ai_extracted', () => {
    const result = buildSaveJobDetailsPayload({
      data: { mandatorySkills: [SKILL_A] },
      suggestedSkills: [suggestion({ source: 'AI_EXTRACTED' })],
    });

    expect(result.skills).toEqual([
      { skill_id: SKILL_A, skill_type: 'required', source: 'ai_extracted' },
    ]);
  });

  it('tags a skill from TITLE_MAPPING as title_mapping', () => {
    const result = buildSaveJobDetailsPayload({
      data: { optionalSkills: [SKILL_A] },
      suggestedSkills: [suggestion({ suggested_skill_type: 'optional', source: 'TITLE_MAPPING' })],
    });

    expect(result.skills).toEqual([
      { skill_id: SKILL_A, skill_type: 'optional', source: 'title_mapping' },
    ]);
  });

  it('leaves source undefined for a skill not in the suggestion list', () => {
    const result = buildSaveJobDetailsPayload({
      data: { mandatorySkills: [SKILL_B] },
      suggestedSkills: [suggestion({ skill_id: SKILL_A })],
    });

    expect(result.skills).toEqual([
      { skill_id: SKILL_B, skill_type: 'required', source: undefined },
    ]);
  });

  it('leaves source undefined when no suggestions were passed at all', () => {
    const result = buildSaveJobDetailsPayload({ data: { mandatorySkills: [SKILL_A] } });

    expect(result.skills).toEqual([
      { skill_id: SKILL_A, skill_type: 'required', source: undefined },
    ]);
  });

  it('does not cross-match a suggestion of the wrong skill_type', () => {
    // Suggested as optional, but the recruiter put it in mandatorySkills.
    const result = buildSaveJobDetailsPayload({
      data: { mandatorySkills: [SKILL_A] },
      suggestedSkills: [suggestion({ suggested_skill_type: 'optional' })],
    });

    expect(result.skills).toEqual([
      { skill_id: SKILL_A, skill_type: 'required', source: undefined },
    ]);
  });
});
