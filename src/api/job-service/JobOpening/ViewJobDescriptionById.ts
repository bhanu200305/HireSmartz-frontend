import { jobApi } from '../jobApi';
import type { JobDetailsResponse } from '../types';

/**
 * JD read/update — JD lives on the job itself
 * (`GET/PUT /job-openings/{id}/details` and `PUT .../jd`).
 */
type ViewJobDescriptionRequest = {
  /** @deprecated use jobOpeningId */
  aiJobDescriptionID?: number | string;
  jobOpeningId?: string;
};

type ViewJobDescriptionResponse = {
  id: string;
  jobDescription: string;
  createdAt?: string;
  atsJobOpeningId?: string;
  source?: string;
  jd_status?: string;
  /** True once Job Details has been saved with title + department — false
   * for a bare draft shell with nothing for AI to compose from yet. */
  hasSavedDetails: boolean;
  /** 'MANUAL' | 'UPLOAD_JD' | 'AI_PROMPT' | 'ATS_IMPORT'. Only Manual/Upload
   * jobs can call `/jd/enhance`; only AI Prompt jobs can call
   * `/jd/regenerate` — the JD panel needs this to pick the right endpoint.
   * Undefined on `updateJobDescription`'s response. */
  entryPath?: string;
  /** Structured fields AI writes alongside the JD text on generate/parse.
   * Undefined on `updateJobDescription`'s response. */
  responsibilities?: string | null;
  otherRequirements?: string | null;
  minExperience?: number | null;
  maxExperience?: number | null;
  minSalary?: number | null;
  maxSalary?: number | null;
  // Extraction-only, never AI-composed — safe to sync back.
  vacancies?: number | null;
  /** The job's full current skill list. `skill_type` is matched
   * case-insensitively by callers. Undefined on `updateJobDescription`'s
   * response. */
  skills?: { skill_id: string; skill_label: string; skill_type: string }[];
  // Also fed to AI enhance — exposed here for the Job Details sync check.
  shiftId?: string | null;
  jobTypeId?: string | null;
  educationPreferenceId?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  locationCountry?: string | null;
};

type UpdateJobDescriptionRequest = {
  aiJobDescriptionId?: number | string;
  jobOpeningId?: string;
  jobDescription: string;
};

const resolveJobId = (args: {
  jobOpeningId?: string;
  aiJobDescriptionID?: number | string;
  aiJobDescriptionId?: number | string;
}): string => {
  if (args.jobOpeningId) return String(args.jobOpeningId);
  const legacy = args.aiJobDescriptionID ?? args.aiJobDescriptionId;
  return legacy != null ? String(legacy) : '';
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getJobDescriptionById: build.query<ViewJobDescriptionResponse, ViewJobDescriptionRequest>({
      query: (args) => {
        const jobOpeningId = resolveJobId(args);
        return {
          url: `/job-openings/${jobOpeningId}/details`,
          method: 'GET',
        };
      },
      transformResponse: (response: JobDetailsResponse): ViewJobDescriptionResponse => ({
        id: response.org_job_opening_id,
        jobDescription: response.jd ?? '',
        hasSavedDetails: Boolean(response.job_title_id && response.department_id),
        entryPath: response.entry_path,
        responsibilities: response.responsibilities,
        otherRequirements: response.other_requirements,
        minExperience:
          response.min_experience_req != null ? Number(response.min_experience_req) : null,
        maxExperience:
          response.max_experience_req != null ? Number(response.max_experience_req) : null,
        minSalary: response.lower_salary_range,
        maxSalary: response.upper_salary_range,
        vacancies: response.vacancies,
        skills: response.skills?.map((skill) => ({
          skill_id: skill.skill_id,
          skill_label: skill.skill_label,
          skill_type: skill.skill_type,
        })),
        shiftId: response.shift_id,
        jobTypeId: response.job_type_id,
        educationPreferenceId: response.education_preference_id,
        locationCity: response.locations?.[0]?.city ?? null,
        locationState: response.locations?.[0]?.state ?? null,
        locationCountry: response.locations?.[0]?.country ?? null,
      }),
      providesTags: (_r, _e, args) => [
        { type: 'JobDescription', id: resolveJobId(args) },
        { type: 'JobDetails', id: resolveJobId(args) },
      ],
    }),

    updateJobDescription: build.mutation<ViewJobDescriptionResponse, UpdateJobDescriptionRequest>({
      query: (args) => {
        const jobOpeningId = resolveJobId(args);
        return {
          url: `/job-openings/${jobOpeningId}/jd`,
          method: 'PUT',
          body: { jd: args.jobDescription },
        };
      },
      transformResponse: (
        response: { jd: string | null },
        _meta,
        args
      ): ViewJobDescriptionResponse => ({
        id: resolveJobId(args),
        jobDescription: response.jd ?? '',
        // Only runs from the EDIT panel once a description exists.
        hasSavedDetails: true,
      }),
      invalidatesTags: (_r, _e, args) => [
        { type: 'JobDescription', id: resolveJobId(args) },
        { type: 'JobDetails', id: resolveJobId(args) },
        { type: 'JobOpeningById', id: resolveJobId(args) },
      ],
    }),
  }),
});

export const {
  useGetJobDescriptionByIdQuery,
  useLazyGetJobDescriptionByIdQuery,
  useUpdateJobDescriptionMutation,
} = extendedApi;
