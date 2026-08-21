/**
 * The Resume/Interview scoring category catalogue — labels, descriptions,
 * standard default weights, and slider colors.
 *
 * Category NAMES (the object keys) mirror job-service's real domain enums
 * (`ResumeScoringCategory`/`InterviewScoringCategory` in
 * app/modules/jobs/domain/enums/scoring_category.py) and the `defaultPct`
 * values mirror its `_STANDARD_RESUME_WEIGHTS`/`_STANDARD_INTERVIEW_WEIGHTS`
 * seed constants — these are the only real "Resume/Interview scoring
 * categories" defined anywhere in the codebase, so both this page and
 * JobScoringCriteriaTab.tsx (per-job scoring) draw from the same list
 * rather than each inventing their own.
 *
 * Single source of truth: shared by JobScoringCriteriaTab.tsx (per-job) and
 * CompanySettings/PlatformScoringDefaultsTab.tsx (platform/company default)
 * so the two pages can never drift apart on labels, colors, or defaults.
 */

export type ScoringCategoryMeta = Record<
  string,
  { label: string; description: string; defaultPct: number; color: string }
>;

export const RESUME_CATEGORY_META: ScoringCategoryMeta = {
  SKILLS_MATCH: {
    label: 'Skills Match',
    description: 'Match between candidate skills and JD requirements',
    defaultPct: 30,
    color: '#22c55e',
  },
  EXPERIENCE_MATCH: {
    label: 'Experience Match',
    description: 'Relevance and depth of professional experience',
    defaultPct: 30,
    color: '#6366f1',
  },
  QUALIFICATIONS: {
    label: 'Qualifications',
    description: 'Education, certifications, formal qualifications',
    defaultPct: 20,
    color: '#f97316',
  },
  KEYWORD_PRESENCE: {
    label: 'Keyword Presence',
    description: 'Presence of key JD-specific terms',
    defaultPct: 20,
    color: '#14b8a6',
  },
};

export const INTERVIEW_CATEGORY_META: ScoringCategoryMeta = {
  SKILLS: {
    label: 'Skills Match',
    description: 'Technical skills, soft skills, and communication',
    defaultPct: 25,
    color: '#22c55e',
  },
  QUALIFICATIONS: {
    label: 'Qualifications',
    description: 'Education, qualifications, experience',
    defaultPct: 20,
    color: '#6366f1',
  },
  PERSONALITY_TRAITS: {
    label: 'Personality Traits',
    description: 'Behavioral traits, adaptability, teamwork',
    defaultPct: 20,
    color: '#f97316',
  },
  CAREER_GOALS: {
    label: 'Career Goals',
    description: 'Motivation, growth mindset, aspirations',
    defaultPct: 20,
    color: '#22c55e',
  },
  COMPANY_FIT: {
    label: 'Company Fit',
    description: 'Cultural alignment, role understanding',
    defaultPct: 15,
    color: '#f59e0b',
  },
};
