import { jobApi } from '../jobApi';
import type { FieldSuggestions } from '../../../shared/utils/fieldSuggestions';

/**
 * Backs the Job Details "Fill with AI" helper. POST asks AI to read a short role
 * description; GET returns the pending/ready/failed result. Nothing is saved to the job.
 */
export type FieldSuggestionsResponse = {
  status: 'NONE' | 'PENDING' | 'READY' | 'FAILED';
  suggestions?: FieldSuggestions | null;
  message?: string | null;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    requestFieldSuggestions: build.mutation<
      FieldSuggestionsResponse,
      { jobOpeningId: string; text: string }
    >({
      query: ({ jobOpeningId, text }) => ({
        url: `/job-openings/${jobOpeningId}/details/suggest`,
        method: 'POST',
        body: { text },
      }),
    }),
    getFieldSuggestions: build.query<FieldSuggestionsResponse, string>({
      query: (jobOpeningId) => ({
        url: `/job-openings/${jobOpeningId}/details/suggest`,
        method: 'GET',
      }),
    }),
  }),
});

export const { useRequestFieldSuggestionsMutation, useGetFieldSuggestionsQuery } = extendedApi;
