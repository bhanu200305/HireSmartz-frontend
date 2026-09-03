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

// candidate-service is a SEPARATE deployable from the one
// VITE_BACKEND_ENDPOINT points at (see .env.local's comment on
// VITE_CANDIDATE_SERVICE_ENDPOINT) — same reasoning, same pattern as
// api/job-service/jobApi.ts and api/organization-service/orgApi.ts: own
// reducerPath, own baseQuery, registered separately in redux/reducers and
// redux/provider/store. Every file under api/candidate-service/** that talks
// to the AUTHENTICATED recruiter/admin surface (/api/v1/...) rides on this
// instead of the shared `api` in src/api/index.ts.
//
// The genuinely public, unauthenticated surface (/public/v1/...) is a
// DIFFERENT base path with no bearer token at all — that stays on its own
// separate `publicApplyApi` (api/candidate-service/PublicApply/index.ts),
// same reasoning FRONTEND_INTEGRATION_DETAILS.md §1 gives for treating these
// as two different API clients: different auth, different base path,
// different error shapes.
//
// Includes the /api/v1 prefix (candidate-service mounts its recruiter/admin
// router there, per API_CONTRACT.md's "Auth classes" table) — every endpoint
// path under api/candidate-service/Candidates|Master|Stats/** is written
// relative to it (e.g. '/candidates', not '/api/v1/candidates').
const BASE_URL = `${import.meta.env.VITE_CANDIDATE_SERVICE_ENDPOINT}/api/v1`;

const fetchCandidateBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    if (import.meta.env.VITE_ENV === 'development') {
      headers.set('ngrok-skip-browser-warning', 'true');
    }
    // Every /api/v1/* route on candidate-service requires a real bearer
    // token (API_CONTRACT.md's "Auth classes" table — there is no anonymous
    // route on this surface, same as job-service), so unlike orgApi there's
    // no ANONYMOUS_ENDPOINTS set to skip here.
    const state = getState();
    const token: string | undefined =
      getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) || get(state, 'LoginSlice.loginToken');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// candidate-service wraps every /api/v1/* JSON body — success or failure —
// in {status, status_code, message, data} (API_CONTRACT.md's "Response
// envelope"). On success the real payload sits one level down under `data`
// (which can itself be null, an object, or a list); every endpoint file
// under api/candidate-service/** assumes it's looking at that unwrapped
// payload directly, same pattern as jobApi.ts/orgApi.ts. Error bodies are
// left untouched here (see candidateError.helpers.ts) — this only unwraps
// `result.data` (the success path), never `result.error.data`.
const rawCandidateBaseQuery: typeof fetchCandidateBaseQuery = async (args, api, extraOptions) => {
  const result = await fetchCandidateBaseQuery(args, api, extraOptions);
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

/**
 * Same refresh-on-401 shape as jobApi.ts/orgApi.ts. A 401 here is candidate-
 * service's shared platform middleware rejecting a missing/expired/revoked
 * token BEFORE this service's own code ever runs — a different, flatter JSON
 * shape than every other error on this API (see candidateError.helpers.ts) —
 * but the retry-after-refresh mechanics are identical to every other service
 * client in this codebase.
 */
const candidateBaseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  if (!navigator.onLine) {
    return {
      error: {
        status: 0,
        statusText: 'No internet connection. Please try again.',
        data: { message: 'No internet connection. Please try again.' },
      } as FetchBaseQueryError,
    };
  }

  let result = await rawCandidateBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const refreshed = await handleRefreshToken();
    if (refreshed) {
      result = await rawCandidateBaseQuery(args, api, extraOptions);
    }
    // Refresh failing is left to the caller / PrivateRoute, same as jobApi.ts/orgApi.ts.
  }

  return result;
};

export const candidateApi = createApi({
  reducerPath: 'candidateApiReducer',
  baseQuery: candidateBaseQueryWithReauth,
  tagTypes: [
    'Candidate',
    'CandidateList',
    'CandidateBatch',
    'CandidateStatusHistory',
    'CandidateInterviewRounds',
    'CandidateInterviewRoundArtifacts',
    'CandidateInterviewScores',
    'CandidateResumeReview',
    'CandidateNotes',
    'MasterCandidateStatuses',
    'MasterApplicationSources',
    'CandidateStats',
  ],
  endpoints: () => ({}),
});

export default candidateApi;
