import { Button, Input, showToast } from '..';
import loginImage from '../../assets/svgs/LoginNew.svg';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import {
  ForgotPasswordRequest,
  useLazyGetForgotPwdQuery,
} from '../../api/authentication-service/ForgotPassword/forgotPassword';
import { useReducer, useRef } from 'react';
import { z } from 'zod';
import { get } from 'lodash-es';
import { Loader } from '../shared/ui/loader';
import Footer from '../Footer';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required.')
    .email('Enter a valid email address.')
    .transform((val) => val.trim())
    .refine((val) => !val.includes(' '), 'Email cannot contain spaces.'),
});
type FormErrors = {
  email?: string;
};

const ForgotPassword = () => {
  const navigate = useNavigate();
  const isSubmitting = useRef(false);
  const [localState, setLocalState] = useReducer(
    (prevState, newState) => ({ ...prevState, ...newState }),
    {
      email: '',
      errors: {} as FormErrors,
      isFormValid: false,
    }
  );
  const { email, errors, isFormValid } = localState;
  const [getForgotPwd, { isLoading }] = useLazyGetForgotPwdQuery();

  // Real-time validation with shouldValidate: true
  const validateForm = (emailValue: string = email): boolean => {
    const result = forgotPasswordSchema.safeParse({ email: emailValue });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setLocalState({
        errors: {
          email: fieldErrors.email ? fieldErrors.email[0] : '',
        },
        isFormValid: false,
      });
      return false;
    }

    setLocalState({
      errors: { email: '' },
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
      validateForm(processedValue);
    }, 0);
  };

  const handleForgotPwd = () => {
    // Prevent double-click submissions
    if (isLoading || isSubmitting.current) return;

    // Validate form
    if (!validateForm()) {
      return;
    }
    isSubmitting.current = true;
    const trimmedEmail = email.trim();
    const payload: ForgotPasswordRequest = {
      emailId: trimmedEmail,
    };
    getForgotPwd(payload)
      .unwrap()
      .then((res) => {
        if (res.success) {
          showToast({
            message: get(res, 'message', 'Password reset link has been sent successfully'),
            type: 'success',
          });
          navigate('/login');
        } else {
          showToast({
            message: get(res, 'message', 'Failed to send password reset link. Please try again.'),
            type: 'error',
          });
        }
        // setOpenSuccessMsg(true);
      })
      .catch((err) => {
        showToast({
          message: get(
            err,
            'data.message',
            'Failed to send password reset link. Please try again.'
          ),
          type: 'error',
        });
      })
      .finally(() => {
        isSubmitting.current = false;
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Only submit if form is valid
    if (isFormValid && !isLoading) {
      handleForgotPwd();
    }
  };

  // Enter key submits only if form is valid
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isFormValid && !isLoading && !isSubmitting.current) {
        handleForgotPwd();
      }
    }
  };
  return (
    <div className="flex flex-wrap h-screen w-full font-['DM Sans'] bg-[var(--login-background)]">
      {(isLoading || isSubmitting.current) && <Loader />}
      {/* Left Side Image - flex-2 to take more space */}
      <div className="flex-2 h-full flex flex-col justify-center items-center px-10">
        <h3 className="text-5xl font-bold">
          <span className="text-primary">careerforce pro</span>
        </h3>
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

      {/* Right Side Content - flex-1 to take less space */}
      <div className="flex-1 flex flex-col justify-center items-center px-10 py-8">
        {/* Logo Section */}
        {/* <div className="text-center">
          <h3 className="text-4xl font-bold">
            <span className="text-primary">Career</span>
            <span className="text-black">Force Pro</span>
          </h3>
        </div> */}

        {/* Login Form Section */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md flex flex-col items-center bg-white rounded-3xl px-8 py-36 shadow-lg"
        >
          <div className="text-center">
            <h3 className="text-4xl font-medium mb-2">Forgot Password</h3>
            <p className="w-80 text-md text-gray-600 mb-6">
              Enter your email to request a temporary password.
            </p>
          </div>
          <div className="mb-4 w-full">
            <Input
              name="email"
              autoFocus
              error={errors.email}
              value={email}
              onChange={onHandleChange}
              onKeyDown={handleKeyDown}
              placeholder="Email"
              className="w-90 px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
            />
          </div>
          <Button
            type="submit"
            appname="test"
            disabled={!isFormValid || isLoading || isSubmitting.current}
            className="w-90 text-white bg-button rounded-3xl px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'SUBMITTING...' : 'SUBMIT'}
          </Button>

          <Link
            to="/login"
            className="flex items-center justify-center text-[#000000] text-sm hover:underline mt-4"
          >
            <FaArrowLeft className="mr-2 inline-block" />
            Go back to Login
          </Link>
        </form>

        {/* Copyright Section */}
        <Footer className="fixed bottom-0 left-0 z-10 text-[var(--primary)]" />
      </div>
    </div>
  );
};

export default ForgotPassword;
