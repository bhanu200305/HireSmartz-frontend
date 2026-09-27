/**
 * jdSync.ts — keeps the AI Job Description and Job Details in sync, both
 * directions. Shared by AddJobDescription/jobdetails.tsx,
 * EditJobOpening/EditJobDetail.tsx, and JobDescriptionPanel.tsx.
 */

export type JdDescriptionInputs = {
  minExperience?: number | string | null;
  maxExperience?: number | string | null;
  minSalary?: number | string | null;
  maxSalary?: number | string | null;
  responsibilities?: string | null;
  otherRequirements?: string | null;
  benefits?: string | null;
  shiftId?: string | null;
  jobTypeId?: string | null;
  educationPreferenceId?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  locationCountry?: string | null;
  skillIds?: string[];
};

const normalizeNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeText = (value: string | null | undefined): string => (value ?? '').trim();

const normalizeId = (value: string | number | null | undefined): string | null =>
  value ? String(value) : null;

// Order shouldn't matter for skill selection — compare as sets.
const sameIdSet = (a: string[] | undefined, b: string[] | undefined): boolean => {
  const setA = new Set((a ?? []).map(String));
  const setB = new Set((b ?? []).map(String));
  if (setA.size !== setB.size) return false;
  for (const id of setA) if (!setB.has(id)) return false;
  return true;
};

/** True when a field the AI description is generated from has changed. */
export const haveDescriptionInputsChanged = (
  next: JdDescriptionInputs,
  current: JdDescriptionInputs
): boolean =>
  normalizeNumber(next.minExperience) !== normalizeNumber(current.minExperience) ||
  normalizeNumber(next.maxExperience) !== normalizeNumber(current.maxExperience) ||
  normalizeNumber(next.minSalary) !== normalizeNumber(current.minSalary) ||
  normalizeNumber(next.maxSalary) !== normalizeNumber(current.maxSalary) ||
  normalizeText(next.responsibilities) !== normalizeText(current.responsibilities) ||
  normalizeText(next.otherRequirements) !== normalizeText(current.otherRequirements) ||
  normalizeText(next.benefits) !== normalizeText(current.benefits) ||
  normalizeId(next.shiftId) !== normalizeId(current.shiftId) ||
  normalizeId(next.jobTypeId) !== normalizeId(current.jobTypeId) ||
  normalizeId(next.educationPreferenceId) !== normalizeId(current.educationPreferenceId) ||
  normalizeText(next.locationCity) !== normalizeText(current.locationCity) ||
  normalizeText(next.locationState) !== normalizeText(current.locationState) ||
  normalizeText(next.locationCountry) !== normalizeText(current.locationCountry) ||
  !sameIdSet(next.skillIds, current.skillIds);

// Fields the AI Job Description screen may write back into Job Details.
// job_type/work_mode/shift/education_preference ARE AI-settable — job-service
// fuzzy-matches an AI guess against the org's catalogue and fills the id.
// Still excludes job title/department/location — those need extra
// server-side context (department mapping, office matching) this shared
// diff doesn't carry.
export type AiOwnedJdFields = {
  responsibilities?: string | null;
  otherRequirements?: string | null;
  benefits?: string | null;
  minExperience?: number | string | null;
  maxExperience?: number | string | null;
  minSalary?: number | string | null;
  maxSalary?: number | string | null;
  // Extraction-only, never AI-composed — don't add to JdDescriptionInputs above.
  vacancies?: number | string | null;
  // Form fields allow a numeric platform id alongside a string UUID (see
  // EditJobDetailsSchema.ts's catalogId) - normalizeId() below coerces
  // either to a string, so the comparison works regardless.
  jobTypeId?: string | number | null;
  jobModeId?: string | number | null;
  shiftId?: string | number | null;
  educationPreferenceId?: string | number | null;
  // A full snapshot, not a value to merge — see diffAiOwnedFields below.
  unresolvedAiSuggestions?: Record<string, string>;
};

