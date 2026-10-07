import type { JobDetailsState } from '../../types';

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
};

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

  const { salary_min: min, salary_max: max, salary_period: period } = suggestions;
  if (period && (min != null || max != null)) {
    const prefix = period === 'annual' ? 'exempt' : 'nonExempt';
    const minField = `${prefix}MinSalary` as keyof JobDetailsState;
    const maxField = `${prefix}MaxSalary` as keyof JobDetailsState;
    const status = period === 'annual' ? 'true' : 'false';
    let salaryFilled = false;
    if (isBlank(current[minField]) && min != null) {
      add(minField, String(min), 'Salary');
      salaryFilled = true;
    }
    if (isBlank(current[maxField]) && max != null) {
      add(maxField, String(max), 'Salary');
      salaryFilled = true;
    }
    if (salaryFilled && !(current.exemptionStatus ?? []).includes(status)) {
      add('exemptionStatus', [...(current.exemptionStatus ?? []), status], 'Salary');
    }
  }

  const officeId = isBlank(current.officeLocation) ? suggestions.office_id : undefined;

  return { fills, officeId, labels };
};
