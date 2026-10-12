import { jwtDecode } from 'jwt-decode';
import { LOCALSTORAGE_KEYS } from '../constants/webAPI';
import {
  clearImpersonationStorage,
  clearLocalStorage,
  getLocalStorageItem,
  setTokens,
} from '../shared/utils/auth/localstorage.helpers';
import { loginStore } from '../redux/slices/loginSlice';
import { AppDispatch } from '../redux/provider/store';
import axios from 'axios';
import { extractCanManageCompanySettings } from '../shared/utils/auth/permission.helpers';

type RefreshedTokens = { token: string; refreshToken: string };

// authentication-service's refresh tokens are SINGLE-USE and rotate on every
// call — presenting one twice trips reuse detection and revokes the entire
// session chain (see auth_router.py's /auth/refresh docstring). This app has
// three independent RTK Query clients (src/api/index.ts, authApi.ts,
// orgApi.ts — job-service's own client makes a fourth), each with its own
// baseQueryWithReauth that calls handleRefreshToken() on a 401. With no
// coordination, a page that fires several queries at once against an
// already-expired access token causes each one to 401 in the same tick and
// each one to call this function independently — several concurrent
// POST /auth/refresh calls carrying the SAME refresh token. One wins and
// rotates it; every other caller then presents an already-used token, which
// the backend cannot distinguish from theft, and revokes the whole session —
// logging the user out immediately after what looked like a successful
// refresh.
//
// This module-level promise is the fix: the first caller in a burst starts
// the real request and stores the in-flight promise here; every other caller
// arriving before it settles just awaits that same promise instead of firing
// its own. Cleared in `finally` so the next genuine expiry starts a fresh
// call rather than replaying a stale result.
let inFlightRefresh: Promise<RefreshedTokens | null> | null = null;

// Fixes: a revoked/password-changed session used to keep rendering the full
// authenticated app — PrivateRoute's verifyAuthToken() only decodes the JWT
// locally and checks `exp`, so a revoked-but-unexpired access token always
// passed it, and every one of this app's baseQueryWithReauth implementations
// called handleRefreshToken() on the resulting 401 but did nothing when it
// came back null. The dead end was here: performRefresh() returned null for
// literally any non-ok response and any thrown fetch error alike, so no
// caller had enough information to act.
//
// Only a server response that actually says "this refresh token is no good"
// (401/403 — expired, revoked, or reuse-detected — see the module comment
// above) or "you're rate-limited" (429, new as of the backend's rate-limiting
// change) forces the session closed here. A thrown fetch (offline blip, DNS
// hiccup, backend briefly unreachable) or any other status (5xx) is left
// alone and simply returns null like before — the caller's existing request
// fails once and the user's still-possibly-good session isn't torn down over
// a transient network/server problem.
type ForcedReauthReason = 'invalid_session' | 'rate_limited';

const forceReauthentication = (reason: ForcedReauthReason): void => {
  try {
    // clearLocalStorage() only removes the localStorage copies of the
    // access/refresh tokens. Login/index.tsx's setTokens() (see below) always
    // writes them to sessionStorage too, and getLocalStorageItem() —
    // verifyAuthToken()'s underlying read — falls back to sessionStorage
    // whenever localStorage is empty. Skipping this would leave the same
    // revoked-but-unexpired token readable there, so PublicRoute would still
    // see an "authenticated" user and bounce them straight out of /login the
    // instant we redirect to it. LogOutPage's cleanupClientSession clears
    // sessionStorage outright for the same reason; match it here.
    clearLocalStorage();
    sessionStorage.clear();
  } catch {
    // Best-effort — still redirect below even if storage access throws.
  }
  if (typeof window !== 'undefined') {
    // replace(), not href: assigning would leave the page the user was on as
    // the previous history entry, so Back from the login screen would land on
    // the (now signed-out) app instead of staying out of it.
    window.location.replace(`/login?reason=${reason}`);
  }
};

