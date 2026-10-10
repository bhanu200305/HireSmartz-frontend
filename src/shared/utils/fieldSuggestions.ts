import type { JobDetailsState } from '../../types';
import { toMoneyString } from './money';

/** Values the "Fill with AI" helper found; a key exists only where a match was found. */
export type FieldSuggestions = {
  job_title_id?: string;
  department_id?: string;
  job_type_id?: string;
  mode_id?: string;
  shift_id?: string;
  education_preference_id?: string;
  office_id?: string;
  vacancies?: number;
  min_experience?: number;
  max_experience?: number;
  salary_min?: number;
  salary_max?: number;
  salary_period?: 'annual' | 'hourly';
  responsibilities?: string | null;
  other_requirements?: string | null;
  benefits?: string | null;
  required_skill_ids?: string[];
  optional_skill_ids?: string[];
  /** Skill id -> label, for the skill ids above. */
  skill_labels?: Record<string, string>;
  /** Names the AI gave that matched nothing: one name per field, and `skills` as a list. */
  unresolved?: Record<string, string | string[]>;
  /** A message for each AI text left out because it was too long, keyed by field. */
  field_errors?: Record<string, string>;
};

/** The unresolved names that can be shown in the "create it?" banner (skills are a list, so not). */
export const unresolvedFieldNames = (suggestions: FieldSuggestions): Record<string, string> =>
  Object.fromEntries(
    Object.entries(suggestions.unresolved ?? {}).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    )
  );

/** The label to show for each skill id, skipping ids with no label. */
export const skillLabelEntries = (
  ids: string[],
  labels: Record<string, string> | undefined
): { id: string; name: string }[] =>
  ids.filter((id) => labels?.[id]).map((id) => ({ id, name: labels![id] }));

/** The messages to show for texts the AI wrote but could not fill. */
export const fieldErrorMessages = (suggestions: FieldSuggestions): string[] =>
  Object.values(suggestions.field_errors ?? {});

export type FieldFill = { field: keyof JobDetailsState; value: unknown; label: string };

export type FieldFillPlan = { fills: FieldFill[]; officeId?: string; labels: string[] };

const isBlank = (value: unknown): boolean =>
  value == null || value === '' || (Array.isArray(value) && value.length === 0);

/** What to put on the form: only fields that are blank right now, never a typed value. */
export const planFieldFills = (
  suggestions: FieldSuggestions,
  current: Partial<JobDetailsState>
): FieldFillPlan => {
  const fills: FieldFill[] = [];
  const labels: string[] = [];
  const add = (field: keyof JobDetailsState, value: unknown, label: string) => {
    fills.push({ field, value, label });
    if (!labels.includes(label)) labels.push(label);
  };

  const departmentWillBeSet = !isBlank(current.department) || !!suggestions.department_id;
  if (isBlank(current.department) && suggestions.department_id) {
    add('department', [suggestions.department_id], 'Department');
  }
  if (isBlank(current.jobTitle) && suggestions.job_title_id && departmentWillBeSet) {
    add('jobTitle', [suggestions.job_title_id], 'Job title');
  }
  if (isBlank(current.jobType) && suggestions.job_type_id) {
    add('jobType', [suggestions.job_type_id], 'Job type');
  }
  if (isBlank(current.jobMode) && suggestions.mode_id) {
    add('jobMode', [suggestions.mode_id], 'Work mode');
  }
  if (isBlank(current.shift) && suggestions.shift_id) {
    add('shift', [suggestions.shift_id], 'Shift');
  }
  if (isBlank(current.educationPreference) && suggestions.education_preference_id) {
    add('educationPreference', [suggestions.education_preference_id], 'Education preference');
  }
  if (isBlank(current.openings) && suggestions.vacancies != null) {
    add('openings', suggestions.vacancies, 'Vacancies');
  }
  if (isBlank(current.minExperience) && suggestions.min_experience != null) {
    add('minExperience', suggestions.min_experience, 'Minimum experience');
  }
  if (isBlank(current.maxExperience) && suggestions.max_experience != null) {
    add('maxExperience', suggestions.max_experience, 'Maximum experience');
  }

  if (isBlank(current.responsibilities) && suggestions.responsibilities) {
    add('responsibilities', suggestions.responsibilities, 'Responsibilities');
  }
  if (isBlank(current.otherRequirements) && suggestions.other_requirements) {
    add('otherRequirements', suggestions.other_requirements, 'Other requirements');
  }
  if (isBlank(current.benefits) && suggestions.benefits) {
    add('benefits', suggestions.benefits, 'Benefits');
  }

  // A skill already picked, as required or optional, is never added again.
  const taken = new Set(
    [...(current.mandatorySkills ?? []), ...(current.optionalSkills ?? [])].map(String)
  );
  const newRequired = (suggestions.required_skill_ids ?? []).filter((id) => !taken.has(id));
  const newOptional = (suggestions.optional_skill_ids ?? []).filter(
    (id) => !taken.has(id) && !newRequired.includes(id)
  );
  if (isBlank(current.mandatorySkills) && newRequired.length > 0) {
    add('mandatorySkills', newRequired, 'Required skills');
  }
  if (isBlank(current.optionalSkills) && newOptional.length > 0) {
    add('optionalSkills', newOptional, 'Optional skills');
  }

  const { salary_min: min, salary_max: max, salary_period: period } = suggestions;
  if (period && (min != null || max != null)) {
    const prefix = period === 'annual' ? 'exempt' : 'nonExempt';
    const minField = `${prefix}MinSalary` as keyof JobDetailsState;
    const maxField = `${prefix}MaxSalary` as keyof JobDetailsState;
    const status = period === 'annual' ? 'true' : 'false';
    let salaryFilled = false;
    if (isBlank(current[minField]) && min != null) {
      add(minField, toMoneyString(min), 'Salary');
      salaryFilled = true;
    }
    if (isBlank(current[maxField]) && max != null) {
      add(maxField, toMoneyString(max), 'Salary');
      salaryFilled = true;
    }
    if (salaryFilled && !(current.exemptionStatus ?? []).includes(status)) {
      add('exemptionStatus', [...(current.exemptionStatus ?? []), status], 'Salary');
    }
  }

  const officeId = isBlank(current.officeLocation) ? suggestions.office_id : undefined;

  return { fills, officeId, labels };
};
