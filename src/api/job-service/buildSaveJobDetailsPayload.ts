import type { SaveJobDetailsRequest, JobSkillPayload, JobLocationPayload } from './types';
import type { JobDetailsState } from '../../types';
import type { TenantOffice } from '../organization-service/Tenants/offices';

type BuildSaveDetailsArgs = {
  data: Partial<JobDetailsState> & {
    locationId?: string | number;
    shiftId?: string;
    modeId?: string;
    isExempted?: boolean;
    communicationSkills?: string;
    requirements?: string;
  };
  offices?: TenantOffice[];
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

const toIntOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
};

/**
 * Map the wizard form state onto PUT /job-openings/{id}/details.
 * education_preference_id/language_ids are catalogue references (migration
 * 0014 — organization_education_preference/master_language), not free
 * text — skills/locations are structured rows.
 */
export const buildSaveJobDetailsPayload = ({
  data,
  offices = [],
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
        },
      ]
    : officeId && isUuid(officeId)
      ? [{ job_location_id: officeId }]
      : [];

  const mandatory: JobSkillPayload[] = toIdList(data.mandatorySkills)
    .filter(isUuid)
    .map((skill_id) => ({
      skill_id,
      skill_type: 'mandatory',
    }));
  const optional: JobSkillPayload[] = toIdList(data.optionalSkills)
    .filter(isUuid)
    .map((skill_id) => ({
      skill_id,
      skill_type: 'optional',
    }));

  const isExempted =
    typeof data.isExempted === 'boolean'
      ? data.isExempted
      : data.exemptionStatus === true ||
        String(data.exemptionStatus) === 'true' ||
        Number(data.exemptionStatus) === 1;

  return {
    job_title_id: uuidOrNull(data.jobTitle),
    department_id: uuidOrNull(data.department),
    shift_id: data.shiftId && isUuid(data.shiftId) ? data.shiftId : null,
    mode_id: data.modeId && isUuid(data.modeId) ? data.modeId : null,
    job_type_id: uuidOrNull(data.jobType),
    hiring_manager_ids: toIdList(data.hiringManagers).filter(isUuid),
    recruiter_ids: toIdList(data.recruiters).filter(isUuid),
    job_open_date: toIsoDateTime(data.openDate),
    job_close_date: null,
    vacancies: data.openings ?? null,
    min_experience_req: data.minExperience ?? null,
    max_experience_req: data.maxExperience ?? null,
    lower_salary_range: toIntOrNull(data.minSalary),
    upper_salary_range: toIntOrNull(data.maxSalary),
    referral_bonus: toIntOrNull(data.referralBonus),
    responsibilities: data.responsibilities || null,
    requirements: data.requirements || null,
    other_requirements: data.otherRequirements || null,
    education_preference_id: uuidOrNull(data.educationPreference),
    communication_skills: data.communicationSkills || null,
    use_culture_intro: Boolean(data.useCultureIntro),
    language_ids: toIdList(data.languages).filter(isUuid),
    is_exempted: Boolean(isExempted),
    locations,
    skills: [...mandatory, ...optional],
  };
};
