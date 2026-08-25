import { jwtDecode } from 'jwt-decode';
import { LOCALSTORAGE_KEYS } from '../constants/webAPI';
import {
  clearImpersonationStorage,
  getLocalStorageItem,
  setTokens,
} from '../shared/utils/auth/localstorage.helpers';
import { loginStore } from '../redux/slices/loginSlice';
import { AppDispatch } from '../redux/provider/store';
import axios from 'axios';
import { extractCanManageCompanySettings } from '../shared/utils/auth/permission.helpers';

/**
 * Handles token refresh when access token expires.
 *
 * This function is called automatically by RTK Query's baseQuery when a 401 error occurs.
 * It calls authentication-service's real POST /auth/refresh endpoint directly.
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
 *   // Refresh failed, redirect to login
 *   navigate('/login')
 * }
 *
 * @throws Errors are caught silently and null is returned
 * @see verifyTokenLogin for initial token verification
 */
export const handleRefreshToken = async (): Promise<{
  token: string;
  refreshToken: string;
} | null> => {
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
