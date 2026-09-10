/**
 * Fallback labels/descriptions/default weights/colors for scoring
 * categories, keyed by category_code. The API's own live values (from
 * master_scoring_category) take priority wherever available.
 */

export type ScoringCategoryMeta = Record<
  string,
  { label: string; description: string; defaultPct: number; color: string }
>;

export const RESUME_CATEGORY_META: ScoringCategoryMeta = {
  SKILLS_MATCH: {
    label: 'Skills Match',
    description: 'Match between candidate skills and JD requirements',
    defaultPct: 40,
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
    defaultPct: 10,
    color: '#14b8a6',
  },
};

export const INTERVIEW_CATEGORY_META: ScoringCategoryMeta = {
  SKILLS_MATCH: {
    label: 'Skills Match',
    description: 'Technical skills, soft skills, and communication',
    defaultPct: 40,
    color: '#22c55e',
  },
  QUALIFICATIONS: {
    label: 'Qualifications',
    description: 'Education, qualifications, experience',
    defaultPct: 15,
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
    defaultPct: 10,
    color: '#22c55e',
  },
  COMPANY_FIT: {
    label: 'Company Fit',
    description: 'Cultural alignment, role understanding',
    defaultPct: 15,
    color: '#f59e0b',
  },
};
