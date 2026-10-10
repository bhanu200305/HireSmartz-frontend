// The email an accepted invitation hands to the login page. It comes through
// router state (`prefillEmail`) and also as `?email=` in the address, because
// router state is lost on a reload or a hard redirect. The login page cleans
// both from the address right after reading them, so a second mount of the page
// (React StrictMode, a re-render of the route) would otherwise start empty;
// `pendingInvitedEmail` remembers the value for that case only.

let pendingInvitedEmail = '';
let forgetTimer: ReturnType<typeof setTimeout> | null = null;
// Only meant to bridge a remount right after arriving, never to linger (a later
// visit to the login page, e.g. after logout, must start empty).
const PENDING_TTL_MS = 5000;

/** The email to prefill: router state, else `?email=`, else a value read earlier. */
export const resolvePrefillEmail = (
  state: { prefillEmail?: string } | null | undefined,
  search: string
): string => {
  const fromState = state?.prefillEmail?.trim();
  const fromQuery = new URLSearchParams(search).get('email')?.trim();
  const found = fromState || fromQuery || pendingInvitedEmail;
  if ((fromState || fromQuery) && found !== pendingInvitedEmail) {
    pendingInvitedEmail = found;
    if (forgetTimer) clearTimeout(forgetTimer);
    forgetTimer = setTimeout(clearPendingInvitedEmail, PENDING_TTL_MS);
  }
  return found || '';
};

/** Forget it once the person has typed their own email or logged in. */
export const clearPendingInvitedEmail = (): void => {
  pendingInvitedEmail = '';
  if (forgetTimer) clearTimeout(forgetTimer);
  forgetTimer = null;
};

/** The query string without `email` (other params, e.g. `reason`, are kept). */
export const searchWithoutEmail = (search: string): string => {
  const params = new URLSearchParams(search);
  params.delete('email');
  const rest = params.toString();
  return rest ? `?${rest}` : '';
};
