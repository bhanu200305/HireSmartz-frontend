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

const normalizeId = (value: string | null | undefined): string | null =>
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
  normalizeId(next.shiftId) !== normalizeId(current.shiftId) ||
  normalizeId(next.jobTypeId) !== normalizeId(current.jobTypeId) ||
  normalizeId(next.educationPreferenceId) !== normalizeId(current.educationPreferenceId) ||
  normalizeText(next.locationCity) !== normalizeText(current.locationCity) ||
  normalizeText(next.locationState) !== normalizeText(current.locationState) ||
  normalizeText(next.locationCountry) !== normalizeText(current.locationCountry) ||
  !sameIdSet(next.skillIds, current.skillIds);

// Fields the AI Job Description screen may write back into Job Details.
// Excludes job title/department/shift/job type/education preference/
// location — those are catalogue-bound, never AI-settable.
export type AiOwnedJdFields = {
  responsibilities?: string | null;
  otherRequirements?: string | null;
  minExperience?: number | string | null;
  maxExperience?: number | string | null;
  minSalary?: number | string | null;
  maxSalary?: number | string | null;
  // Extraction-only, never AI-composed — don't add to JdDescriptionInputs above.
  vacancies?: number | string | null;
};

export type AiOwnedJdFieldUpdates = {
  responsibilities?: string;
  otherRequirements?: string;
  minExperience?: number;
  maxExperience?: number;
  minSalary?: string;
  maxSalary?: string;
  vacancies?: number;
};

/** Only the fields where the backend's value is real and differs from
 * the form's current one — safe to apply on mount. */
export const diffAiOwnedFields = (
  fresh: AiOwnedJdFields,
  current: AiOwnedJdFields
): AiOwnedJdFieldUpdates => {
  const updates: AiOwnedJdFieldUpdates = {};
  if (
    fresh.responsibilities &&
    normalizeText(fresh.responsibilities) !== normalizeText(current.responsibilities)
  ) {
    updates.responsibilities = fresh.responsibilities;
  }
  if (
    fresh.otherRequirements &&
    normalizeText(fresh.otherRequirements) !== normalizeText(current.otherRequirements)
  ) {
    updates.otherRequirements = fresh.otherRequirements;
  }
  if (
    fresh.minExperience != null &&
    normalizeNumber(fresh.minExperience) !== normalizeNumber(current.minExperience)
  ) {
    updates.minExperience = Number(fresh.minExperience);
  }
  if (
    fresh.maxExperience != null &&
    normalizeNumber(fresh.maxExperience) !== normalizeNumber(current.maxExperience)
  ) {
    updates.maxExperience = Number(fresh.maxExperience);
  }
  if (
    fresh.minSalary != null &&
    normalizeNumber(fresh.minSalary) !== normalizeNumber(current.minSalary)
  ) {
    updates.minSalary = String(fresh.minSalary);
  }
  if (
    fresh.maxSalary != null &&
    normalizeNumber(fresh.maxSalary) !== normalizeNumber(current.maxSalary)
  ) {
    updates.maxSalary = String(fresh.maxSalary);
  }
  if (
    fresh.vacancies != null &&
    normalizeNumber(fresh.vacancies) !== normalizeNumber(current.vacancies)
  ) {
    updates.vacancies = Number(fresh.vacancies);
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
