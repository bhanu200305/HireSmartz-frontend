/**
 * DEV-ONLY AUTH BYPASS
 * =====================
 * The backend team hasn't handed over a working login endpoint yet, so this lets
 * the frontend be developed/demoed without a real authentication flow.
 *
 * Enable it by setting VITE_BYPASS_AUTH=true in your .env.local (see .env.example).
 * It is OFF by default and does nothing unless that flag is explicitly set to 'true'.
 *
 * What it does when enabled:
 *  - Fabricates a fake (unsigned, client-side-only) JWT with plausible claims so that
 *    every place in the app that decodes the access token (PrivateRoute, permission
 *    checks, tenant/user id lookups, etc.) has something consistent to read.
 *  - Seeds localStorage/sessionStorage the same way a real login would (via setTokens),
 *    so it doesn't need a parallel code path.
 *  - Provides a LoginSlice payload so Redux state (role, authorities, canManageCompanySettings)
 *    looks "logged in" too, since some UI reads from Redux instead of the token directly.
 *
 * IMPORTANT: This does not talk to, mock, or replace any real backend call — API requests
 * will still hit VITE_BACKEND_ENDPOINT and will fail/404 until the real backend is wired up.
 * This only unblocks client-side route/UI gating. Remove or keep the flag OFF for any
 * build that talks to a real environment.
 */

type DevBypassLoginPayload = {
  token: string;
  authorities: string[];
  rememberMe: boolean;
  canManageCompanySettings: boolean;
  role: { name: string; type: string };
  userId: string;
  refreshToken: string;
};

const DEV_BYPASS_USER_ID = 'dev-bypass-user';

export const isDevAuthBypassEnabled = (): boolean => {
  return import.meta.env.VITE_BYPASS_AUTH === 'true';
};

const base64UrlEncode = (obj: Record<string, unknown>): string => {
  const json = JSON.stringify(obj);
  const base64 = window.btoa(json);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/**
 * Builds a fake, unsigned JWT (header.payload.signature) purely for client-side decoding.
 * It is never sent to / verified by a real server — it only satisfies jwtDecode() calls
 * scattered around the app so the UI has claims to read.
 */
export const createDevBypassToken = (): string => {
  const header = { alg: 'none', typ: 'JWT' };
  const nowSeconds = Math.floor(Date.now() / 1000);
  const tenYearsFromNow = nowSeconds + 10 * 365 * 24 * 60 * 60;

  const payload = {
    userId: DEV_BYPASS_USER_ID,
    tenant_id: 'dev-bypass-tenant',
    role_id: 'dev-bypass-role',
    organization_id: 'dev-bypass-org',
    session_id: 'dev-bypass-session',
    email: 'dev-bypass@careerforcepro.local',
    canManageCompanySettings: true,
    impersonating: false,
    exp: tenYearsFromNow,
  };

  return `${base64UrlEncode(header)}.${base64UrlEncode(payload)}.devbypass`;
};

export const getDevBypassLoginPayload = (token: string): DevBypassLoginPayload => ({
  token,
  authorities: ['*'],
  rememberMe: true,
  canManageCompanySettings: true,
  role: { name: 'Dev Bypass Owner', type: 'owner' },
  userId: DEV_BYPASS_USER_ID,
  refreshToken: token,
});

let warnedOnce = false;

/**
 * Idempotent: only writes tokens if none exist yet, so it won't stomp on a real
 * session if someone does manage to log in for real while the flag is on.
 * Returns the token in use (existing or freshly created) so callers can also
 * hydrate Redux state with it.
 */
export const ensureDevBypassTokens = (
  existingAccessToken: string | null,
  setTokens: (accessToken: string, refreshToken: string) => void
): string => {
  if (!warnedOnce) {
    console.warn(
      '[devAuthBypass] VITE_BYPASS_AUTH is enabled — using a fake local session instead of real login. ' +
        'Do not enable this against a real backend/environment.'
    );
    warnedOnce = true;
  }

  if (existingAccessToken) {
    return existingAccessToken;
  }

  const token = createDevBypassToken();
  setTokens(token, token);
  return token;
};
