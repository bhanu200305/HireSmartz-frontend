import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import {
  clearLocalStorage,
  clearImpersonationStorage,
  getLocalStorageItem,
  isImpersonationActive,
} from '../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../constants/webAPI';
import { handleRefreshToken } from '../services/AuthService';
import { get } from 'lodash-es';

const BASE_URL = `${import.meta.env.VITE_BACKEND_ENDPOINT}${import.meta.env.VITE_BACKEND_PREFIX}`;
const CACHE_TAG_TYPES = [
  'SAMPLE_TAG_TYPES',
  'CompanyDetails',
  'JobDescription',
  'Departments',
  'JobRoles',
  'Industries',
  'MasterDepartments',
  'MasterJobTitles',
  'EmailTemplateConfig',
  'SmsTemplateCatalog',
  'FeatureFlags',
  'NylasGrantStatus',
  'CompanyLocations',
  'JobBatches',
  'SearchResults',
  'QrCodes',
  'Roles',
];

const isPasswordChangeInvalidationError = (message: string): boolean => {
  const normalizedMessage = message.toUpperCase();
  return (
    normalizedMessage.includes('PASSWORD') &&
    (normalizedMessage.includes('CHANGE') || normalizedMessage.includes('CHANGED'))
  );
};

/**
 * Raw base query configured with authorization headers.
 *
 * Automatically includes Authorization header with JWT token for all requests
 * (except login and forgot-password endpoints which are public).
 *
 * Also sets security headers:
 * - ngrok-skip-browser-warning: true (for development behind ngrok)
 */
const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState, endpoint }) => {
    const state = getState();
    const token: string | undefined =
      getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) || get(state, 'LoginSlice.loginToken');
    // headers.set('ngrok-skip-browser-warning', '69420'); // Temporarily added to bypass ngrok warning
    if (import.meta.env.VITE_ENV === 'development') {
      headers.set('ngrok-skip-browser-warning', 'true');
    }
    if (!['login', 'forgot-password'].includes(endpoint) && token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

/**
 * RTK Query base query with automatic token refresh on 401 errors.
 *
 * This is the main query handler for all API requests in the application.
 * It intercepts responses and automatically handles authentication failures.
 *
 * @error Handling
 * - 401 with ACCOUNT_INACTIVE: Clear localStorage and redirect to /login immediately
 * - 401 (other): Attempt token refresh, retry original request
 * - Other errors: Return error as-is to component
 *
 * @flow
 * 1. Execute original request with current token
 * 2. If request succeeds, return result
 * 3. If 401 error with ACCOUNT_INACTIVE:
 *    - Clear all localStorage data
 *    - Redirect to /login page
 *    - User must re-authenticate
 * 4. If 401 error (other reasons):
 *    - Call handleRefreshToken() to get new token
 *    - If refresh succeeds:
 *      * Retry original request with new token
 *      * Return result from retry
 *    - If refresh fails:
 *      * Return original 401 error
 *      * Application should handle redirect to login
 * 5. Non-401 errors passed through unchanged
 *
 * @example
 * // Used internally by RTK Query, not called directly
 * // When API returns 401:
 * const { data, error } = useGetUserQuery()
 * // → baseQueryWithReauth automatically retries with new token
 *
 * @internal
 * This is configured as the baseQuery for all createApi calls.
 */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  // Check internet connection before making API request
  if (!navigator.onLine) {
    return {
      error: {
        status: 0,
        statusText: 'No internet connection. Please try again.',
        data: { message: 'No internet connection. Please try again.' },
      } as FetchBaseQueryError,
    };
  }

  let result = await rawBaseQuery(args, api, extraOptions);
  const errorMessage = String((result.error?.data as { message?: string })?.message || '');
  const isImpersonating = isImpersonationActive();

  if (
    result.error &&
    result.error.status === 401 &&
    isPasswordChangeInvalidationError(errorMessage) &&
    isImpersonating
  ) {
    return result;
  }

  if (result.error && result.error.status === 401 && errorMessage === 'ACCOUNT_INACTIVE') {
    clearImpersonationStorage();
    clearLocalStorage();
    window.location.href = '/login';
    return result;
  }

  if (result.error && result.error.status !== 401) {
    return result;
  }

  if (result.error && result.error.status === 401) {
    const refreshed = await handleRefreshToken();

    if (refreshed) {
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: 'apiReducer',
  baseQuery: baseQueryWithReauth,
  tagTypes: CACHE_TAG_TYPES,
  endpoints: () => ({}),
});

export default api;
