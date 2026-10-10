import { useEffect, useReducer, useRef, useState } from 'react';
import { Button, Input, PasswordInput, showToast } from '..';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Checkbox } from 'antd';
import {
  useLoginMutation,
  LoginRequest,
  LoginTokenResponse,
  MfaRequiredResponse,
  isMfaRequiredResponse,
} from '../../api/authentication-service/Login/login';
import { useResendVerificationMutation } from '../../api/authentication-service/EmailVerification/resendVerification';
import { useDispatch } from 'react-redux';
import { loginStore } from '../../redux/slices/loginSlice';
import { z } from 'zod';
import { clearPendingInvitedEmail, resolvePrefillEmail, searchWithoutEmail } from './prefillEmail';
import { Loader } from '../shared/ui/loader';
import './login.css';
import Footer from '../Footer';
import MfaChallengeStep from './MfaChallengeStep';
import {
  clearImpersonationStorage,
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
  setTokens,
} from '../../shared/utils/auth/localstorage.helpers';
import {
  extractCanManageCompanySettings,
  PLATFORM_CALLER_ROLE_NAME,
} from '../../shared/utils/auth/permission.helpers';
import { getAuthErrorCode, getAuthErrorMessage } from '../../shared/utils/auth/authError.helpers';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import { jwtDecode } from 'jwt-decode';
import { useLazyGetUserDashboardQuery } from '../../api/organization-service/Roles/dashboard';
import { useLazyGetOwnPlatformProfileQuery } from '../../api/organization-service/Platform/staff';
import {
  isDevAuthBypassEnabled,
  createDevBypassToken,
  getDevBypassLoginPayload,
  warnDevBypassUsedOnce,
  DEV_SEED_CREDENTIALS,
} from '../../shared/utils/auth/devAuthBypass';
import { devUserStore, InvitedUser } from '../../shared/utils/dev/devUserStore';
import { devRoleStore } from '../../shared/utils/dev/devRoleStore';
import { api } from '../../api';
import { interviewApi } from '../../api/interview-service/client';
import { publicApplyApi } from '../../api/candidate-service/PublicApply';
import { candidateApi } from '../../api/candidate-service/candidateApi';
import { orgApi } from '../../api/organization-service/orgApi';
import { notifApi } from '../../api/notification-service/notifApi';
import { jobApi } from '../../api/job-service/jobApi';
import { aiApi } from '../../api/ai-service/aiApi';
import { authApi } from '../../api/authentication-service/authApi';

// Resets every RTK Query slice's cache — avoids a cross-tenant data flash
// on login when the previous session's cache is still in memory.
const resetAllApiCaches = (dispatch: ReturnType<typeof useDispatch>) => {
  dispatch(api.util.resetApiState());
  dispatch(jobApi.util.resetApiState());
  dispatch(orgApi.util.resetApiState());
  dispatch(candidateApi.util.resetApiState());
  dispatch(interviewApi.util.resetApiState());
  dispatch(publicApplyApi.util.resetApiState());
  dispatch(notifApi.util.resetApiState());
  dispatch(aiApi.util.resetApiState());
  dispatch(authApi.util.resetApiState());
};

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required.')
    .email('Enter a valid email address.')
    .transform((val) => val.trim())
    .refine((val) => !val.includes(' '), 'Email cannot contain spaces.'),
  password: z.string().min(1, 'Password is required.'),
});

