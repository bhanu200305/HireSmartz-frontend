import jobApi from '../jobApi';

// GET /public/organizations/{organization_id}/jobs[/{job_id}] — job-service's
// public, no-login job board (public_router.py). This is the page a QR code
// (organization-service's own GenerateTenantQrCodeUseCase) sends a candidate
// to: `organization_id` here is the exact same UUID as the `tenant_id` the
// QR was generated for.
//
// Deliberately thin today — the backend route only takes `page`/`page_size`,
// no search or location filter yet, so this client doesn't invent params the
// API can't answer. `job_profile_code` (not a friendly title) is what the
// list row currently carries; the detail response does have a real
// `job_title`, so the list card falls back to showing the code until the
// backend adds one there too.

export type PublicJobLocation = {
  city: string | null;
  state: string | null;
  country: string | null;
};

export type PublicJobSkill = {
  name: string;
  is_mandatory: boolean;
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
  salary_min: number | null;
  salary_max: number | null;
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
  salary_min: number | null;
  salary_max: number | null;
  jd: string | null;
  responsibilities: string | null;
  requirements: string | null;
  other_requirements: string | null;
  locations: PublicJobLocation[];
  skills: PublicJobSkill[];
};

export type ListPublicJobsArgs = {
  organizationId: string;
  page?: number;
  pageSize?: number;
};

// GET /public/organizations/{organization_id}/branding — company name/logo
// for the QR-board pages' header. `logo_url` is a signed, time-limited link
// for a stored logo (or, for a tenant whose logo is a plain external URL
// like this session's own test data, that URL passed straight through) —
// re-fetch rather than cache past its own query lifetime.
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
      providesTags: ['PublicJobs'],
    }),
    getPublicJob: build.query<PublicJobDetail, { organizationId: string; jobId: string }>({
      query: ({ organizationId, jobId }) => `/public/organizations/${organizationId}/jobs/${jobId}`,
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

export const { useListPublicJobsQuery, useGetPublicJobQuery, useGetPublicBrandingQuery } =
  extendedApi;