export type AiOwnedJdFieldUpdates = {
  responsibilities?: string;
  otherRequirements?: string;
  benefits?: string;
  minExperience?: number;
  maxExperience?: number;
  minSalary?: string;
  maxSalary?: string;
  vacancies?: number;
  jobTypeId?: string | number;
  jobModeId?: string | number;
  shiftId?: string | number;
  educationPreferenceId?: string | number;
  unresolvedAiSuggestions?: Record<string, string>;
};

/** Only the fields still blank — never overwrites a value already there. */
export const diffAiOwnedFields = (
  fresh: AiOwnedJdFields,
  current: AiOwnedJdFields
): AiOwnedJdFieldUpdates => {
  const updates: AiOwnedJdFieldUpdates = {};
  if (fresh.responsibilities && !normalizeText(current.responsibilities)) {
    updates.responsibilities = fresh.responsibilities;
  }
  if (fresh.otherRequirements && !normalizeText(current.otherRequirements)) {
    updates.otherRequirements = fresh.otherRequirements;
  }
  if (fresh.benefits && !normalizeText(current.benefits)) {
    updates.benefits = fresh.benefits;
  }
  if (fresh.minExperience != null && normalizeNumber(current.minExperience) == null) {
    updates.minExperience = Number(fresh.minExperience);
  }
  if (fresh.maxExperience != null && normalizeNumber(current.maxExperience) == null) {
    updates.maxExperience = Number(fresh.maxExperience);
  }
  if (fresh.minSalary != null && normalizeNumber(current.minSalary) == null) {
    updates.minSalary = String(fresh.minSalary);
  }
  if (fresh.maxSalary != null && normalizeNumber(current.maxSalary) == null) {
    updates.maxSalary = String(fresh.maxSalary);
  }
  if (fresh.vacancies != null && normalizeNumber(current.vacancies) == null) {
    updates.vacancies = Number(fresh.vacancies);
  }
  if (fresh.jobTypeId && !normalizeId(current.jobTypeId)) {
    updates.jobTypeId = fresh.jobTypeId;
  }
  if (fresh.jobModeId && !normalizeId(current.jobModeId)) {
    updates.jobModeId = fresh.jobModeId;
  }
  if (fresh.shiftId && !normalizeId(current.shiftId)) {
    updates.shiftId = fresh.shiftId;
  }
  if (fresh.educationPreferenceId && !normalizeId(current.educationPreferenceId)) {
    updates.educationPreferenceId = fresh.educationPreferenceId;
  }
  // Metadata, not form content - always replaces wholesale.
  if (fresh.unresolvedAiSuggestions !== undefined) {
    updates.unresolvedAiSuggestions = fresh.unresolvedAiSuggestions;
  }
  return updates;
};

export type AiSyncedSkill = { skill_id: string; skill_label: string; skill_type: string };

/** New AI-added skills not already in the recruiter's selection, split by
 * type. Additive only — never removes an existing selection. */
export const mergeNewAiSkills = (
  freshSkills: AiSyncedSkill[] | undefined,
  currentMandatoryIds: string[],
  currentOptionalIds: string[]
): {
  newMandatoryIds: string[];
  newOptionalIds: string[];
  newOptions: { id: string; name: string }[];
} => {
  const newMandatoryIds: string[] = [];
  const newOptionalIds: string[] = [];
  const newOptions: { id: string; name: string }[] = [];
  for (const skill of freshSkills ?? []) {
    const id = String(skill.skill_id);
    if (currentMandatoryIds.includes(id) || currentOptionalIds.includes(id)) continue;
    if (newMandatoryIds.includes(id) || newOptionalIds.includes(id)) continue;
    if (skill.skill_type.toLowerCase() === 'required') {
      newMandatoryIds.push(id);
    } else {
      newOptionalIds.push(id);
    }
    newOptions.push({ id, name: skill.skill_label });
  }
  return { newMandatoryIds, newOptionalIds, newOptions };
};