type FormErrors = {
  email?: string;
  password?: string;
};

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isSubmitting = useRef(false);
  // Set only when POST /login returns status: "mfa_required" — while this is
  // non-null the card renders MfaChallengeStep instead of the password form.
  // Local state, not Redux: it is meaningless outside this page and holds a
  // short-lived interim token, not anything worth surviving a refresh.
  const [mfaChallenge, setMfaChallenge] = useState<MfaRequiredResponse | null>(null);
  // Set when login fails with error_code "email_not_verified" — offers a
  // resend action instead of leaving the visitor at a dead-end toast.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendVerification, { isLoading: isResendingVerification }] =
    useResendVerificationMutation();
  // Set when login fails with error_code "account_locked" — a password
  // reset clears the lockout immediately (same effect as an admin's manual
  // unlock, see AdminTools/UnlockUserSection.tsx), so this points there
  // instead of leaving the visitor stuck on the generic toast with no way
  // forward besides waiting out the lockout.
  const [isAccountLocked, setIsAccountLocked] = useState(false);

  // StrictMode (dev only) double-invokes this mount effect within the same
  // render, before the replace-navigate below has a chance to clear
  // location.state — so both passes see the same successMessage and, without
  // this guard, two toasts fire for one logout. Same pattern as LogOutPage's
  // hasStartedLogoutRef.
  const hasShownSuccessToastRef = useRef(false);

  useEffect(() => {
    if (hasShownSuccessToastRef.current) return;
    const state = location.state as { successMessage?: string; prefillEmail?: string } | null;
    const hasEmailParam = new URLSearchParams(location.search).has('email');
    if (state?.successMessage) {
      hasShownSuccessToastRef.current = true;
      showToast({ message: state.successMessage, type: 'success' });
    }
    if (state?.successMessage || state?.prefillEmail || hasEmailParam) {
      hasShownSuccessToastRef.current = true;
      // Clear the state so neither the toast nor the prefilled email
      // re-appears on refresh/back — the latter especially shouldn't linger
      // in history state on a shared machine. The email itself was already
      // read into localState's initial value below before this runs.
      // The `?email=` parameter goes too (other parameters, e.g. `reason`, stay
      // for the effect below to read).
      navigate(
        { pathname: location.pathname, search: searchWithoutEmail(location.search) },
        { replace: true, state: {} }
      );
    }
  }, []);

  // AuthService.ts's forceReauthentication() lands here via a hard
  // window.location.href redirect (not a react-router navigate), so it has
  // no way to hand this page a location.state — it tags the reason on the
  // URL instead. Reads it once on mount and strips it the same way the
  // successMessage effect above strips its own state, so a refresh of
  // /login doesn't keep re-showing a stale toast.
  const hasShownReasonToastRef = useRef(false);
  useEffect(() => {
    if (hasShownReasonToastRef.current) return;
    const reason = new URLSearchParams(location.search).get('reason');
    if (!reason) return;
    hasShownReasonToastRef.current = true;

    if (reason === 'rate_limited') {
      showToast({
        message: 'Too many attempts. Please wait a few minutes and try again.',
        type: 'error',
      });
    } else if (reason === 'invalid_session') {
      showToast({
        message: 'Your session is no longer valid. Please log in again.',
        type: 'error',
      });
    }
    navigate(location.pathname, { replace: true, state: location.state ?? {} });
  }, []);

  const [localState, setLocalState] = useReducer(
    (prevState, newState) => ({ ...prevState, ...newState }),
    {
      email: resolvePrefillEmail(
        location.state as { prefillEmail?: string } | null,
        location.search
      ),
      password: '',
      errors: {} as FormErrors,
      rememberMe: Boolean(getLocalStorageItem(LOCALSTORAGE_KEYS.REMEMBER_ME)) === true,
      isFormValid: false,
    }
  );
  const encrypt = (text: string) => btoa(text);
  const decrypt = (text: string) => {
    try {
      return atob(text);
    } catch {
      return '';
    }
  };
  const { email, password, errors, rememberMe, isFormValid } = localState;
  const [login, { isLoading }] = useLoginMutation();
  const [fetchUserDashboard] = useLazyGetUserDashboardQuery();
  const [fetchOwnPlatformProfile] = useLazyGetOwnPlatformProfileQuery();

  useEffect(() => {
    // An email from an accepted invitation wins over saved credentials (which
    // belong to someone else on this browser).
    if (resolvePrefillEmail(null, '')) return;
    if (rememberMe) {
      const savedCredentials = getLocalStorageItem(LOCALSTORAGE_KEYS.REMEMBER_CREDENTIALS);
      if (savedCredentials) {
        try {
          const { email: savedEmail, password: savedPassword } = JSON.parse(savedCredentials);
          const decryptedPassword = decrypt(savedPassword);
          setLocalState({ email: savedEmail, password: decryptedPassword });
          // Validate autofilled credentials
          setTimeout(() => {
            const result = loginSchema.safeParse({
              email: savedEmail,
              password: decryptedPassword,
            });
            if (result.success) {
              setLocalState({
                errors: { email: '', password: '' },
                isFormValid: true,
              });
            }
          }, 0);
        } catch {
          showToast({ message: 'Failed to parse remembered credentials', type: 'error' });
        }
      }
    }
  }, [rememberMe]);

  // Real-time validation with shouldValidate: true
  const validateForm = (emailValue: string = email, passwordValue: string = password): boolean => {
    const result = loginSchema.safeParse({ email: emailValue, password: passwordValue });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setLocalState({
        errors: {
          email: fieldErrors.email ? fieldErrors.email[0] : '',
          password: fieldErrors.password ? fieldErrors.password[0] : '',
        },
        isFormValid: false,
      });
      return false;
    }

    setLocalState({
      errors: { email: '', password: '' },
      isFormValid: true,
    });
    return true;
  };

  const onHandleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    // Trim spaces and prevent spaces inside email
    let processedValue = value;
    if (name === 'email') {
      processedValue = value.replace(/\s/g, ''); // Remove all spaces from email
    }

    // Typing an email of their own ends the invited-email prefill.
    if (name === 'email') clearPendingInvitedEmail();
    setLocalState({ [name]: processedValue });

    // Real-time validation with shouldValidate: true
    setTimeout(() => {
      if (name === 'email') {
        validateForm(processedValue, password);
      } else if (name === 'password') {
        validateForm(email, processedValue);
      }
    }, 0);
  };

  // Logs a seeded demo credential straight into the app the same way a real login
  // would, without calling the (nonexistent) backend. See devAuthBypass.ts.
  const completeSeededLogin = (loggedInEmail: string) => {
    warnDevBypassUsedOnce();
    const token = createDevBypassToken();
    const payload = getDevBypassLoginPayload(token);

    clearImpersonationStorage();
    sessionStorage.setItem(LOCALSTORAGE_KEYS.ACCESS, token);
    sessionStorage.setItem(LOCALSTORAGE_KEYS.REFRESH, token);

    if (rememberMe) {
      setTokens(token, token);
      setLocalStorageItem(LOCALSTORAGE_KEYS.REMEMBER_ME, 'true');
      setLocalStorageItem(LOCALSTORAGE_KEYS.ROLE, payload.role);
      setLocalStorageItem(LOCALSTORAGE_KEYS.REMEMBER_CREDENTIALS, {
        email: loggedInEmail,
        password: encrypt(password),
      });
    } else {
      setTokens(token, token);
      setLocalStorageItem(LOCALSTORAGE_KEYS.ROLE, payload.role);
      removeLocalStorageItem(LOCALSTORAGE_KEYS.REMEMBER_ME);
      removeLocalStorageItem(LOCALSTORAGE_KEYS.REMEMBER_CREDENTIALS);
    }

    resetAllApiCaches(dispatch);
    dispatch(loginStore(payload));
    showToast({ message: 'Login successful (demo mode)', type: 'success' });

    const fromPath = location.state?.from?.pathname || '/';
    const fromSearch = location.state?.from?.search || '';
    const safePath = fromPath === '/logout' ? '/' : fromPath;
    navigate(safePath + fromSearch, { replace: true });
  };

  // Logs in a locally-invited user (see Roles & Permissions -> Invite User)
  // with exactly the permissions/location their assigned role carries — the
  // "portal" the invite promised, built entirely client-side since there's
  // no backend to issue a real token from yet.
  const completeInvitedUserLogin = (user: InvitedUser) => {
    const assignedRole = devRoleStore.getById(user.roleId);
    if (!assignedRole) {
      showToast({
        message: 'The role this invite was created with no longer exists.',
        type: 'error',
      });
      return;
    }

    warnDevBypassUsedOnce();
    const token = createDevBypassToken();
    const roleForStorage = {
      name: assignedRole.roleName,
      type: assignedRole.scope === 'platform' ? 'owner' : 'organization',
    };

    clearImpersonationStorage();
    sessionStorage.setItem(LOCALSTORAGE_KEYS.ACCESS, token);
    sessionStorage.setItem(LOCALSTORAGE_KEYS.REFRESH, token);

    if (rememberMe) {
      setTokens(token, token);
      setLocalStorageItem(LOCALSTORAGE_KEYS.REMEMBER_ME, 'true');
      setLocalStorageItem(LOCALSTORAGE_KEYS.ROLE, roleForStorage);
      setLocalStorageItem(LOCALSTORAGE_KEYS.REMEMBER_CREDENTIALS, {
        email: user.email,
        password: encrypt(password),
      });
    } else {
      setTokens(token, token);
      setLocalStorageItem(LOCALSTORAGE_KEYS.ROLE, roleForStorage);
      removeLocalStorageItem(LOCALSTORAGE_KEYS.REMEMBER_ME);
      removeLocalStorageItem(LOCALSTORAGE_KEYS.REMEMBER_CREDENTIALS);
    }

    resetAllApiCaches(dispatch);
    dispatch(
      loginStore({
        token,
        authorities: assignedRole.permissions,
        rememberMe,
        canManageCompanySettings: false,
        role: roleForStorage,
        userId: user.id,
        refreshToken: token,
        resolvedRole: assignedRole,
        // devUserStore's InvitedUser predates rbac.d.ts's real (UUID string)
        // location ids and still keys locations numerically — converted
        // here, at the boundary into LoginPayload, rather than changing
        // devUserStore/devRoleStore's own numeric-id convention, which
        // Roles & Permissions' whole local dev fixture is still built on.
        activeLocationId: user.locationId != null ? String(user.locationId) : null,
        tenantId: assignedRole.scope === 'tenant' ? 'dev-bypass-tenant' : null,
        callerKind: assignedRole.scope === 'tenant' ? 'tenant' : 'platform',
      })
    );
    showToast({ message: `Welcome, ${user.firstName}! (demo mode)`, type: 'success' });

    const fromPath = location.state?.from?.pathname || '/';
    const fromSearch = location.state?.from?.search || '';
    const safePath = fromPath === '/logout' ? '/' : fromPath;
    navigate(safePath + fromSearch, { replace: true });
  };

  // Shared by a plain no-MFA login and MfaChallengeStep's onVerified callback
  // — both end at authentication-service's TokenResponse and finish exactly
  // the same way: store tokens, resolve tenant/permissions, populate Redux,
  // redirect.
  const completeRealLogin = async (tokens: LoginTokenResponse, loggedInEmail: string) => {
    const token = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    // Presence of `tenant_id` in the token, not a dedicated flag, is how the
    // backend distinguishes a platform caller (Super Admin) from a tenant user.
    const decodedToken = jwtDecode<{ sub: string; tenant_id?: string; roles?: string[] }>(token);
    const userId = decodedToken.sub || undefined;
    const tenantId = decodedToken.tenant_id ?? null;
    const callerKind: 'tenant' | 'platform' = tenantId ? 'tenant' : 'platform';
    // The `roles` claim is alphabetically sorted, and a user can hold more
    // than one role — always prefer company_admin when present rather than
    // picking whichever role happens to sort first.
    const tenantRoleName = decodedToken.roles?.includes('company_admin')
      ? 'company_admin'
      : decodedToken.roles?.[0] || '';
    const canManageCompanySettings = extractCanManageCompanySettings(token);

    clearImpersonationStorage();

    // Tokens need to be in storage before the platform-profile fetch below —
    // orgApi's own prepareHeaders reads the access token from here.
    sessionStorage.setItem(LOCALSTORAGE_KEYS.ACCESS, token);
    sessionStorage.setItem(LOCALSTORAGE_KEYS.REFRESH, refreshToken);
    setTokens(token, refreshToken);

    // `role.name` used to be hardcoded to PLATFORM_CALLER_ROLE_NAME
    // ('Master Super Admin') for every platform login regardless of actual
    // role — organization-service's PLATFORM_SCOPED_ROLES invariant really
    // was once exactly {SUPER_ADMIN}, but cfp_admin/cfp_support are real,
    // distinct platform-staff roles now (see isPlatformSuperAdminRole's own
    // comment in permission.helpers.ts), and every one of them got treated
    // as a full Super Admin client-side — wrong nav items shown
    // (Platform Metrics, Audit Log, Company Settings, ...), and every one of
    // those screens then 403'd against the real backend, which already
    // correctly enforces each role's real, narrower permissions. The JWT's
    // own `roles` claim is still empty for a platform caller (same
    // authentication-service limitation isMasterSuperAdminRole's comment
    // documents), so this resolves it from org-service's own
    // GET /v1/platform/staff/me instead — the same real source Sidebar/
    // RolesManagement already fetch reactively to work around this same gap
    // one screen at a time. Resolving it here, at login, fixes every other
    // Authorities-gated nav item/screen this session touches, in one place,
    // rather than needing an isXRole helper + a reactive refetch bolted onto
    // each one individually as each gets reported.
    //
    // Failure here (backend unreachable, endpoint not yet deployed) must not
    // block the login already completed — falls back to the pre-fix
    // behavior (full Super Admin static permissions) exactly as today,
    // never something narrower than before.
    let platformRoleName = PLATFORM_CALLER_ROLE_NAME;
    if (callerKind === 'platform') {
      try {
        const profile = await fetchOwnPlatformProfile().unwrap();
        // 'super_admin' keeps PLATFORM_CALLER_ROLE_NAME as-is — it's what
        // ROLE_AUTHORITIES.owner's `masterSuperAdmin` key already matches
        // (normalizeRoleName strips non-letters, so 'super_admin' itself
        // would NOT match that key — renaming the key is the bigger,
        // separate RBAC-catalog change noted elsewhere, not done here).
        // cfp_admin/cfp_support pass through verbatim — normalizeRoleName
        // already matches those directly against the `cfpAdmin`/`cfpSupport`
        // keys with no translation needed.
        if (profile.role === 'cfp_admin' || profile.role === 'cfp_support') {
          platformRoleName = profile.role;
        }
      } catch {
        // Degrade to PLATFORM_CALLER_ROLE_NAME (today's behavior), silently
        // — same "don't block a completed login over this" reasoning the
        // tenant branch's permissions fetch below already uses, and this
        // one has no narrower fallback to offer anyway.
      }
    }
    const role = {
      name: callerKind === 'platform' ? platformRoleName : tenantRoleName,
      type: callerKind === 'platform' ? 'owner' : 'organization',
    };

    // Tokens themselves are already written above (unconditionally, before
    // the platform-profile fetch needed them) — only the remember-me flags
    // differ by branch here.
    if (rememberMe) {
      setLocalStorageItem(LOCALSTORAGE_KEYS.REMEMBER_ME, 'true');
      setLocalStorageItem(LOCALSTORAGE_KEYS.ROLE, role);
      setLocalStorageItem(LOCALSTORAGE_KEYS.REMEMBER_CREDENTIALS, {
        email: loggedInEmail,
        password: encrypt(password),
      });
    } else {
      setLocalStorageItem(LOCALSTORAGE_KEYS.ROLE, role);
      removeLocalStorageItem(LOCALSTORAGE_KEYS.REMEMBER_ME);
      removeLocalStorageItem(LOCALSTORAGE_KEYS.REMEMBER_CREDENTIALS);
    }

    // The token itself carries no `permissions` claim by design (see the
    // decode comment above) — organization-service's
    // GET /v1/roles/users/{user_id}/permissions is the actual source of a
    // real session's effective permissions, so it's resolved once, right
    // here, rather than left empty until some later screen happens to need
    // it. A failure here must not block the login the user already
    // completed — it degrades to "no permissions yet" (useHasAccess denies
    // everything) with an explicit toast, never a silent empty grant.
    //
    // TENANT-ONLY: that endpoint is guarded server-side by require_permission
    // (cfp_security/authorization.py's _tenant_check), which rejects any
    // non-tenant principal with "this endpoint requires a tenant user" —
    // there is no equivalent self-service endpoint yet for a platform
    // operator (Super Admin / internal staff, callerKind 'platform') to
    // resolve their own permissions. Calling it for them always 403s, so
    // it's skipped rather than surfaced as a spurious failure toast.
    let authorities: string[] = [];
    if (userId && callerKind === 'tenant') {
      try {
        // fetchBaseQuery has no built-in request timeout, and a wedged
        // organization-service (accepting the connection, never answering —
        // seen in local dev when its container reports unhealthy) would
        // otherwise hang this `await` forever, freezing the login button on
        // a completed auth with nothing left on screen to show for it.
        const PERMISSIONS_FETCH_TIMEOUT_MS = 8000;
        const resolved = await Promise.race([
          fetchUserDashboard({ userId }).unwrap(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Loading permissions timed out')),
              PERMISSIONS_FETCH_TIMEOUT_MS
            )
          ),
        ]);
        authorities = resolved.permissions;
      } catch (err) {
        showToast({
          message: getOrgErrorMessage(
            err,
            "Signed in, but we couldn't load your permissions yet. Some sections may be hidden until you refresh."
          ),
          type: 'error',
        });
      }
    }

    resetAllApiCaches(dispatch);
    dispatch(
      loginStore({
        token,
        rememberMe,
        authorities,
        canManageCompanySettings,
        role,
        refreshToken,
        userId,
        tenantId,
        callerKind,
      })
    );
    showToast({ message: 'Login successful', type: 'success' });
    const fromPath = location.state?.from?.pathname || '/';
    const fromSearch = location.state?.from?.search || '';
    // Never redirect back to /logout after login — it would immediately log the user out again.
    // This happens when PrivateRoute saves /logout as the "from" location before redirecting to /login.
    const safePath = fromPath === '/logout' ? '/' : fromPath;
    const fromLocation = safePath + fromSearch;
    navigate(fromLocation, { replace: true });
  };

  const handleLogin = async () => {
    // Prevent double-click submissions
    if (isLoading || isSubmitting.current) return;

    // Validate form
    if (!validateForm()) {
      return;
    }

    isSubmitting.current = true;

    const trimmedEmail = email.trim();

    // No real backend yet: the one seeded demo credential logs in locally instead
    // of calling the API. Anything else still goes through the real login flow below.
    if (
      isDevAuthBypassEnabled() &&
      trimmedEmail === DEV_SEED_CREDENTIALS.email &&
      password === DEV_SEED_CREDENTIALS.password
    ) {
      completeSeededLogin(trimmedEmail);
      isSubmitting.current = false;
      return;
    }

    // Same idea, for anyone invited via Roles & Permissions -> Invite User:
    // their generated credentials log them in locally with exactly the
    // permissions/location their assigned role carries.
    if (isDevAuthBypassEnabled()) {
      const invitedUser = devUserStore.findByCredentials(trimmedEmail, password);
      if (invitedUser) {
        completeInvitedUserLogin(invitedUser);
        isSubmitting.current = false;
        return;
      }
    }

    const payload: LoginRequest = {
      email: trimmedEmail,
      password,
    };

    login(payload)
      .unwrap()
      .then((res) => {
        if (isMfaRequiredResponse(res)) {
          // Second factor armed — hand off to MfaChallengeStep instead of
          // completing the login. Nothing is stored yet: mfa_token is not
          // an access token and authorises exactly the two MFA endpoints.
          setUnverifiedEmail(null);
          setIsAccountLocked(false);
          setMfaChallenge(res);
          return;
        }
        setUnverifiedEmail(null);
        setIsAccountLocked(false);
        void completeRealLogin(res, trimmedEmail);
      })
      .catch((err) => {
        const errorCode = getAuthErrorCode(err);
        // email_not_verified/account_locked each get their own affordance
        // below the form instead of just a dead-end toast — everything else
        // keeps the backend's own (deliberately uniform, non-enumerating)
        // message.
        setUnverifiedEmail(errorCode === 'email_not_verified' ? trimmedEmail : null);
        setIsAccountLocked(errorCode === 'account_locked');
        showToast({ message: getAuthErrorMessage(err, 'Login failed'), type: 'error' });
      })
      .finally(() => {
        isSubmitting.current = false;
      });
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail || isResendingVerification) return;
    try {
      await resendVerification({ email: unverifiedEmail }).unwrap();
      // 202, always — see forgotPassword.ts's identical reasoning for why
      // there is no "address not found" branch to show here either.
      showToast({
        message: "If that email needs verifying, we've sent a new link.",
        type: 'success',
      });
    } catch (err) {
      showToast({
        message: getAuthErrorMessage(err, 'Could not resend the verification email.'),
        type: 'error',
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Only submit if form is valid
    if (isFormValid && !isLoading) {
      handleLogin();
    }
  };

  // Enter key submits only if form is valid
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isFormValid && !isLoading && !isSubmitting.current) {
        handleLogin();
      }
    }
  };

  return (
    <>
      {/* No `overflow-hidden` on this element itself — see AcceptInvitation's
          copy of this shell (AcceptInvitation/index.tsx's `PageShell`) for
          why: it clipped the whole page to one viewport tall with no way to
          scroll to whatever fell outside it. The decorative blobs below are
          clipped to their own wrapper instead. */}
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center font-['DM Sans'] bg-gradient-to-br from-[#2c47a3] via-[#3f5bc4] to-[#6fc3e0] px-4 py-12">
        {isLoading && <Loader />}

        {/* decorative background texture + glow blobs for depth */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#7dd8ee]/30 blur-3xl" />
          <div className="absolute top-1/4 -right-16 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-28 -right-24 h-[26rem] w-[26rem] rounded-full bg-[#182a72]/30 blur-3xl" />
          <div className="absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-[#11b7dd]/20 blur-2xl" />
          <div className="absolute top-10 left-1/3 h-24 w-24 rounded-full border border-white/20" />
          <div className="absolute bottom-24 right-1/4 h-16 w-16 rounded-full border border-white/10" />
        </div>

        <div className="login-card-pop relative z-10 w-full max-w-sm rounded-3xl bg-white px-8 py-9 shadow-2xl ring-1 ring-black/5">
          {/* Brand */}
          <div className="mb-7 flex flex-col items-center">
            <button
              type="button"
              className="border-none bg-transparent p-0 cursor-pointer"
              onClick={() => navigate('/')}
            >
              <img
                src="/cfpLogo.svg"
                alt="Careerforce Pro"
                className="h-10 w-auto object-contain"
              />
            </button>
            <span className="ai-recruitment-text mt-2 text-xs tracking-widest uppercase">
              AI Powered Recruitment Solutions
            </span>
          </div>

          {mfaChallenge ? (
            <MfaChallengeStep
              mfaState={mfaChallenge}
              onBack={() => setMfaChallenge(null)}
              onVerified={(tokens) => void completeRealLogin(tokens, email.trim())}
            />
          ) : (
            <form onSubmit={handleSubmit} className="login-tab-fade flex flex-col gap-4">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900">Welcome Back</h2>
                <p className="mt-1 text-sm text-gray-500">Log in to continue to Careerforce Pro</p>
              </div>

              <Input
                name="email"
                type="email"
                // First field of the login form — focusing it on load is the expected UX.
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                autoComplete="email"
                noAutoCapitalize
                error={errors.email}
                value={email}
                onChange={onHandleChange}
                onKeyDown={handleKeyDown}
                placeholder="Email"
                className="border-[var(--border)] px-4 focus:ring focus:ring-brand-300"
              />

              <PasswordInput
                noAutoCapitalize
                onChange={onHandleChange}
                onKeyDown={handleKeyDown}
                name="password"
                autoComplete="current-password"
                value={password}
                placeholder="Password"
                error={errors.password}
                className="border-[var(--border)] px-4 focus:ring focus:ring-brand-300"
              />

              <div className="-mt-1 flex items-center justify-between">
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setLocalState({ rememberMe: e.target.checked })}
                  className="custom-checkbox"
                >
                  Remember Me
                </Checkbox>
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                appname="test"
                disabled={!isFormValid || isLoading || isSubmitting.current}
                className="mt-1 w-full rounded-3xl bg-button py-2.5 font-medium text-white transition-all duration-150 hover:brightness-105 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
              >
                {isLoading ? 'Logging In…' : 'Log In'}
              </Button>

              {isDevAuthBypassEnabled() && (
                <p className="rounded-xl bg-gray-50 px-3 py-2 text-center text-xs text-gray-400">
                  Demo access:{' '}
                  <span className="font-mono text-gray-500">
                    {DEV_SEED_CREDENTIALS.email} / {DEV_SEED_CREDENTIALS.password}
                  </span>
                </p>
              )}

              {unverifiedEmail && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
                  That email address hasn&apos;t been verified yet.{' '}
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResendingVerification}
                    className="font-medium underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isResendingVerification ? 'Sending…' : 'Resend Verification Email'}
                  </button>
                </p>
              )}

              {isAccountLocked && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
                  Your account is locked from too many failed attempts. Resetting your password
                  unlocks it immediately.{' '}
                  <Link to="/forgot-password" className="font-medium underline">
                    Reset Password
                  </Link>
                </p>
              )}
            </form>
          )}
        </div>
        <Footer className="relative z-10 mt-8 shrink-0 text-white/70" />
      </div>
    </>
  );
};

export default Login;
