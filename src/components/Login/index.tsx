import { useEffect, useReducer, useRef, useState } from 'react';
import { Button, Input, showToast } from '..';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { Checkbox } from 'antd';
import { useLoginMutation, LoginRequest } from '../../api/authentication-service/Login/login';
import { get } from 'lodash-es';
import { useDispatch } from 'react-redux';
import { loginStore } from '../../redux/slices/loginSlice';
import { z } from 'zod';
import { Loader } from '../shared/ui/loader';
import './login.css';
import Footer from '../Footer';
import {
  clearImpersonationStorage,
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
  setTokens,
} from '../../shared/utils/auth/localstorage.helpers';
import { extractCanManageCompanySettings } from '../../shared/utils/auth/permission.helpers';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import { verifyTokenLogin } from '../../services/AuthService';
import { jwtDecode } from 'jwt-decode';
import {
  isDevAuthBypassEnabled,
  createDevBypassToken,
  getDevBypassLoginPayload,
  warnDevBypassUsedOnce,
  DEV_SEED_CREDENTIALS,
} from '../../shared/utils/auth/devAuthBypass';

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
  const loginToken = searchParams.get('token') as string;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isSubmitting = useRef(false);
  const [view, setView] = useState<'login' | 'signup'>('login');

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

    const payload: LoginRequest = {
      emailId: trimmedEmail,
      password,
    };

    login(payload)
      .unwrap()
      .then((res) => {
        const token = get(res, 'token', '');
        const roleName = get(res, 'roleName', '');
        const roleType = get(res, 'roleType', '');
        const authorities = get(res, 'authorities', []);
        const refreshToken = get(res, 'refreshToken', '');
        const decodedToken = jwtDecode<{ userId: string }>(token);
        const userId = decodedToken.userId || undefined;
        const canManageCompanySettings = extractCanManageCompanySettings(token);

        const role = { name: roleName, type: roleType };

        clearImpersonationStorage();

        sessionStorage.setItem(LOCALSTORAGE_KEYS.ACCESS, token);
        sessionStorage.setItem(LOCALSTORAGE_KEYS.REFRESH, refreshToken);

        if (rememberMe) {
          setTokens(token, refreshToken);
          setLocalStorageItem(LOCALSTORAGE_KEYS.REMEMBER_ME, 'true');
          setLocalStorageItem(LOCALSTORAGE_KEYS.ROLE, role);
          setLocalStorageItem(LOCALSTORAGE_KEYS.REMEMBER_CREDENTIALS, {
            email: trimmedEmail,
            password: encrypt(password),
          });
        } else {
          setTokens(token, refreshToken);
          setLocalStorageItem(LOCALSTORAGE_KEYS.ROLE, role);
          removeLocalStorageItem(LOCALSTORAGE_KEYS.REMEMBER_ME);
          removeLocalStorageItem(LOCALSTORAGE_KEYS.REMEMBER_CREDENTIALS);
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
          })
        );
        showToast({ message: get(res, 'message', 'Login successful'), type: 'success' });
        const fromPath = location.state?.from?.pathname || '/';
        const fromSearch = location.state?.from?.search || '';
        // Never redirect back to /logout after login — it would immediately log the user out again.
        // This happens when PrivateRoute saves /logout as the "from" location before redirecting to /login.
        const safePath = fromPath === '/logout' ? '/' : fromPath;
        const fromLocation = safePath + fromSearch;
        navigate(fromLocation, { replace: true });
      })
      .catch((err) => {
        showToast({ message: get(err, 'data.message', 'Login failed'), type: 'error' });
      })
      .finally(() => {
        isSubmitting.current = false;
      });
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

  const verifyAndRedirect = async () => {
    const result = await verifyTokenLogin(loginToken, dispatch);
    if (result) {
      sessionStorage.setItem(LOCALSTORAGE_KEYS.ACCESS, result.token);
      sessionStorage.setItem(LOCALSTORAGE_KEYS.REFRESH, result.refreshToken);

      navigate('/change-password', {
        state: { autoLogin: true },
      });
    } else {
      navigate('/login');
    }
  };

  useEffect(() => {
    if (loginToken) {
      verifyAndRedirect();
    }
  }, [loginToken]);

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
                <p className="mt-1 text-sm text-gray-500">Log in to continue to careerforce pro</p>
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
                Preview only — accounts aren&apos;t saved yet. Use the demo login on the Login tab
                to explore the app.
              </p>
            </form>
          )}
        </div>
        <Footer className="relative z-10 mt-8 shrink-0 text-white/70" />
      </div>
    </>
  );
};

export default Login;
