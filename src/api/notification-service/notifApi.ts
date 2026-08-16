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

// notification-service is a SEPARATE deployable from the one
// VITE_BACKEND_ENDPOINT points at, same reasoning and same pattern as
// api/organization-service/orgApi.ts. Every file under
// api/notification-service/** rides on this instead of the shared `api` in
// src/api/index.ts.
const BASE_URL = import.meta.env.VITE_NOTIFICATION_SERVICE_ENDPOINT as string;

const fetchNotifBaseQuery = fetchBaseQuery({
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

// notification-service wraps every /v1/* JSON body — success or error — in
// the same {status_code, status, message, data} envelope organization-service
// uses (see app/modules/notifications/api/responses.py's module docstring).
// Unwrapped centrally here for the same reason orgApi.ts does it: every
// endpoint file can go on assuming the shape its own types declare instead of
// each one re-deriving `.data.data` by hand.
const rawNotifBaseQuery: typeof fetchNotifBaseQuery = async (args, api, extraOptions) => {
  const result = await fetchNotifBaseQuery(args, api, extraOptions);
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
 * Same refresh-on-401 shape as orgApi.ts's orgBaseQueryWithReauth. Every
 * route notification-service exposes to a browser requires a user token —
 * there is no anonymous route on this service (unlike organization-service's
 * invitation accept/validate) — so there is no allowlist to carry here.
 */
const notifBaseQueryWithReauth: BaseQueryFn<
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

  let result = await rawNotifBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const refreshed = await handleRefreshToken();
    if (refreshed) {
      result = await rawNotifBaseQuery(args, api, extraOptions);
    }
    // Refresh failing is left to the caller / PrivateRoute, same as orgApi.ts.
  }

  return result;
};

export const notifApi = createApi({
  reducerPath: 'notifApiReducer',
  baseQuery: notifBaseQueryWithReauth,
  tagTypes: [
    'NotificationFeed',
    'UnreadCount',
    'NotificationPreferences',
    'TemplatePacks',
    'TemplateOverrides',
    'TemplateLayout',
    'PlatformMasterTemplates',
    'PlatformMasterSmsTemplates',
    'PlatformTenantOverrides',
  ],
  endpoints: () => ({}),
});

export default notifApi;
