import { aiApi } from '../aiApi';

// POST /ai/organization/scrape + GET /ai/organization/scrape/result — the
// one genuinely frontend-facing pair on ai-service's real HTTP surface
// (organization_id comes from the caller's own session, not the body/path;
// see requests.py's own docstring). Used during tenant onboarding to
// auto-fill company profile fields (logo/description/culture/colors) from a
// website URL.

export type OrgScrapeStatus = 'PROCESSING' | 'READY' | 'FAILED';

export type TriggerOrgScrapeResponse = {
  status: 'PROCESSING';
};

export type OrgScrapeResultResponse = {
  status: OrgScrapeStatus;
  logo_reference: string | null;
  description: string | null;
  culture_text: string | null;
  colors: string[];
  reason: string | null;
  retryable: boolean | null;
};

const extendedApi = aiApi.injectEndpoints({
  endpoints: (build) => ({
    triggerOrgScrape: build.mutation<TriggerOrgScrapeResponse, { website_url: string }>({
      query: (body) => ({ url: '/ai/organization/scrape', method: 'POST', body }),
      invalidatesTags: ['OrgScrape'],
    }),
    getOrgScrapeResult: build.query<OrgScrapeResultResponse, void>({
      query: () => '/ai/organization/scrape/result',
      providesTags: ['OrgScrape'],
    }),
  }),
});

export const {
  useTriggerOrgScrapeMutation,
  useGetOrgScrapeResultQuery,
  useLazyGetOrgScrapeResultQuery,
} = extendedApi;
