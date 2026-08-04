import { api } from '../../index';

export type ActivitySearchResponse = {
  content: FeedItem[];
  numberOfElements: number;
  totalElements: number;
  totalPages: number;
};

export type ActivitySearchRequest = {
  jobOpeningId?: number | null;
  candidateId?: number | null;
  activityType?: string | null;
  entityType?: string | null;
  fromDate?: string;
  toDate?: string;
  text?: string;
  page: number;
  size: number;
};

export type FeedItem = {
  id: number;
  createdAt: string;
  title: string;
  entityType: string;
  candidateId: number;
  jobOpeningId: number;
  titleParams: {
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
