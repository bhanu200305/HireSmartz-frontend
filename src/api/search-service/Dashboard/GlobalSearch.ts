import { api } from '../../index';

export type RecentSearchItem = {
  id: string | number;
  userId: string;
  queryText: string;
};

export type RecentSearchResponse = {
  success: boolean;
  message: string;
  data: RecentSearchItem[];
};

export type GlobalSearchResultItem = {
  id: string | number;
  type: 'CANDIDATE' | 'JOB' | 'USER' | 'COMPANY';
  title: string;
  subtitle?: string;
};

export type SearchResultExtraJob = {
  id: number;
  shift: string;
  is_sync: boolean;
  is_draft: boolean;
  openings: number;
  is_active: boolean;
  is_closed: boolean;
  open_date: string;
  close_date: string | null;
  company_id: number;
  created_at: string;
  is_deleted: boolean;
  max_salary: number;
  min_salary: number;
  updated_at: string;
  is_completed: boolean;
  recruiter_id: number | null;
  max_experience: number | null;
  min_experience: number;
  referral_bonus: number | null;
  job_profile_code: string;
  hiring_manager_id: number;
  ats_job_opening_id: number | null;
  exemption_status_id: number;
  communication_skills: string | null;
  address_line1: string | null;
  website_url: string | null;
  email_id: string | null;
  phone_number: string | null;
  country_code: string | null;
};

export type SearchResultItem = {
  docId: string;
  sourceType: 'JOB' | 'CANDIDATE' | 'USER' | 'COMPANY';
  sourceId: string;
  title: string;
  subtitle: string | null;
  snippet: string | null;
  rank: number;
  extraJson: SearchResultExtraJob; // adjust union if you add other sourceTypes
};

export type GlobalSearchResponse = {
  totalCount: number;
  sourceTypeCounts: { sourceType: string; count: number }[];
  results: SearchResultItem[];
};

export type GlobalSearchRequest = {
  q: string;
  category?: string;
  field?: string;
  page?: number;
  size?: number;
  scopeKey?: string;
};

export type CategoriesResponse = {
  [key: string]: Array<{
    uiName: string;
    entityField: string;
    dbColumn: string;
  }>;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getRecentSearches: build.query<RecentSearchResponse, string | void>({
      query: () => ({
        url: '/global-search/search/recent',
        method: 'GET',
      }),
    }),
    globalSearch: build.query<GlobalSearchResponse, GlobalSearchRequest>({
      query: ({ q, category, field }) => {
        const params: Record<string, string> = { q };

        if (category) {
          params.category = category;
        }

        if (field) {
          params.field = field;
        }

        return {
          url: '/global-search/search',
          method: 'GET',
          params,
        };
      },
    }),
    getCategories: build.query<CategoriesResponse, void>({
      query: () => ({
        url: '/global-search/modules',
        method: 'GET',
      }),
    }),
  }),
});

export const { useGetRecentSearchesQuery, useGlobalSearchQuery, useGetCategoriesQuery } =
  extendedApi;
