import { useEffect, useReducer, useRef } from 'react';
import { Button, Input, showToast } from '..';
import loginImage from '../../assets/svgs/LoginNew.svg';
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
  const [searchParams] = useSearchParams();
  const loginToken = searchParams.get('token') as string;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isSubmitting = useRef(false);

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

  const handleLogin = async () => {
    // Prevent double-click submissions
    if (isLoading || isSubmitting.current) return;

    // Validate form
    if (!validateForm()) {
      return;
    }

    isSubmitting.current = true;

    const trimmedEmail = email.trim();
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
      <div className="flex flex-wrap h-screen w-full font-['DM Sans'] bg-[var(--login-background)]">
        {isLoading && <Loader />}
        <div className="flex-2 h-full flex flex-col justify-center items-center px-10">
          <img
            src="/cfpLogo.svg"
            alt="CareerForce Pro"
            className="h-24 w-auto object-contain cursor-pointer"
            onClick={() => navigate('/')}
          />
          <span className="ai-recruitment-text mb-8 mt-2 ">AI POWERED RECRUITMENT SOLUTIONS</span>
          <img
            src={loginImage}
            alt="Login"
            className="max-w-[450px] h-auto object-cover rounded-3xl"
          />
          <div className="flex flex-col items-center mt-4 text-center">
            <span className="text-black text-lg font-semibold">
              Revolutionizing Talent Acquisition with AI Precision
            </span>
            <span className="text-black text-sm mt-4">
              careerforce pro is an end-to-end AI-powered recruitment platform that empowers
              organizations to streamline hiring processes, reduce manual effort, and secure top
              talent with unparalleled efficiency.
            </span>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center px-10 py-8">
          {/* <div className="text-center"> */}
          {/* <h3 className="text-4xl font-bold">
            <span className="text-primary">Career</span>
            <span className="text-black">Force Pro</span>
          </h3> */}
          {/* </div> */}
          {/* <div className="w-full max-w-md flex flex-col items-center bg-white rounded-3xl px-8 py-24 shadow-lg"> */}
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md flex flex-col items-center bg-white rounded-3xl px-8 py-24 shadow-lg"
          >
            <div className="text-center">
              <h2 className="text-4xl font-medium mb-2 font-sora">Login</h2>
              <p className="text-lg text-gray-600 mb-6">Welcome to careerforce pro</p>
            </div>
            <div className="mb-4 w-90">
              <Input
                name="email"
                autoFocus
                error={errors.email}
                value={email}
                onChange={onHandleChange}
                onKeyDown={handleKeyDown}
                placeholder="Email"
                className="w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              />
            </div>
            <div className="w-90">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  onChange={onHandleChange}
                  onKeyDown={handleKeyDown}
                  name="password"
                  value={password}
                  placeholder="Password"
                  className="w-full !normal-case px-4 py-2 rounded-3xl pr-10 focus:ring focus:ring-brand-300 border-[var(--border)]"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-4 flex items-center text-gray-500 cursor-pointer"
                  onClick={() => setLocalState({ showPassword: !showPassword })}
                >
                  {showPassword ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm px-2 py-1">{errors.password}</p>
              )}
            </div>
            <div className="flex w-90 justify-start py-4 px-1">
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setLocalState({ rememberMe: e.target.checked })}
                className="custom-checkbox"
              >
                Remember Me?
              </Checkbox>
            </div>
            <Button
              type="submit"
              appname="test"
              disabled={!isFormValid || isLoading || isSubmitting.current}
              className="w-90 text-white bg-button rounded-3xl px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'LOGGING IN...' : 'LOGIN'}
            </Button>

            <Link to="/forgot-password" className="text-primary text-sm hover:underline mt-4">
              Forgot Password?
            </Link>
          </form>
        </div>
        <Footer className="fixed bottom-0 left-0 z-10 text-[var(--primary)]" />
      </div>
    </>
  );
};

export default Login;
