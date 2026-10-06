import jobApi from '../jobApi';

// job-service's public, no-login job board. `organization_id` here is the
// same UUID as the tenant_id a QR code was generated for.
//
// Deliberately thin — the backend route only takes page/page_size, no
// search or location filter yet. List rows only carry `job_profile_code`,
// so the list card falls back to showing the code until the backend adds
// a friendly title there too (the detail response already has one).

export type PublicJobLocation = {
  city: string | null;
  state: string | null;
  country: string | null;
};

// `skill_type` is a string category (e.g. "Required"), not a boolean —
// match it case-insensitively, catalogue values aren't consistently cased.
export type PublicJobSkill = {
  skill_label: string;
  category: string;
  skill_type: string;
};

export type PublicJobListing = {
  id: string;
  job_profile_code: string;
  job_title: string | null;
  location_city: string | null;
  vacancies: number | null;
  job_open_date: string | null;
  min_experience_req: number | null;
  max_experience_req: number | null;
  // A job may offer either classification, or both.
  exempt_salary_min: number | null;
  exempt_salary_max: number | null;
  non_exempt_salary_min: number | null;
  non_exempt_salary_max: number | null;
  job_type_name: string | null;
  job_mode_name: string | null;
};

export type PublicJobListResponse = {
  items: PublicJobListing[];
  total: number;
  page: number;
  page_size: number;
};

export type PublicJobDetail = {
  id: string;
  job_profile_code: string;
  job_title: string | null;
  vacancies: number | null;
  job_open_date: string | null;
  min_experience_req: number | null;
  max_experience_req: number | null;
  exempt_salary_min: number | null;
  exempt_salary_max: number | null;
  non_exempt_salary_min: number | null;
  non_exempt_salary_max: number | null;
  jd: string | null;
  responsibilities: string | null;
  requirements: string | null;
  other_requirements: string | null;
  benefits: string | null;
  locations: PublicJobLocation[];
  skills: PublicJobSkill[];
  job_type_name: string | null;
  job_mode_name: string | null;
  shift_name: string | null;
  education_preference_name: string | null;
  /** Where this job's optional Intake Call round sits: `'before_resume'`
   * (round 1 — the candidate starts with the call), `'after_resume'`
   * (round 2), or `null` (no Intake Call). Requested from job-service
   * alongside the 2026-10-05 "Intake Call optional" change; `undefined`
   * until it ships, in which case the apply flow keeps offering both paths. */
  intake_call_position?: 'before_resume' | 'after_resume' | null;
};

/** Which apply path a candidate gets for this job: the two-option choice
 * (resume or instant Intake Call) whenever the job has an Intake Call round
 * anywhere in its sequence — or job-service isn't reporting the position
 * yet — and resume upload only when the job has no Intake Call at all. */
export type PublicApplyPath = 'resume' | 'choice';

export const publicApplyPathFor = (job: PublicJobDetail | undefined): PublicApplyPath => {
  if (!job || job.intake_call_position === undefined) return 'choice';
  return job.intake_call_position === null ? 'resume' : 'choice';
};

export type ListPublicJobsArgs = {
  organizationId: string;
  page?: number;
  pageSize?: number;
};

// `min_experience_req`/`max_experience_req` come back from the backend as
// numeric strings (Decimal serialization), which breaks display formatting
// even though comparisons happen to still work via JS coercion. Normalize
// once here so `number | null` is actually true downstream.
const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizePublicJobListing = (job: PublicJobListing): PublicJobListing => ({
  ...job,
  min_experience_req: toNumber(job.min_experience_req),
  max_experience_req: toNumber(job.max_experience_req),
  exempt_salary_min: toNumber(job.exempt_salary_min),
  exempt_salary_max: toNumber(job.exempt_salary_max),
  non_exempt_salary_min: toNumber(job.non_exempt_salary_min),
  non_exempt_salary_max: toNumber(job.non_exempt_salary_max),
});

// Company name/logo for the QR-board pages' header. `logo_url` may be a
// signed, time-limited link — re-fetch rather than cache past its lifetime.
export type PublicOrgBranding = {
  company_name: string;
  logo_url: string | null;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    listPublicJobs: build.query<PublicJobListResponse, ListPublicJobsArgs>({
      query: ({ organizationId, page = 1, pageSize = 20 }) => ({
        url: `/public/organizations/${organizationId}/jobs`,
        params: { page, page_size: pageSize },
      }),
      transformResponse: (response: PublicJobListResponse) => ({
        ...response,
        items: response.items.map(normalizePublicJobListing),
      }),
      providesTags: ['PublicJobs'],
    }),
    getPublicJob: build.query<PublicJobDetail, { organizationId: string; jobId: string }>({
      query: ({ organizationId, jobId }) => `/public/organizations/${organizationId}/jobs/${jobId}`,
      transformResponse: (response: PublicJobDetail) => ({
        ...response,
        min_experience_req: toNumber(response.min_experience_req),
        max_experience_req: toNumber(response.max_experience_req),
        exempt_salary_min: toNumber(response.exempt_salary_min),
        exempt_salary_max: toNumber(response.exempt_salary_max),
        non_exempt_salary_min: toNumber(response.non_exempt_salary_min),
        non_exempt_salary_max: toNumber(response.non_exempt_salary_max),
      }),
      providesTags: (_result, _error, { jobId }) => [{ type: 'PublicJobs', id: jobId }],
    }),
    getPublicBranding: build.query<PublicOrgBranding, string>({
      query: (organizationId) => `/public/organizations/${organizationId}/branding`,
      providesTags: (_result, _error, organizationId) => [
        { type: 'PublicJobs', id: `branding-${organizationId}` },
      ],
    }),
  }),
});

export const {
  useListPublicJobsQuery,
  useLazyListPublicJobsQuery,
  useGetPublicJobQuery,
  useGetPublicBrandingQuery,
} = extendedApi;