/**
 * Handles token refresh when access token expires.
 *
 * This function is called automatically by RTK Query's baseQuery when a 401 error occurs.
 * It calls authentication-service's real POST /auth/refresh endpoint directly.
 *
 * Safe to call from multiple concurrent callers: only one network request is
 * ever in flight at a time (see `inFlightRefresh` above) — every caller that
 * arrives while a refresh is already running awaits that same call instead of
 * spending the single-use refresh token a second time.
 *
 * @returns Promise with new tokens { token, refreshToken } on success, null on failure
 *
 * @flow
 * 1. Retrieves refresh token from localStorage (cfp_rtoken)
 * 2. Calls POST /auth/refresh with the refresh token in the JSON body
 * 3. Updates localStorage with new access token and refresh token
 * 4. Returns token pair for immediate use
 *
 * @example
 * // Automatic retry after token refresh
 * const tokens = await handleRefreshToken()
 * if (!tokens) {
 *   // Refresh failed. If the server actually rejected the refresh token
 *   // (invalid/revoked/rate-limited), forceReauthentication() above has
 *   // already cleared storage and redirected to /login by this point — a
 *   // caller typically has nothing left to do. A null caused instead by a
 *   // network/server hiccup leaves the session untouched, so the caller's
 *   // own request has just failed once and can be retried normally.
 * }
 *
 * @throws Errors are caught silently and null is returned
 * @see verifyTokenLogin for initial token verification
 */
export const handleRefreshToken = async (): Promise<RefreshedTokens | null> => {
  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  inFlightRefresh = performRefresh().finally(() => {
    inFlightRefresh = null;
  });
  return inFlightRefresh;
};

const performRefresh = async (): Promise<RefreshedTokens | null> => {
  const refreshToken = getLocalStorageItem(LOCALSTORAGE_KEYS.REFRESH);
  if (!refreshToken) {
    return null;
  }

  // No client-side expiry pre-check: authentication-service's refresh tokens
  // are opaque (id.secret), not JWTs — see RefreshTokenRequest/TokenResponse
  // in its API contract. jwtDecode() on one throws (it isn't a
  // header.payload.signature structure), which used to happen silently
  // whenever the fake dev-bypass token (which IS JWT-shaped) wasn't sitting
  // in this slot. The backend call below is the only real way to learn
  // whether a refresh token is still good.
  let response: Response;
  try {
    response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_ENDPOINT}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '69420',
      },
      // Sent in the body, not an Authorization header — that's how
      // authentication-service's RefreshTokenRequest expects it.
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      forceReauthentication('invalid_session');
    } else if (response.status === 429) {
      // New as of the backend's rate-limiting change: /auth/refresh can now
      // 429 on too many FAILED attempts from one IP. Still forces the same
      // clear-and-redirect — leaving it alone would strand the user on a
      // broken authenticated UI with every subsequent call 401ing forever
      // (the access token that triggered this refresh is already dead) —
      // but tags the redirect so Login can show "too many attempts" instead
      // of the generic session-expired message.
      forceReauthentication('rate_limited');
    }
    return null;
  }

  const body = await response.json();
  // This endpoint sits behind authentication-service's ResponseEnvelopeMiddleware
  // (wrapped_prefixes includes /api/v1), so the real payload is nested under
  // `data` — {status_code, status, message, data: {access_token, refresh_token}}.
  // Reading top-level fields here silently produced { token: undefined,
  // refreshToken: undefined }, which setTokens() then wrote into localStorage
  // as the literal string "undefined".
  const payload = body?.data ?? body;
  if (!payload?.access_token || !payload?.refresh_token) {
    return null;
  }

  const tokens = { token: payload.access_token, refreshToken: payload.refresh_token };
  setTokens(tokens.token, tokens.refreshToken);
  return tokens;
};

/**
 * Exits impersonation session and restores original user credentials.
 *
 * This function is called when a user wants to exit an impersonation session.
 * It calls the backend /auth/impersonate/exit endpoint and restores the original token.
 *
 * @param dispatch - Redux dispatch function to update LoginSlice
 *
 * @returns Promise<boolean> - true if exit successful, false otherwise
 *
 * @flow
 * 1. Retrieves original token from localStorage (cfp_original_token)
 * 2. Calls backend /auth/impersonate/exit endpoint
 * 3. Removes impersonation flags from localStorage
 * 4. Restores original token and user data to localStorage and Redux
 * 5. Redirects to dashboard
 *
 * @example
 * // Exit impersonation session
 * const success = await exitImpersonation(dispatch)
 * if (success) {
 *   showToast('Impersonation exited successfully')
 *   navigate('/') // Redirect to dashboard
 * }
 *
 * @throws Errors logged to console and null is returned
 */
