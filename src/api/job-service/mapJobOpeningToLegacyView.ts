import type { JobOpeningByIdResponse, JobDetailsState, InterviewRoundState } from '../../types';
import type { JobDetailsResponse, JobOpeningDetailResponse, InterviewRoundResponse } from './types';

type LegacyJobData = JobOpeningByIdResponse['data'];

const asId = (value: string | null | undefined): string => value || '';

const mapInterviewRounds = (
  rounds: InterviewRoundResponse[],
  jobId: string
): LegacyJobData['interviewRounds'] =>
  (rounds ?? []).map((round) => ({
    id: round.id as unknown as number,
    jobId: jobId as unknown as number,
    round: {
      id: round.round_id as unknown as number,
      name: round.round_name ?? '',
    },
    roundType: 'MANUAL',
    sequence: round.sequence,
    description: round.description ?? '',
    duration: round.duration,
    variant: round.variant,
    uniqueRoundIdentifier: round.id,
  }));

/**
 * Shape the GET /job-openings/{id} payload so existing view/edit screens
 * that read `jobData.data.*` keep compiling. Nested ids are UUID strings
 * (typed loosely as number in the legacy declaration).
 */
export const mapJobOpeningToLegacyView = (job: JobOpeningDetailResponse): LegacyJobData => {
  const details = job.details;
  const location = details?.locations?.[0];
  const mandatory = (details?.skills ?? []).filter(
    (s) => String(s.skill_type).toUpperCase() === 'MANDATORY'
  );
  const optional = (details?.skills ?? []).filter(
    (s) => String(s.skill_type).toUpperCase() !== 'MANDATORY'
  );

  return {
    id: job.org_job_opening_id as unknown as number,
    atsJobOpeningId: '',
    jobProfileCode: details?.job_profile_code ?? '',
    // Id only, name resolved separately against the shift catalogue.
    shiftId: details?.shift_id ?? null,
    openings: details?.vacancies ?? 0,
    minSalary: details?.lower_salary_range ?? 0,
    maxSalary: details?.upper_salary_range ?? 0,
    minExperience: Number(details?.min_experience_req ?? 0),
    maxExperience: Number(details?.max_experience_req ?? 0),
    languages: (details?.language_ids ?? []) as unknown as number[],
    useCultureIntro: details?.use_culture_intro,
    isDraft: job.is_draft,
    isClosed: job.is_closed,
    interviewedCandidateCount: 0,
    responsibilities: details?.responsibilities ?? '',
    otherRequirements: details?.other_requirements ?? '',
    communicationSkills: details?.communication_skills ?? '',
    referralBonus: details?.referral_bonus,
    hiringManagers: (details?.hiring_manager_ids ?? []) as unknown as number[],
    recruiters: (details?.recruiter_ids ?? []) as unknown as number[],
    hiringManager: null,
    recruiter: null,
    aiJobDescription: {
      id: job.org_job_opening_id as unknown as number,
      jobDescription: details?.jd ?? '',
      jobOpeningId: job.org_job_opening_id as unknown as number,
    },
    exemptionStatus: {
      id: (details?.is_exempted ? 'true' : 'false') as unknown as number,
      statusName: details?.is_exempted ? 'Exempt' : 'Non-Exempt',
    },
    mandatorySkills: mandatory.map((s) => ({
      id: s.skill_id as unknown as number,
      skillName: s.skill_label,
    })),
    optionalSkills: optional.map((s) => ({
      id: s.skill_id as unknown as number,
      skillName: s.skill_label,
    })),
    jobTitle: details?.job_title_id
      ? [{ id: details.job_title_id as unknown as number, jobTypeName: '' }]
      : [],
    department: details?.department_id
      ? [{ id: details.department_id as unknown as number, departmentName: '' }]
      : [],
    officeLocation: location
      ? [
          {
            country: { id: 0, name: location.country ?? '' },
            city: { id: 0, name: location.city ?? '' },
            state: { id: 0, name: location.state ?? '' },
          },
        ]
      : [],
    location: location
      ? {
          id: (location.job_location_id ?? '') as unknown as number,
          name: [location.city, location.state].filter(Boolean).join(', '),
          addressLine1: location.address_line_1 ?? undefined,
          addressLine2: location.address_line_2 ?? undefined,
          city: location.city ?? undefined,
          state: location.state ?? undefined,
          country: location.country ?? undefined,
          zip: location.zip ?? undefined,
          zipCode: location.zip ?? undefined,
        }
      : undefined,
    jobType: details?.job_type_id
      ? [{ id: details.job_type_id as unknown as number, jobTypeName: '' }]
      : [],
    jobMode: details?.mode_id ? [{ id: details.mode_id as unknown as number, name: '' }] : [],
    // Id only, name resolved separately against the education catalogue.
    educationPreference: details?.education_preference_id
      ? [{ id: details.education_preference_id as unknown as number, educationLevel: '' }]
      : [],
    interviewRounds: mapInterviewRounds(job.interview_rounds ?? [], job.org_job_opening_id),
    categorizedQuestions: {
      openDate: details?.job_open_date ?? '',
      createdAt: '',
      updatedAt: '',
      deleted: false,
      categories: {},
    },
    generalQuestions: (job.questions ?? []).map((q) => ({
      id: q.id as unknown as number,
      question: q.question_text,
      status: q.source,
      jobOpeningId: job.org_job_opening_id as unknown as number,
      interviewRoundId: q.interview_round_id as unknown as number,
    })),
    openDate: details?.job_open_date ?? '',
    createdAt: '',
    updatedAt: '',
    deleted: false,
  };
};

