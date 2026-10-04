import { AuthPageShell, Button, Input, showToast } from '..';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import {
  ForgotPasswordRequest,
  useForgotPasswordMutation,
} from '../../api/authentication-service/ForgotPassword/forgotPassword';
import { useReducer, useRef } from 'react';
import { z } from 'zod';
import { Loader } from '../shared/ui/loader';
import { getAuthErrorMessage } from '../../shared/utils/auth/authError.helpers';

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
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

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
      email: trimmedEmail,
    };
    forgotPassword(payload)
      .unwrap()
      .then(() => {
        // 202 {accepted: true}, always — whether or not the address exists.
        // This is deliberate (docs/API_CONTRACT.md §4.1): a different
        // message for "sent" vs "no such account" would make this endpoint
        // an account-enumeration oracle, so there is no failure branch here
        // for "email not found".
        showToast({
          message: "If that email is registered, we've sent a link to reset your password.",
          type: 'success',
        });
        navigate('/login');
      })
      .catch((err) => {
        showToast({
          message: getAuthErrorMessage(
            err,
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
    <AuthPageShell>
      {(isLoading || isSubmitting.current) && <Loader />}

      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold text-gray-900">Forgot Password</h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter your email to request a temporary password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          name="email"
          type="email"
          // Sole input on this page — focusing it on load is the expected UX.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          noAutoCapitalize
          error={errors.email}
          value={email}
          onChange={onHandleChange}
          onKeyDown={handleKeyDown}
          placeholder="Email"
          className="border-[var(--border)] px-4 focus:ring focus:ring-brand-300"
        />

        <Button
          type="submit"
          appname="forgot password"
          disabled={!isFormValid || isLoading || isSubmitting.current}
          className="w-full rounded-3xl bg-button py-2.5 font-medium text-white transition-all duration-150 hover:brightness-105 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
        >
          {isLoading ? 'Submitting…' : 'Submit'}
        </Button>

        <Link
          to="/login"
          className="flex items-center justify-center text-sm text-gray-500 hover:underline"
        >
          <FaArrowLeft className="mr-2 inline-block text-xs" />
          Back
        </Link>

        <Link
          to="/account-recovery"
          className="text-center text-xs text-gray-400 hover:text-gray-600 hover:underline"
        >
          Can&apos;t access this email?
        </Link>
      </form>
    </AuthPageShell>
  );
};

export default ForgotPassword;