export const exitImpersonation = async (dispatch: AppDispatch): Promise<boolean> => {
  try {
    const impersonationToken =
      sessionStorage.getItem(LOCALSTORAGE_KEYS.ACCESS) ||
      getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);
    const originalToken =
      sessionStorage.getItem('cfp_original_token') || localStorage.getItem('cfp_original_token');

    if (!impersonationToken) {
      console.error('No impersonation token found');
      clearImpersonationStorage();
      return false;
    }

    try {
      const decodedImpersonationToken = jwtDecode<{ exp: number }>(impersonationToken);
      const isTokenExpired = decodedImpersonationToken.exp <= Math.floor(Date.now() / 1000);

      if (isTokenExpired) {
        console.warn('Impersonation token expired. Clearing local state.');
        clearImpersonationStorage();

        if (originalToken) {
          try {
            setTokens(originalToken, originalToken);

            const originalRoleStr =
              sessionStorage.getItem('cfp_original_role') ||
              localStorage.getItem('cfp_original_role');
            const originalRole = originalRoleStr
              ? JSON.parse(originalRoleStr)
              : { name: 'User', type: 'user' };

            const decodedOriginal = jwtDecode<{
              sub: string;
              roles: string[];
              authorities: string[];
              originalRole?: string;
            }>(originalToken);

            dispatch(
              loginStore({
                token: originalToken,
                refreshToken: originalToken,
                rememberMe: false,
                authorities: decodedOriginal.authorities || decodedOriginal.roles,
                canManageCompanySettings: extractCanManageCompanySettings(originalToken),
                role: originalRole,
              })
            );
          } catch (restoreError) {
            console.error('Failed to restore original token:', restoreError);
          }
        }

        return true;
      }
    } catch (decodeError) {
      console.error('Failed to decode impersonation token:', decodeError);
      clearImpersonationStorage();
      return false;
    }

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_ENDPOINT}${import.meta.env.VITE_BACKEND_PREFIX}/auth/impersonate/exit`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${impersonationToken}`,
          },
        }
      );

      if (response.data?.success) {
        if (originalToken) {
          setTokens(originalToken, originalToken);

          const originalRoleStr =
            sessionStorage.getItem('cfp_original_role') ||
            localStorage.getItem('cfp_original_role');
          const originalRole = originalRoleStr
            ? JSON.parse(originalRoleStr)
            : { name: 'User', type: 'user' };

          const decodedToken = jwtDecode<{
            sub: string;
            roles: string[];
            authorities: string[];
            originalRole?: string;
          }>(originalToken);

          dispatch(
            loginStore({
              token: originalToken,
              refreshToken: originalToken,
              rememberMe: false,
              authorities: decodedToken.authorities || decodedToken.roles,
              canManageCompanySettings: extractCanManageCompanySettings(originalToken),
              role: originalRole,
            })
          );
        }

        // Clear all impersonation metadata
        clearImpersonationStorage();
        return true;
      } else {
        // API returned failure, but still clear local state and restore if possible
        console.error('Backend exit failed:', response.data?.message);
        clearImpersonationStorage();

        if (originalToken) {
          try {
            setTokens(originalToken, originalToken);
            const originalRoleStr =
              sessionStorage.getItem('cfp_original_role') ||
              localStorage.getItem('cfp_original_role');
            const originalRole = originalRoleStr
              ? JSON.parse(originalRoleStr)
              : { name: 'User', type: 'user' };

            const decodedToken = jwtDecode<{
              sub: string;
              roles: string[];
              authorities: string[];
              originalRole?: string;
            }>(originalToken);

            dispatch(
              loginStore({
                token: originalToken,
                refreshToken: originalToken,
                rememberMe: false,
                authorities: decodedToken.authorities || decodedToken.roles,
                canManageCompanySettings: extractCanManageCompanySettings(originalToken),
                role: originalRole,
              })
            );
          } catch (restoreError) {
            console.error('Failed to restore original token after API failure:', restoreError);
          }
        }

        return false;
      }
    } catch (apiError) {
      console.error('Exit impersonation API error:', apiError);
      clearImpersonationStorage();

      if (originalToken) {
        try {
          setTokens(originalToken, originalToken);

          const originalRoleStr =
            sessionStorage.getItem('cfp_original_role') ||
            localStorage.getItem('cfp_original_role');
          const originalRole = originalRoleStr
            ? JSON.parse(originalRoleStr)
            : { name: 'User', type: 'user' };

          const decodedToken = jwtDecode<{
            sub: string;
            roles: string[];
            authorities: string[];
            originalRole?: string;
          }>(originalToken);

          dispatch(
            loginStore({
              token: originalToken,
              refreshToken: originalToken,
              rememberMe: false,
              authorities: decodedToken.authorities || decodedToken.roles,
              canManageCompanySettings: extractCanManageCompanySettings(originalToken),
              role: originalRole,
            })
          );

          console.warn('Impersonation state cleared locally despite API error');
          return true;
        } catch (restoreError) {
          console.error('Failed to restore original token after API error:', restoreError);
          return false;
        }
      }

      return false;
    }
  } catch (error) {
    console.error('Unexpected error in exitImpersonation:', error);
    clearImpersonationStorage();
    return false;
  }
};
