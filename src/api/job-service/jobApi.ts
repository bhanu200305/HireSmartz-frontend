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

// job-service is a separate deployable with its own reducerPath/baseQuery,
// same pattern as orgApi.ts/authApi.ts. Includes /api/v1 (unlike orgApi's
// bare /v1) — every endpoint path below is relative to it.
const BASE_URL = import.meta.env.VITE_JOB_SERVICE_ENDPOINT as string;

const fetchJobBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    if (import.meta.env.VITE_ENV === 'development') {
      headers.set('ngrok-skip-browser-warning', 'true');
    }
    // Every job-service route requires a bearer token, so unlike orgApi
    // there's no ANONYMOUS_ENDPOINTS set to skip here.
    const state = getState();
    const token: string | undefined =
      getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) || get(state, 'LoginSlice.loginToken');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Unwraps the {status_code, status, message, data} envelope every
// job-service response carries, so endpoint files can assume the plain
// payload. Same pattern as orgApi.ts/authApi.ts. SSE streams aren't JSON
// and never hit this path.
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

/**
 * Same refresh-on-401 shape as orgApi.ts. Every browser-facing job-service
 * route requires a user token — there is no anonymous route on this
 * service.
 */
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
    // Tags used by the job-creation-flow endpoints (api/job-service/JobOpening/**).
    'JobOpenings',
    'JobOpeningById',
    'JobDetails',
    'JobDescription',
    'JobScoring',
    'InterviewSequence',
    'JobQuestions',
    'QuestionImports',
    'JobNotes',
    'JobStats',
    'JobTypes',
    'Shifts',
    'JobModes',
    'ClosureReasons',
    'InterviewRoundTypes',
    'Skills',
    'AtsConfig',
    'AtsJobs',
    'JdUploadBatch',
    'WizardState',
    'EducationPreferences',
    'Languages',
    'OrganizationScoringCriteria',
    'PlatformOrganizationScoringCriteria',
    'PlatformScoringCategories',
    // Tags used by the Super Admin's platform master-catalogue CRUD tabs
    // (Company Settings → Job Catalogs) — one per /platform/master-* group.
    // Job Types reuses the tenant-facing 'JobTypes' tag above (catalogs.ts's
    // create/update/delete already branch platform-vs-tenant by URL) rather
    // than a separate tag, since both write the one list either screen reads.
    'PlatformJobModes',
    'PlatformEducationPreferences',
    'PlatformShiftTypes',
    'PlatformClosureReasons',
    'PlatformInterviewRoundTypes',
    'PlatformLanguages',
    'PlatformSkillCategories',
    'PlatformSkillTypes',
    'PlatformSkills',
    // Tags used by api/job-service/JobOpenings, JobTypes, Master, Shifts,
    // Batches, and similar endpoint files.
    'Jobs',
    'JobSuggestedSkills',
    'JobScoringCriteria',
    'JobInterviewSequence',
    'JobAudioQuestions',
    'JobIntakeQuestions',
    'JobJdStatus',
    'JobJdEnhancement',
    'JobWizardState',
    'JobPublishValidation',
    'JobBatches',
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
    'PublicJobs',
  ],
  endpoints: () => ({}),
});

export default jobApi;
