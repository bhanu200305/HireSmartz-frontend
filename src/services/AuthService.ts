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
 * It validates the refresh token expiry and calls the backend /auth/refresh endpoint.
 *
 * @returns Promise with new tokens { token, refreshToken } on success, null on failure
 *
 * @flow
 * 1. Retrieves refresh token from localStorage (cfp_rtoken)
 * 2. Decodes JWT to check expiry date
 * 3. If refresh token expired, returns null (user must re-login)
 * 4. Calls POST /auth/refresh with refresh token
 * 5. Updates localStorage with new access token and refresh token
 * 6. Returns token pair for immediate use
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
  const decodedToken = jwtDecode<{ exp: number }>(refreshToken);
  if (decodedToken.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  const response = await fetch(
    `${import.meta.env.VITE_BACKEND_ENDPOINT}${import.meta.env.VITE_BACKEND_PREFIX}/auth/refresh`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshToken}`,
        'ngrok-skip-browser-warning': '69420',
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  setTokens(data.token, data.refreshToken);
  return data as { token: string; refreshToken: string };
};

/**
 * Verifies a login token and initializes Redux store with user data.
 *
 * This function is used for SSO flows, magic link authentication, or initial token verification.
 * It calls the backend /auth/verify endpoint and populates the Redux LoginSlice.
 *
 * @param token - JWT token to verify (from URL param, magic link, etc.)
 * @param dispatch - Redux dispatch function to update LoginSlice
 *
 * @returns Promise with token pair { token, refreshToken } on success, null on failure
 *
 * @flow
 * 1. Calls backend /auth/verify endpoint with token
 * 2. Backend validates token and returns:
 *    - accessToken: New access token
 *    - refreshToken: Refresh token for future use
 *    - roleName: User role (e.g., 'Hiring Manager')
 *    - roleType: Role type (e.g., 'HIRING_MANAGER')
 *    - authorities: Array of user authorities/permissions
 * 3. Stores tokens in localStorage
 * 4. Dispatches loginStore action to Redux with user data
 *
 * @example
 * // Verify magic link token during SSO
 * const tokens = await verifyTokenLogin(token, dispatch)
 * if (!tokens) {
 *   showError('Invalid or expired link')
 *   return
 * }
 * // User is now logged in with data in Redux
 * navigate('/dashboard')
 *
 * @throws Errors logged to console and null is returned
 */
export const verifyTokenLogin = async (
  token: string,
  dispatch: AppDispatch
): Promise<{ token: string; refreshToken: string } | null> => {
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_BACKEND_ENDPOINT}${import.meta.env.VITE_BACKEND_PREFIX}/auth/verify`,
      {
        params: { token },
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': '69420',
        },
      }
    );

    const { token: accessToken, refreshToken, roleName, roleType, authorities } = response.data;
    const canManageCompanySettings = extractCanManageCompanySettings(accessToken);

    clearImpersonationStorage();

    setTokens(accessToken, refreshToken);

    dispatch(
      loginStore({
        token: accessToken,
        refreshToken,
        rememberMe: false,
        authorities,
        canManageCompanySettings,
        role: {
          name: roleName,
          type: roleType,
        },
      })
    );

    return { token: accessToken, refreshToken };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
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