export const mapDetailsToJobDetailsState = (
  details: JobDetailsResponse
): Partial<JobDetailsState> => {
  const locationId = details.locations?.[0]?.job_location_id;
  return {
    jobProfileCode: details.job_profile_code,
    jobTitle: details.job_title_id ? [details.job_title_id as unknown as number] : [],
    department: details.department_id ? [details.department_id as unknown as number] : [],
    jobType: details.job_type_id ? [details.job_type_id as unknown as number] : [],
    jobMode: details.mode_id ? [details.mode_id as unknown as number] : [],
    shift: details.shift_id ? [details.shift_id as unknown as number] : [],
    officeLocation: locationId ? [locationId as unknown as number] : [],
    country: details.locations?.[0]?.country ?? '',
    state: details.locations?.[0]?.state ?? '',
    openings: details.vacancies,
    minSalary: details.lower_salary_range != null ? String(details.lower_salary_range) : null,
    maxSalary: details.upper_salary_range != null ? String(details.upper_salary_range) : null,
    minExperience: details.min_experience_req != null ? Number(details.min_experience_req) : null,
    maxExperience: details.max_experience_req != null ? Number(details.max_experience_req) : null,
    openDate: details.job_open_date ?? '',
    closeDate: details.job_close_date ?? '',
    hiringManagers: (details.hiring_manager_ids ?? []) as unknown as number[],
    recruiters: (details.recruiter_ids ?? []) as unknown as number[],
    educationPreference: details.education_preference_id
      ? [details.education_preference_id as unknown as number]
      : [],
    languages: (details.language_ids ?? []) as unknown as number[],
    mandatorySkills: (details.skills ?? [])
      .filter((s) => String(s.skill_type).toUpperCase() === 'MANDATORY')
      .map((s) => s.skill_id as unknown as number),
    optionalSkills: (details.skills ?? [])
      .filter((s) => String(s.skill_type).toUpperCase() !== 'MANDATORY')
      .map((s) => s.skill_id as unknown as number),
    responsibilities: details.responsibilities ?? '',
    otherRequirements: details.other_requirements ?? '',
    exemptionStatus: (details.is_exempted ? 'true' : 'false') as unknown as number,
    referralBonus: details.referral_bonus,
    useCultureIntro: details.use_culture_intro,
  };
};

export const mapInterviewRoundsToState = (
  rounds: InterviewRoundResponse[],
  jobId: string
): InterviewRoundState[] =>
  (rounds ?? []).map((round) => ({
    id: round.id as unknown as number,
    jobId: jobId as unknown as number,
    round: {
      id: round.round_id as unknown as number,
      name: round.round_name ?? '',
    },
    roundType: 'MANUAL',
    sequence: round.sequence,
    description: round.description ?? '',
  }));

export const asLegacyId = asId;
