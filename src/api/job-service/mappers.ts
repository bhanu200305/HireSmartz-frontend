import type { JobSummaryResponse } from './types';
import type { Jobs } from '../../types';

/**
 * Map a job-service JobSummaryResponse into the listing row shape the
 * Jobs Opening page already renders. Display names for title/department/
 * job-type/hiring-manager are resolved in the page from org-service /
 * catalog lookups — the list endpoint only returns ids.
 */
export const mapJobSummaryToListRow = (item: JobSummaryResponse): Jobs => {
  const id = item.org_job_opening_id;
  return {
    key: id,
    jobOpeningId: id,
    jobProfileCode: item.job_profile_code,
    shift: '',
    openings: item.vacancies ?? 0,
    minSalary: item.salary_min ?? 0,
    maxSalary: item.salary_max ?? 0,
    minExperience: Number(item.min_experience_req ?? 0),
    maxExperience: Number(item.max_experience_req ?? 0),
    openDate: item.job_open_date ?? '',
    hiringManager: '',
    recruiter: '',
    exemptionStatusId: 0,
    communicationSkills: '',
    jobOpeningCreatedAt: '',
    jobOpeningUpdatedAt: '',
    isDeleted: false,
    exemptionStatusName: '',
    jobTitleName: item.job_profile_code,
    departmentName: '',
    officeLocationName: item.is_remote ? 'Remote' : (item.location_city ?? ''),
    jobTypeName: '',
    educationPreferenceName: '',
    mandatorySkillName: '',
    optionalSkills: null,
    isDraft: item.is_draft,
    isClosed: item.is_closed,
    selectedCount: item.selected_count ?? 0,
    rejectedCount: item.not_selected_count ?? 0,
    bookingCreatedCount: 0,
    inProgressCount: 0,
    invitationSentCount: 0,
    candidateCount: item.candidate_count ?? 0,
    interviewedCandidateCount: item.interviewed_count ?? 0,
    location: item.location_city ? { id: item.location_city, name: item.location_city } : undefined,
    // Extra fields the listing uses for name resolution
    jobTitleId: item.job_title_id,
    departmentId: item.department_id,
    jobTypeId: item.job_type_id,
    hiringManagerIds: item.hiring_manager_ids,
    recruiterIds: item.recruiter_ids,
    isPublished: item.is_published,
    isRemote: item.is_remote,
  } as Jobs;
};
