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

// job-service is a SEPARATE deployable from the one VITE_BACKEND_ENDPOINT
// points at (see .env.local's comment on this and VITE_ORG_SERVICE_ENDPOINT)
// — same pattern as api/organization-service/orgApi.ts: own reducerPath, own
// baseQuery, registered separately in redux/reducers and redux/provider/store.
// Every file under api/job-service/** rides on this instead of the legacy
// shared `api` in src/api/index.ts (which pointed at whatever
// VITE_BACKEND_ENDPOINT happened to be set to locally, not a real dedicated
// job-service host).
//
// Includes the /api/v1 prefix (unlike orgApi's bare /v1) — that's how
// job-service mounts its public routes (app/main.py); every endpoint path in
// api/job-service/** is written relative to it (e.g. '/job-openings', not
// '/api/v1/job-openings').
const BASE_URL = import.meta.env.VITE_JOB_SERVICE_ENDPOINT as string;

const fetchJobBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    if (import.meta.env.VITE_ENV === 'development') {
      headers.set('ngrok-skip-browser-warning', 'true');
    }
    // job-service has no anonymous frontend-facing route (every /api/v1/*
    // route requires a real bearer token — see routers.py's
    // require_permission/require_platform_permission on every one of them;
    // the one unauthenticated route, GET /ats/callback, is a server-side
    // OAuth redirect target the browser navigates to directly, never an RTK
    // Query call), so unlike orgApi there's no ANONYMOUS_ENDPOINTS set to
    // skip here.
    const state = getState();
    const token: string | undefined =
      getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) || get(state, 'LoginSlice.loginToken');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// job-service's ResponseEnvelopeMiddleware wraps every /api/v1/* JSON body —
// success or error — in {status_code, status, message, data}, identical
// shape to organization-service's (both install the same shared
// cfp_platform middleware; see that module's own docstring). Unwrapped
// centrally here for the same reason orgApi.ts does it: every endpoint file
// can assume its declared response type directly instead of re-deriving
// `.data.data` by hand.
const rawJobBaseQuery: typeof fetchJobBaseQuery = async (args, api, extraOptions) => {
  const result = await fetchJobBaseQuery(args, api, extraOptions);
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

/** Same refresh-on-401 shape as orgApi.ts's orgBaseQueryWithReauth. */
const jobBaseQueryWithReauth: BaseQueryFn<
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

  let result = await rawJobBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const refreshed = await handleRefreshToken();
    if (refreshed) {
      result = await rawJobBaseQuery(args, api, extraOptions);
    }
    // Refresh failing is left to the caller / PrivateRoute, same as orgApi.ts.
  }

  return result;
};

export const jobApi = createApi({
  reducerPath: 'jobApiReducer',
  baseQuery: jobBaseQueryWithReauth,
  tagTypes: [
    'Jobs',
    'JobDetails',
    'JobNotes',
    'JobSuggestedSkills',
    'JobScoringCriteria',
    'JobInterviewSequence',
    'JobAudioQuestions',
    'JobQuestions',
    'JobJdStatus',
    'JobJdEnhancement',
    'JobWizardState',
    'JobPublishValidation',
    'JobBatches',
    'Skills',
    'MasterInterviewRounds',
    'MasterClosureReasons',
    'MasterShiftTypes',
    'MasterJobTypeSuggestions',
    'MasterJobModes',
    'MasterSkillCategories',
    'MasterSkills',
    'MasterSkillTypes',
    'OrgShifts',
    'OrgJobTypes',
    'AtsConfig',
    'AtsJobs',
  ],
  endpoints: () => ({}),
});

export default jobApi;
