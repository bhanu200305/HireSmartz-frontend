import { api } from '../../index';

// {items, total} — same convention as every other paginated response in
// this app (job-service's JobListResponse, organization-service's
// ListTenantActivityResponse, ...), not the Spring-style
// content/numberOfElements/totalElements/totalPages this used to declare.
export type ActivitySearchResponse = {
  items: FeedItem[];
  total: number;
};

export type ActivitySearchRequest = {
  jobOpeningId?: string | null;
  candidateId?: string | null;
  activityType?: string | null;
  entityType?: string | null;
  fromDate?: string;
  toDate?: string;
  text?: string;
  page: number;
  size: number;
};

export type FeedItem = {
  // UUID strings — every entity on this platform (job, candidate, user, ...)
  // is identified this way; these three used to be typed `number`.
  id: string;
  createdAt: string;
  // Fully rendered, ready-to-display text (e.g. "Diego Restrepo scheduled
  // the AI Audio Screening for the Copywriter position") — the frontend
  // renders this string as-is (Dashboard/ActivityFeed.tsx's renderList)
  // and never reads `titleParams` to build it client-side.
  title: string;
  entityType: string;
  // Absent for a JOB-entityType event (job created, resumes uploaded) —
  // ActivityFeed.tsx's handleItemClick already treats a missing
  // candidateId as normal for that case, only jobOpeningId is required.
  candidateId?: string | null;
  jobOpeningId: string;
  // Unused by the frontend today (see `title` above) — optional so the
  // backend isn't required to populate it for v1.
  titleParams?: {
    candidateName?: string;
    jobTitleName?: string;
    roundName?: string;
    profileCode?: string;
  };
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    DashboardActivitySearch: build.mutation<ActivitySearchResponse, ActivitySearchRequest>({
      query: (payload) => ({
        url: `/dashboard/activities/search`,
        method: 'POST',
        body: payload,
      }),
    }),
  }),
});

export const { useDashboardActivitySearchMutation } = extendedApi;
