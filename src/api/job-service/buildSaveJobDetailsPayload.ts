import type { SaveJobDetailsRequest, JobSkillPayload, JobLocationPayload } from './types';
import type { JobDetailsState } from '../../types';
import type { TenantOffice } from '../organization-service/Tenants/offices';
import type { SuggestedSkill } from './JobOpenings/types';
import { toMoneyOrNull } from '../../shared/utils/money';
import { SKILL_SOURCE } from './sourceIds';

type BuildSaveDetailsArgs = {
  data: Partial<JobDetailsState> & {
    locationId?: string | number;
    shiftId?: string;
    modeId?: string;
    requirements?: string;
  };
  offices?: TenantOffice[];
  // Tags each skill's source (title mapping / AI extracted) if it's still
  // a live suggestion, else defaults to manual.
  suggestedSkills?: SuggestedSkill[];
};

const suggestionSourceFor = (
  skillId: string,
  skillType: 'required' | 'optional',
  suggestedSkills: SuggestedSkill[]
): JobSkillPayload['source_id'] => {
  const match = suggestedSkills.find(
    (s) => String(s.skill_id) === skillId && s.suggested_skill_type.toLowerCase() === skillType
  );
  if (!match) return undefined;
  return match.source_id === SKILL_SOURCE.AI_EXTRACTED
    ? SKILL_SOURCE.AI_EXTRACTED
    : SKILL_SOURCE.TITLE_MAPPING;
};

const firstId = (value: unknown): string | null => {
  if (Array.isArray(value) && value.length > 0) {
    const item = value[0];
    if (item == null || item === '') return null;
    return String(item);
  }
  if (typeof value === 'string' && value) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
};

const toIdList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
};

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const uuidOrNull = (value: unknown): string | null => {
  const id = firstId(value);
  return id && isUuid(id) ? id : null;
};

const toIsoDateTime = (value: unknown): string | null => {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  const ddMmYyyy = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddMmYyyy) {
    const [, day, month, year] = ddMmYyyy;
    return `${year}-${month}-${day}T00:00:00.000Z`;
  }
  const yyyyMmDd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyyMmDd) {
    return `${raw}T00:00:00.000Z`;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

/**
 * Map the wizard form state onto PUT /job-openings/{id}/details.
 * education_preference_id/language_ids are catalogue references, not free
 * text — skills/locations are structured rows.
 */
export const buildSaveJobDetailsPayload = ({
  data,
  offices = [],
  suggestedSkills = [],
}: BuildSaveDetailsArgs): SaveJobDetailsRequest => {
  const officeId =
    firstId(data.officeLocation) || (data.locationId != null ? String(data.locationId) : null);
  const office = offices.find((o) => o.office_id === officeId);

  const locations: JobLocationPayload[] = office
    ? [
        {
          job_location_id: isUuid(office.office_id) ? office.office_id : null,
          address_line_1: office.address_line_1,
          address_line_2: office.address_line_2,
          city: office.city,
          state: office.state,
          country: office.country,
          zip: office.zip_code,
          location_code: office.location_code,
        },
      ]
    : officeId && isUuid(officeId)
      ? [{ job_location_id: officeId }]
      : [];

  const mandatory: JobSkillPayload[] = toIdList(data.mandatorySkills)
    .filter(isUuid)
    .map((skill_id) => ({
      skill_id,
      skill_type: 'required',
      source_id: suggestionSourceFor(skill_id, 'required', suggestedSkills),
    }));
  const optional: JobSkillPayload[] = toIdList(data.optionalSkills)
    .filter(isUuid)
    .map((skill_id) => ({
      skill_id,
      skill_type: 'optional',
      source_id: suggestionSourceFor(skill_id, 'optional', suggestedSkills),
    }));

  return {
    job_title_id: uuidOrNull(data.jobTitle),
    department_id: uuidOrNull(data.department),
    // `shift` (array-of-one) is the real form field; shiftId is a fallback.
    shift_id:
      uuidOrNull(data.shift) ?? (data.shiftId && isUuid(data.shiftId) ? data.shiftId : null),
    // `jobMode` (array-of-one) is the real form field; modeId is a fallback.
    mode_id: uuidOrNull(data.jobMode) ?? (data.modeId && isUuid(data.modeId) ? data.modeId : null),
    job_type_id: uuidOrNull(data.jobType),
    hiring_manager_ids: toIdList(data.hiringManagers).filter(isUuid),
    recruiter_ids: toIdList(data.recruiters).filter(isUuid),
    job_open_date: toIsoDateTime(data.openDate),
    job_close_date: toIsoDateTime(data.closeDate),
    vacancies: data.openings ?? null,
    min_experience_req: data.minExperience ?? null,
    max_experience_req: data.maxExperience ?? null,
    exempt_lower_salary_range: toMoneyOrNull(data.exemptMinSalary),
    exempt_upper_salary_range: toMoneyOrNull(data.exemptMaxSalary),
    non_exempt_lower_salary_range: toMoneyOrNull(data.nonExemptMinSalary),
    non_exempt_upper_salary_range: toMoneyOrNull(data.nonExemptMaxSalary),
    referral_bonus: toMoneyOrNull(data.referralBonus),
    responsibilities: data.responsibilities || null,
    requirements: data.requirements || null,
    other_requirements: data.otherRequirements || null,
    benefits: data.benefits || null,
    education_preference_id: uuidOrNull(data.educationPreference),
    use_culture_intro: Boolean(data.useCultureIntro),
    language_ids: toIdList(data.languages).filter(isUuid),
    locations,
    skills: [...mandatory, ...optional],
  };
};
