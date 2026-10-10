import { describe, it, expect } from 'vitest';
import { QUESTION_SOURCE, SKILL_SOURCE } from '../../../src/api/job-service/sourceIds';

describe('source ids', () => {
  it('match the backend master_question_source rows', () => {
    expect(QUESTION_SOURCE).toEqual({ MANUAL: 0, AI_GENERATED: 1 });
  });

  it('match the backend master_skill_source rows', () => {
    expect(SKILL_SOURCE).toEqual({ MANUAL: 0, TITLE_MAPPING: 1, AI_EXTRACTED: 2 });
  });
});
