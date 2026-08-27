import { get, set } from 'lodash-es';
import { jwtDecode } from 'jwt-decode';
import { LOCALSTORAGE_KEYS } from '../../../constants/webAPI';

export const getLocalStorageItem = (key: string): any | null => {
  let item: string | null = null;
  try {
    item = get(localStorage, key);
    // The access/refresh tokens are the one thing ~35 call sites across
    // this app read through this same generic helper
    // (`getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS)`), but Login/index.tsx
    // writes them to sessionStorage UNCONDITIONALLY on every login path,
    // and to localStorage only via `setTokens` — a real, working call today,
    // but a second step nonetheless, and a component like Header.tsx that
    // read localStorage exclusively went stale for an entire session's
    // worth of the profile/logout UI in exactly this gap (see Header's own
    // fix comment). Falling back to sessionStorage here for just these two
    // keys — the same fallback order `isImpersonationActive`/
    // `validateImpersonationSessionOwnership` below already use — fixes
    // every one of those call sites at once instead of chasing each one
    // individually, and matches this file's own established precedent
    // rather than inventing a new one.
    if (!item && (key === LOCALSTORAGE_KEYS.ACCESS || key === LOCALSTORAGE_KEYS.REFRESH)) {
      item = sessionStorage.getItem(key);
    }
    return item ? JSON.parse(JSON.stringify(item)) : null;
  } catch {
    // console.error(`Error retrieving item from localStorage: ${error}`)
    return item;
  }
};

export const setLocalStorageItem = (key: string, value: any): void => {
  try {
    set(localStorage, key, JSON.stringify(value));
  } catch {
    // console.error(`Error setting item in localStorage: ${error}`)
  }
};

export const removeLocalStorageItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    // console.error(`Error removing item from localStorage: ${error}`)
  }
};

const IMPERSONATION_STORAGE_KEYS = [
  'cfp_impersonating',
  'cfp_original_token',
  'cfp_original_role',
  'cfp_impersonation_org',
  'cfp_impersonation_role',
  'cfp_impersonated_user_id',
  'cfp_original_admin_id',
];

export const clearImpersonationStorage = (): void => {
  try {
    IMPERSONATION_STORAGE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  } catch {
    // console.error(`Error clearing impersonation storage: ${error}`)
  }
};

export const clearLegacyImpersonationLocalStorage = (): void => {
  try {
    IMPERSONATION_STORAGE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch {
    // console.error(`Error clearing legacy impersonation localStorage: ${error}`)
  }
};

type AuthTokenClaims = {
  exp?: number;
  impersonating?: boolean;
};

export const isImpersonationActive = (tokenFromContext?: string | null): boolean => {
  try {
    const impersonationFlag = sessionStorage.getItem('cfp_impersonating') === 'true';
    if (!impersonationFlag) {
      return false;
    }

    const token =
      tokenFromContext ||
      sessionStorage.getItem(LOCALSTORAGE_KEYS.ACCESS) ||
      localStorage.getItem(LOCALSTORAGE_KEYS.ACCESS);

    if (!token) {
      return false;
    }

    const decoded = jwtDecode<AuthTokenClaims>(token);

    if (typeof decoded.exp === 'number' && decoded.exp <= Math.floor(Date.now() / 1000)) {
      return false;
    }

    return decoded.impersonating === true;
  } catch {
    return false;
  }
};

export const validateImpersonationSessionOwnership = (): void => {
  try {
    const impersonationFlag = sessionStorage.getItem('cfp_impersonating') === 'true';
    const impersonatedUserId = sessionStorage.getItem('cfp_impersonated_user_id');
    const originalAdminId = sessionStorage.getItem('cfp_original_admin_id');

    const token =
      sessionStorage.getItem(LOCALSTORAGE_KEYS.ACCESS) ||
      localStorage.getItem(LOCALSTORAGE_KEYS.ACCESS);

    if (!impersonationFlag) {
      if (impersonatedUserId || originalAdminId) {
        clearImpersonationStorage();
      }
      return;
    }

    if (!token || !impersonatedUserId || !originalAdminId) {
      clearImpersonationStorage();
      return;
    }

    const decoded = jwtDecode<AuthTokenClaims & { userId?: string | number }>(token);
    const currentUserId = decoded?.userId != null ? String(decoded.userId) : null;

    if (!currentUserId || currentUserId !== String(impersonatedUserId)) {
      clearImpersonationStorage();
      return;
    }

    if (String(originalAdminId) === String(impersonatedUserId)) {
      clearImpersonationStorage();
    }
  } catch {
    clearImpersonationStorage();
  }
};

export const clearLocalStorage = (): void => {
  try {
    removeLocalStorageItem('persist:root');
    removeLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);
    removeLocalStorageItem(LOCALSTORAGE_KEYS.REFRESH);
    removeLocalStorageItem(LOCALSTORAGE_KEYS.USER);
    removeLocalStorageItem(LOCALSTORAGE_KEYS.ACTIVE_TAB);
    removeLocalStorageItem(LOCALSTORAGE_KEYS.ROLE);

    const recentSearchPrefix = 'cfp_recent_global_searches';
    Object.keys(localStorage)
      .filter((key) => key.startsWith(recentSearchPrefix))
      .forEach((key) => removeLocalStorageItem(key));

    clearImpersonationStorage();
  } catch {
    // console.error(`Error clearing localStorage: ${error}`)
  }
};

export const setTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem(LOCALSTORAGE_KEYS.ACCESS, accessToken);
  localStorage.setItem(LOCALSTORAGE_KEYS.REFRESH, refreshToken);
  sessionStorage.setItem(LOCALSTORAGE_KEYS.ACCESS, accessToken);
  sessionStorage.setItem(LOCALSTORAGE_KEYS.REFRESH, refreshToken);
};
