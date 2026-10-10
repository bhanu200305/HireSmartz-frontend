// Ids of the backend's master_question_source and master_skill_source rows.
// The API sends and accepts these numbers, never a name.

export const QUESTION_SOURCE = { MANUAL: 0, AI_GENERATED: 1 } as const;

export const SKILL_SOURCE = { MANUAL: 0, TITLE_MAPPING: 1, AI_EXTRACTED: 2 } as const;

export type SkillSourceId = (typeof SKILL_SOURCE)[keyof typeof SKILL_SOURCE];
