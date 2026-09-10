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

// authentication-service is a SEPARATE deployable from the one
// VITE_BACKEND_ENDPOINT points at (see .env.local's comment on
// VITE_AUTH_SERVICE_ENDPOINT) — every other api/*/index.ts in this repo talks
// to the shared `api` instance in src/api/index.ts, which is baseUrl'd at
// VITE_BACKEND_ENDPOINT and would silently 404 every one of these calls.
// This is its own createApi instance, following the same pattern already
// used for videoIntegrationApi / interviewFeedbackApi / publicQrApi: own
// reducerPath, own baseQuery, registered separately in redux/reducers and
// redux/provider/store.
const BASE_URL = import.meta.env.VITE_AUTH_SERVICE_ENDPOINT as string;

// Every route authentication-service's own contract documents as reachable
// with no bearer token (docs/API_CONTRACT.md §4.2). Keyed by RTK Query
// endpoint name, not URL — that's what `api.endpoint` gives the base query.
//
// This set does two jobs: prepareHeaders skips attaching a (possibly stale
// or absent) Authorization header on these, and the reauth wrapper below
// skips the refresh-and-retry dance on their 401s. A failed login is a 401
// too, and it means "wrong credentials", not "stale access token" — retrying
// it after a refresh would just resubmit the same rejected password a second
// time using whatever refresh token happens to be sitting in storage from a
// previous session.
const ANONYMOUS_ENDPOINTS = new Set<string>([
  'login',
  'mfaLoginVerify',
  'mfaLoginChallenge',
  'forgotPassword',
  'resetPassword',
  'verifyEmail',
  'resendVerification',
  'confirmRecoveryEmail',
  'startAccountRecovery',
  'completeAccountRecovery',
]);

const fetchAuthBaseQuery = fetchBaseQuery({
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

// authentication-service's ResponseEnvelopeMiddleware wraps every /api/v1/*
// JSON body — success or error — in {status_code, status, message, data}
// (cfp_platform.middleware.response_envelope, installed in app/main.py). On
// success the real payload (access_token, TokenResponse, MfaRequiredResponse,
// etc.) sits one level down, under `data`; every endpoint file in
// api/authentication-service/** assumes it's looking at that unwrapped
// payload directly. Unwrapped centrally here, same pattern and same reason as
// orgApi.ts's rawOrgBaseQuery. Error responses are untouched: they already
// read the envelope's own top-level `message` via getAuthErrorMessage, which
// errors don't nest a second time.
const rawAuthBaseQuery: typeof fetchAuthBaseQuery = async (args, api, extraOptions) => {
  const result = await fetchAuthBaseQuery(args, api, extraOptions);
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
 * Same refresh-on-401 shape as src/api/index.ts's baseQueryWithReauth, scoped
 * to authentication-service's own anonymous-route list above instead of
 * retrying every 401 unconditionally.
 */
const authBaseQueryWithReauth: BaseQueryFn<
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

  let result = await rawAuthBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401 && !ANONYMOUS_ENDPOINTS.has(api.endpoint)) {
    const refreshed = await handleRefreshToken();
    if (refreshed) {
      result = await rawAuthBaseQuery(args, api, extraOptions);
    }
    // Refresh failing just returns this 401 to the caller — but by this
    // point handleRefreshToken() has already redirected to /login for any
    // refresh the server actually rejected (invalid/revoked/rate-limited;
    // see forceReauthentication() in AuthService.ts). This base query has
    // nothing left to do on its own in that case; matching
    // src/api/index.ts's default 401 handling (only its ACCOUNT_INACTIVE
    // case redirects independently of handleRefreshToken()).
  }

  return result;
};

/**
 * A 204 No Content response has no body — authentication-service returns
 * this for logout, reset-password, change-password, MFA disable and session
 * revocation. Calling response.json() on it throws, so every endpoint that
 * documents a 204 passes this as its responseHandler instead of relying on
 * fetchBaseQuery's default JSON parse.
 */
export const noContentResponseHandler = async (response: Response): Promise<undefined> => {
  await response.text();
  return undefined;
};

export const authApi = createApi({
  reducerPath: 'authApiReducer',
  baseQuery: authBaseQueryWithReauth,
  tagTypes: ['MfaMethods', 'Sessions', 'RecoveryEmail'],
  endpoints: () => ({}),
});

export default authApi;
