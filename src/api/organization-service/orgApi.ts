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

// organization-service is a separate deployable with its own reducerPath/
// baseQuery, same pattern as authApi.ts.
const BASE_URL = import.meta.env.VITE_ORG_SERVICE_ENDPOINT as string;

// Reachable with no bearer token — the caller has no session yet (e.g. an
// invite is validated/accepted before the invited person logs in).
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

// Unwraps the {status_code, status, message, data} envelope every
// organization-service response carries, so endpoint files can assume the
// plain payload their types already declare.
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
    'TenantDesignations',
    'TenantJobTitles',
    'TenantOffices',
    'TenantActivity',
    'TenantQrCode',
    'Entitlements',
    'UserPermissions',
    'UserLocations',
    'OrgUsers',
    'OwnProfile',
    'RoleAssignments',
    'InterviewQuestions',
    'PlatformTenants',
    'Industries',
    'JobTitles',
    'PlatformStaff',
    'PlatformDepartments',
    'PlatformAudit',
    'GuestOrganizations',
    'Roles',
    'OwnProfile',
    'CultureIntro',
    'PlatformCultureIntro',
    'ResumeTemplateFields',
  ],
  endpoints: () => ({}),
});

export default orgApi;
