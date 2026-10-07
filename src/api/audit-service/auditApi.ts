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

// audit-service is a separate deployable with its own reducerPath/baseQuery,
// same pattern as orgApi.ts. It mounts its routes at bare /v1 (no prefix).
const BASE_URL = import.meta.env.VITE_AUDIT_SERVICE_ENDPOINT as string;

const fetchAuditBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    if (import.meta.env.VITE_ENV === 'development') {
      headers.set('ngrok-skip-browser-warning', 'true');
    }
    const token: string | undefined =
      getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) || get(getState(), 'LoginSlice.loginToken');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Unwraps the {status_code, status, message, data} envelope, so endpoint
// files can assume the plain payload their types declare.
const rawAuditBaseQuery: typeof fetchAuditBaseQuery = async (args, api, extraOptions) => {
  const result = await fetchAuditBaseQuery(args, api, extraOptions);
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

const auditBaseQueryWithReauth: BaseQueryFn<
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

  let result = await rawAuditBaseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 401) {
    const refreshed = await handleRefreshToken();
    if (refreshed) {
      result = await rawAuditBaseQuery(args, api, extraOptions);
    }
  }
  return result;
};

export const auditApi = createApi({
  reducerPath: 'auditApiReducer',
  baseQuery: auditBaseQueryWithReauth,
  tagTypes: ['Activity'],
  endpoints: () => ({}),
});

export default auditApi;
