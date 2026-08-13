import { useEffect, useReducer, useRef, useState } from 'react';
import { Button, Input, showToast } from '..';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
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
import { extractCanManageCompanySettings } from '../../shared/utils/auth/permission.helpers';
import { getAuthErrorCode, getAuthErrorMessage } from '../../shared/utils/auth/authError.helpers';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import { jwtDecode } from 'jwt-decode';
import { useLazyGetUserPermissionsQuery } from '../../api/organization-service/Roles/permissions';
import {
  isDevAuthBypassEnabled,
  createDevBypassToken,
  getDevBypassLoginPayload,
  warnDevBypassUsedOnce,
  DEV_SEED_CREDENTIALS,
} from '../../shared/utils/auth/devAuthBypass';
import { devUserStore, InvitedUser } from '../../shared/utils/dev/devUserStore';
import { devRoleStore } from '../../shared/utils/dev/devRoleStore';

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

// Cosmetic only: there is no backend to register a user against yet, so this form
// validates and then just hands control back to the Login tab. Nothing is persisted.
const signUpSchema = z
  .object({
    name: z.string().min(1, 'Full name is required.'),
    email: z
      .string()
      .min(1, 'Email is required.')
      .email('Enter a valid email address.')
      .transform((val) => val.trim())
      .refine((val) => !val.includes(' '), 'Email cannot contain spaces.'),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type SignUpFormErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

const Login = () => {
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isSubmitting = useRef(false);
  const [view, setView] = useState<'login' | 'signup'>(
    searchParams.get('view') === 'signup' ? 'signup' : 'login'
  );
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

  useEffect(() => {
    const successMessage = (location.state as { successMessage?: string } | null)?.successMessage;
    if (successMessage) {
      showToast({ message: successMessage, type: 'success' });
      // Clear the state so the toast doesn't re-appear on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

  const [localState, setLocalState] = useReducer(
    (prevState, newState) => ({ ...prevState, ...newState }),
    {
      email: '',
      password: '',
      showPassword: false,
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
  const { email, password, showPassword, errors, rememberMe, isFormValid } = localState;
  const [login, { isLoading }] = useLoginMutation();
  const [fetchUserPermissions] = useLazyGetUserPermissionsQuery();

  const [signUpState, setSignUpState] = useReducer(
    (prevState, newState) => ({ ...prevState, ...newState }),
    {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      showPassword: false,
      showConfirmPassword: false,
      errors: {} as SignUpFormErrors,
    }
  );

  useEffect(() => {
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

  const onSignUpChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    let processedValue = value;
    if (name === 'email') {
      processedValue = value.replace(/\s/g, '');
    }
    setSignUpState({ [name]: processedValue });
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
        activeLocationId: user.locationId,
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
    // Real access tokens carry `sub` (the user id) and, for a tenant caller
    // only, `tenant_id` (authentication-service docs/API_CONTRACT.md's
    // JWT-claims table). A platform caller's token has no `tenant_id` claim
    // at all — that absence, not any dedicated flag, is how "Super Admin /
    // internal staff" is distinguished from "tenant user" everywhere in the
    // backend, so the frontend mirrors it here rather than inventing its own
    // signal.
    const decodedToken = jwtDecode<{ sub: string; tenant_id?: string }>(token);
    const userId = decodedToken.sub || undefined;
    const tenantId = decodedToken.tenant_id ?? null;
    const callerKind: 'tenant' | 'platform' = tenantId ? 'tenant' : 'platform';
    const role = { name: '', type: '' };
    const canManageCompanySettings = extractCanManageCompanySettings(token);

    clearImpersonationStorage();

    sessionStorage.setItem(LOCALSTORAGE_KEYS.ACCESS, token);
    sessionStorage.setItem(LOCALSTORAGE_KEYS.REFRESH, refreshToken);

    if (rememberMe) {
      setTokens(token, refreshToken);
      setLocalStorageItem(LOCALSTORAGE_KEYS.REMEMBER_ME, 'true');
      setLocalStorageItem(LOCALSTORAGE_KEYS.ROLE, role);
      setLocalStorageItem(LOCALSTORAGE_KEYS.REMEMBER_CREDENTIALS, {
        email: loggedInEmail,
        password: encrypt(password),
      });
    } else {
      setTokens(token, refreshToken);
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
    let authorities: string[] = [];
    if (userId) {
      try {
        const resolved = await fetchUserPermissions({ userId }).unwrap();
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
          setMfaChallenge(res);
          return;
        }
        setUnverifiedEmail(null);
        void completeRealLogin(res, trimmedEmail);
      })
      .catch((err) => {
        const errorCode = getAuthErrorCode(err);
        // email_not_verified gets its own affordance (resend link) below the
        // form instead of just a dead-end toast — everything else keeps the
        // backend's own (deliberately uniform, non-enumerating) message.
        setUnverifiedEmail(errorCode === 'email_not_verified' ? trimmedEmail : null);
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

  // Cosmetic only — see signUpSchema comment above. There's nothing to persist this to
  // yet, so a successful submit just confirms the input looks right and hands the
  // visitor back to the Login tab with their email prefilled.
  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = signUpSchema.safeParse(signUpState);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setSignUpState({
        errors: {
          name: fieldErrors.name?.[0] ?? '',
          email: fieldErrors.email?.[0] ?? '',
          password: fieldErrors.password?.[0] ?? '',
          confirmPassword: fieldErrors.confirmPassword?.[0] ?? '',
        },
      });
      return;
    }

    showToast({
      message: 'Account created! Please log in with your new credentials.',
      type: 'success',
    });
    setLocalState({ email: signUpState.email });
    setSignUpState({
      name: '',
      password: '',
      confirmPassword: '',
      errors: {},
    });
    setView('login');
  };

  return (
    <>
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden font-['DM Sans'] bg-gradient-to-br from-[#2c47a3] via-[#3f5bc4] to-[#6fc3e0] px-4 py-12">
        {isLoading && <Loader />}

        {/* decorative background texture + glow blobs for depth */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#7dd8ee]/30 blur-3xl" />
        <div className="pointer-events-none absolute top-1/4 -right-16 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-24 h-[26rem] w-[26rem] rounded-full bg-[#182a72]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-[#11b7dd]/20 blur-2xl" />
        <div className="pointer-events-none absolute top-10 left-1/3 h-24 w-24 rounded-full border border-white/20" />
        <div className="pointer-events-none absolute bottom-24 right-1/4 h-16 w-16 rounded-full border border-white/10" />

        <div className="login-card-pop relative z-10 w-full max-w-sm rounded-3xl bg-white px-8 py-9 shadow-2xl ring-1 ring-black/5">
          {/* Brand */}
          <div className="mb-7 flex flex-col items-center">
            <img
              src="/cfpLogo.svg"
              alt="CareerForce Pro"
              className="h-10 w-auto object-contain cursor-pointer"
              onClick={() => navigate('/')}
            />
            <span className="ai-recruitment-text mt-2 text-[11px] tracking-widest">
              AI POWERED RECRUITMENT SOLUTIONS
            </span>
          </div>

          {mfaChallenge ? (
            <MfaChallengeStep
              mfaState={mfaChallenge}
              onBack={() => setMfaChallenge(null)}
              onVerified={(tokens) => void completeRealLogin(tokens, email.trim())}
            />
          ) : (
            <>
              {/* Tabs */}
              <div className="mb-7 flex rounded-full bg-gray-100 p-1 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className={`flex-1 rounded-full py-1.5 cursor-pointer transition-all duration-200 ${
                    view === 'login' ? 'bg-white text-black shadow-sm' : 'text-gray-500'
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setView('signup')}
                  className={`flex-1 rounded-full py-1.5 cursor-pointer transition-all duration-200 ${
                    view === 'signup' ? 'bg-white text-black shadow-sm' : 'text-gray-500'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {view === 'login' ? (
                <form
                  key="login"
                  onSubmit={handleSubmit}
                  className="login-tab-fade flex flex-col gap-4"
                >
                  <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900">Welcome back</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Log in to continue to careerforce pro
                    </p>
                  </div>

                  <Input
                    name="email"
                    autoFocus
                    error={errors.email}
                    value={email}
                    onChange={onHandleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Email"
                    className="border-[var(--border)] px-4 focus:ring focus:ring-brand-300"
                  />

                  <Input
                    type={showPassword ? 'text' : 'password'}
                    onChange={onHandleChange}
                    onKeyDown={handleKeyDown}
                    name="password"
                    value={password}
                    placeholder="Password"
                    error={errors.password}
                    className="border-[var(--border)] px-4 focus:ring focus:ring-brand-300"
                    suffix={
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600 cursor-pointer"
                        onClick={() => setLocalState({ showPassword: !showPassword })}
                      >
                        {showPassword ? <FaEye /> : <FaEyeSlash />}
                      </button>
                    }
                  />

                  <div className="-mt-1 flex items-center justify-between">
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setLocalState({ rememberMe: e.target.checked })}
                      className="custom-checkbox"
                    >
                      Remember me
                    </Checkbox>
                    <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    appname="test"
                    disabled={!isFormValid || isLoading || isSubmitting.current}
                    className="mt-1 w-full rounded-3xl bg-button py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? 'Logging in…' : 'Log in'}
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
                        {isResendingVerification ? 'Sending…' : 'Resend verification email'}
                      </button>
                    </p>
                  )}
                </form>
              ) : (
                <form
                  key="signup"
                  onSubmit={handleSignUpSubmit}
                  className="login-tab-fade flex flex-col gap-4"
                >
                  <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900">Create account</h2>
                    <p className="mt-1 text-sm text-gray-500">Get started with careerforce pro</p>
                  </div>

                  <Input
                    name="name"
                    autoFocus
                    error={signUpState.errors.name}
                    value={signUpState.name}
                    onChange={onSignUpChange}
                    placeholder="Full name"
                    className="border-[var(--border)] px-4 focus:ring focus:ring-brand-300"
                  />

                  <Input
                    name="email"
                    error={signUpState.errors.email}
                    value={signUpState.email}
                    onChange={onSignUpChange}
                    placeholder="Email"
                    className="border-[var(--border)] px-4 focus:ring focus:ring-brand-300"
                  />

                  <Input
                    type={signUpState.showPassword ? 'text' : 'password'}
                    onChange={onSignUpChange}
                    name="password"
                    value={signUpState.password}
                    placeholder="Password"
                    error={signUpState.errors.password}
                    className="border-[var(--border)] px-4 focus:ring focus:ring-brand-300"
                    suffix={
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600 cursor-pointer"
                        onClick={() => setSignUpState({ showPassword: !signUpState.showPassword })}
                      >
                        {signUpState.showPassword ? <FaEye /> : <FaEyeSlash />}
                      </button>
                    }
                  />

                  <Input
                    type={signUpState.showConfirmPassword ? 'text' : 'password'}
                    onChange={onSignUpChange}
                    name="confirmPassword"
                    value={signUpState.confirmPassword}
                    placeholder="Confirm password"
                    error={signUpState.errors.confirmPassword}
                    className="border-[var(--border)] px-4 focus:ring focus:ring-brand-300"
                    suffix={
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600 cursor-pointer"
                        onClick={() =>
                          setSignUpState({ showConfirmPassword: !signUpState.showConfirmPassword })
                        }
                      >
                        {signUpState.showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
                      </button>
                    }
                  />

                  <Button
                    type="submit"
                    appname="test"
                    className="mt-1 w-full rounded-3xl bg-button py-2.5 font-medium text-white"
                  >
                    Create account
                  </Button>

                  <p className="rounded-xl bg-gray-50 px-3 py-2 text-center text-xs text-gray-400">
                    Preview only — accounts aren&apos;t saved yet. Use the demo login on the Login
                    tab to explore the app.
                  </p>
                </form>
              )}
            </>
          )}
        </div>
        <Footer className="relative z-10 mt-8 shrink-0 text-white/70" />
      </div>
    </>
  );
};

export default Login;
