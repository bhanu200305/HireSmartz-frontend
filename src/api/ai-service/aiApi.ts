import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { get } from 'lodash-es';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import { getLocalStorageItem } from '../../shared/utils/auth/localstorage.helpers';
import { handleRefreshToken } from '../../services/AuthService';

// ai-service is a SEPARATE deployable — same dedicated-createApi pattern as
// jobApi.ts / orgApi.ts. Its real HTTP surface reachable from the frontend
// is deliberately small: almost every AI-assisted job-service feature (JD
// generate/enhance/parse, question generation, skill extraction) runs over
// RabbitMQ between job-service and ai-service, never as a direct browser
// call — see ai-service's own app/main.py docstring. The one genuinely
// frontend-facing pair here is the organization website-scrape trigger/poll
// (used during tenant onboarding); everything else this createApi could
// technically reach (`/ai/job-title/suggest-skills`,
// `/ai/organization/{id}/scrape...`) is service-to-service only
// (require_service_token, allowed_callers excludes any frontend caller) and
// has no business being called from here.
//
// Includes the /api/v1 prefix — ai-service mounts its whole router at
// /api/v1/ai (app/main.py); every endpoint path in api/ai-service/** starts
// with /ai/... relative to this base.
const BASE_URL = import.meta.env.VITE_AI_SERVICE_ENDPOINT as string;

const fetchAiBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    if (import.meta.env.VITE_ENV === 'development') {
      headers.set('ngrok-skip-browser-warning', 'true');
    }
    const state = getState();
    const token: string | undefined =
      getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) || get(state, 'LoginSlice.loginToken');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Same ResponseEnvelopeMiddleware shape as job-service/organization-service
// — ai-service deliberately wraps even its service-to-service route (see
// its own main.py comment), so this unwrap applies uniformly.
const rawAiBaseQuery: typeof fetchAiBaseQuery = async (args, api, extraOptions) => {
  const result = await fetchAiBaseQuery(args, api, extraOptions);
  if (
    result.data &&
    typeof result.data === 'object' &&
    'data' in (result.data as Record<string, unknown>) &&
    'status_code' in (result.data as Record<string, unknown>)
  ) {
    return { ...result, data: (result.data as { data: unknown }).data };
  }
  return result;
};

/** Same refresh-on-401 shape as orgApi.ts / jobApi.ts. */
const aiBaseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  if (!navigator.onLine) {
    return {
      error: {
        status: 0,
        statusText: 'No internet connection. Please try again.',
        data: { message: 'No internet connection. Please try again.' },
      } as FetchBaseQueryError,
    };
  }

  let result = await rawAiBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const refreshed = await handleRefreshToken();
    if (refreshed) {
      result = await rawAiBaseQuery(args, api, extraOptions);
    }
  }

  return result;
};

export const aiApi = createApi({
  reducerPath: 'aiApiReducer',
  baseQuery: aiBaseQueryWithReauth,
  tagTypes: ['OrgScrape'],
  endpoints: () => ({}),
});

export default aiApi;
