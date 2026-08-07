/**
 * DEV-ONLY DEMO LOGIN
 * =====================
 * The backend team hasn't handed over a working login endpoint yet, so the app still
 * needs a way to get past the login page during development/demos.
 *
 * Unlike the old version of this file, nothing here auto-logs anyone in on app load —
 * the login page (src/components/Login/index.tsx) is always shown first to an
 * unauthenticated visitor. What this file provides is a single seeded demo credential
 * that the login form accepts *instead of* calling the real backend, plus the fake
 * token/session-shape that credential logs you into.
 *
 * Enable it by setting VITE_BYPASS_AUTH=true in your .env.local (see .env.example).
 * It is OFF by default and does nothing unless that flag is explicitly set to 'true'.
 * While it's on:
 *  - Submitting the seeded email/password (DEV_SEED_CREDENTIALS below) on the login
 *    form logs you in locally, without hitting the backend.
 *  - The DevRoleSwitcher widget (bottom-right) is available so any role defined in
 *    ROLE_AUTHORITIES can be previewed post-login.
 *
 * What the seeded login does:
 *  - Fabricates a fake (unsigned, client-side-only) JWT with plausible claims so that
 *    every place in the app that decodes the access token (PrivateRoute, permission
 *    checks, tenant/user id lookups, etc.) has something consistent to read.
 *  - Seeds localStorage/sessionStorage the same way a real login would (via setTokens),
 *    so it doesn't need a parallel code path.
 *  - Provides a LoginSlice payload so Redux state (role, authorities, canManageCompanySettings)
 *    looks "logged in" too, since some UI reads from Redux instead of the token directly.
 *
 * IMPORTANT: This does not talk to, mock, or replace any real backend call — any other
 * credentials still go through the real API (which will fail/404 until the real backend
 * is wired up). Remove or keep the flag OFF for any build that talks to a real environment.
 */

/** The one seeded credential the login page accepts while there's no real backend. */
export const DEV_SEED_CREDENTIALS = {
  email: 'admin@cfp.com',
  password: 'admin123',
};

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

/** One-time console warning that the seeded demo login was used, not a real backend call. */
export const warnDevBypassUsedOnce = (): void => {
  if (warnedOnce) return;
  console.warn(
    '[devAuthBypass] Logged in with the seeded demo credential — using a fake local session, ' +
      'not a real backend login. Do not enable VITE_BYPASS_AUTH against a real environment.'
  );
  warnedOnce = true;
};
