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

const rawOrgBaseQuery = fetchBaseQuery({
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
    'TenantOffices',
    'TenantActivity',
    'Entitlements',
    'UserPermissions',
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
  ],
  endpoints: () => ({}),
});

export default orgApi;
