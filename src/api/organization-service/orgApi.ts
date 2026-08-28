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

// organization-service is a SEPARATE deployable from the one
// VITE_BACKEND_ENDPOINT points at (see .env.local's comment on both this and
// VITE_AUTH_SERVICE_ENDPOINT) — same reasoning, same pattern as
// api/authentication-service/authApi.ts: own reducerPath, own baseQuery,
// registered separately in redux/reducers and redux/provider/store. Every
// file under api/organization-service/** rides on this instead of the
// shared `api` in src/api/index.ts.
const BASE_URL = import.meta.env.VITE_ORG_SERVICE_ENDPOINT as string;

// organization-service's own anonymous routes — reachable with no bearer
// token because the caller has no session yet (an invite is validated and
// accepted BEFORE the invited person has ever logged in). Keyed by RTK
// Query endpoint name, matching what `api.endpoint` gives the base query —
// same convention as authApi.ts's ANONYMOUS_ENDPOINTS.
const ANONYMOUS_ENDPOINTS = new Set<string>(['validateInvitation', 'acceptInvitation']);

const fetchOrgBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState, endpoint }) => {
    if (import.meta.env.VITE_ENV === 'development') {
      headers.set('ngrok-skip-browser-warning', 'true');
    }
    if (!ANONYMOUS_ENDPOINTS.has(endpoint)) {
      const state = getState();
      const token: string | undefined =
        getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) || get(state, 'LoginSlice.loginToken');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
    }
    return headers;
  },
});

// organization-service's ResponseEnvelopeMiddleware wraps every /v1/* JSON
// body — success or error — in {status_code, status, message, data}
// (services/organization-service/app/core/middleware/response_envelope.py).
// On success the real payload sits one level down, under `data`; each
// endpoint's own `transformResponse` (or return type, where there isn't one)
// already assumes it's looking at that unwrapped payload directly — e.g.
// listIndustries reads `response.industries`, which only exists on the
// inner object, not the envelope. Unwrapped centrally here so every
// endpoint file can go on assuming the shape its types already declare,
// instead of every single one re-deriving `.data.data` by hand. Error
// responses are untouched: `getOrgErrorMessage`/`get(error, 'data.message')`
// already reads the envelope's own top-level `message`, which errors don't
// nest a second time.
const rawOrgBaseQuery: typeof fetchOrgBaseQuery = async (args, api, extraOptions) => {
  const result = await fetchOrgBaseQuery(args, api, extraOptions);
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
 * Same refresh-on-401 shape as authApi.ts's authBaseQueryWithReauth, scoped
 * to organization-service's own anonymous-route list above.
 */
const orgBaseQueryWithReauth: BaseQueryFn<
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

  let result = await rawOrgBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401 && !ANONYMOUS_ENDPOINTS.has(api.endpoint)) {
    const refreshed = await handleRefreshToken();
    if (refreshed) {
      result = await rawOrgBaseQuery(args, api, extraOptions);
    }
    // Refresh failing is left to the caller / PrivateRoute, same as authApi.ts.
  }

  return result;
};

export const orgApi = createApi({
  reducerPath: 'orgApiReducer',
  baseQuery: orgBaseQueryWithReauth,
  tagTypes: [
    'Tenant',
    'TenantInvitations',
    'TenantDepartments',
    'TenantJobTitles',
    'TenantOffices',
    'TenantActivity',
    'Entitlements',
    'UserPermissions',
    'UserLocations',
    'OrgUsers',
    'RoleAssignments',
    'InterviewQuestions',
    'ScoringConfig',
    'PlatformTenants',
    'PlatformScoringConfig',
    'Industries',
    'JobTitles',
    'PlatformStaff',
    'PlatformDepartments',
    'PlatformAudit',
    'GuestOrganizations',
    'Roles',
  ],
  endpoints: () => ({}),
});

export default orgApi;
