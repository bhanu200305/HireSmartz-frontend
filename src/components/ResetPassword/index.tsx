import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import { MdErrorOutline, MdLockOutline } from 'react-icons/md';
import {
  AuthPageShell,
  Button,
  PasswordInput,
  PasswordRequirementsChecklist,
  showToast,
} from '../shared';
import { Loader } from '../shared/ui/loader';
import { useResetPasswordMutation } from '../../api/authentication-service/ResetPassword/resetPassword';
import { getAuthErrorCode, getAuthErrorMessage } from '../../shared/utils/auth/authError.helpers';
import { resetPasswordSchema, type ResetPasswordFormValues } from './ResetPasswordSchema';

/**
 * Lands here from the link forgot-password emails. The token in the URL IS
 * the authorisation (docs/API_CONTRACT.md §5 "POST /reset-password") — there
 * is no session, no bearer token, nothing else to check before showing the
 * form. notification-service's LinkBuilder.password_reset_url() places it in
 * the path (routes.tsx's /reset-password/:token); the query-string read is
 * kept only as a fallback for any older link still in flight.
 */
const ResetPassword = () => {
  const { token: pathToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const token = pathToken || searchParams.get('token');
  const navigate = useNavigate();
  const [isDone, setIsDone] = useState(false);
  // Set only for invalid_verification_token — the form is pointless to keep
  // showing once the token itself is dead, so it's replaced with a static
  // screen instead of just a toast (same reasoning as AcceptInvitation's
  // invite-not-available screen).
  const [tokenIsDead, setTokenIsDead] = useState(false);

  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const {
    control,
    handleSubmit,
    trigger,
    formState: { errors, isValid },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmNewPassword: '' },
    mode: 'onChange',
  });
  const newPassword = useWatch({ control, name: 'newPassword' }) ?? '';

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) return;
    try {
      const result = await resetPassword({ token, new_password: data.newPassword }).unwrap();
      setIsDone(true);
      // Defensive read: a missing `email` (e.g. still on the old 204
      // response, before the backend change is deployed) just means no
      // prefill — the reset itself already succeeded by this point, so it
      // must never turn into an error toast.
      const prefillEmail = result?.email;
      setTimeout(
        () => navigate('/login', { state: prefillEmail ? { prefillEmail } : undefined }),
        2000
      );
    } catch (err) {
      if (getAuthErrorCode(err) === 'invalid_verification_token') {
        setTokenIsDead(true);
        return;
      }
      showToast({
        message: getAuthErrorMessage(err, 'Could not reset your password. Please try again.'),
        type: 'error',
      });
    }
  };

  if (!token || tokenIsDead) {
    return (
      <AuthPageShell>
        <div className="flex flex-col items-center gap-3 text-center">
          <MdErrorOutline className="text-4xl text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900">This link isn&apos;t valid</h2>
          <p className="text-sm text-gray-500">
            Reset links expire after an hour and only work once. Request a new one to continue.
          </p>
          <Link to="/forgot-password" className="mt-2 text-sm text-primary hover:underline">
            Request a New Link
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  if (isDone) {
    return (
      <AuthPageShell>
        <div className="flex flex-col items-center gap-3 text-center">
          <FaCheckCircle className="text-4xl text-brand-600" />
          <h2 className="text-xl font-semibold text-gray-900">Password Reset</h2>
          <p className="text-sm text-gray-500">
            You&apos;ve been signed out everywhere for safety. Redirecting you to log in…
          </p>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      {isLoading && <Loader />}
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold text-gray-900">Set a New Password</h2>
        <p className="mt-1 text-sm text-gray-500">
          This will sign you out on every device. You&apos;ll need to log back in with the new
          password.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <Controller
            name="newPassword"
            control={control}
            render={({ field }) => (
              <PasswordInput
                {...field}
                autoComplete="new-password"
                noAutoCapitalize
                placeholder="New Password*"
                prefix={
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-100 mr-1">
                    <MdLockOutline className="text-brand-900 text-sm" />
                  </div>
                }
                className="w-full !normal-case px-4 py-2 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                onChange={(e) => {
                  field.onChange(e);
                  trigger('confirmNewPassword');
                }}
              />
            )}
          />
          {errors.newPassword && (
            <p className="text-red-500 text-sm px-2 py-1 whitespace-pre-line">
              {errors.newPassword.message}
            </p>
          )}
          {newPassword.length > 0 && (
            <div className="px-2">
              <PasswordRequirementsChecklist password={newPassword} />
            </div>
          )}
        </div>

        <div>
          <Controller
            name="confirmNewPassword"
            control={control}
            render={({ field }) => (
              <PasswordInput
                {...field}
                autoComplete="new-password"
                noAutoCapitalize
                placeholder="Confirm New Password*"
                prefix={
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-100 mr-1">
                    <MdLockOutline className="text-brand-900 text-sm" />
                  </div>
                }
                className="w-full !normal-case px-4 py-2 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              />
            )}
          />
          {errors.confirmNewPassword && (
            <p className="text-red-500 text-sm px-2 py-1 whitespace-pre-line">
              {errors.confirmNewPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          appname="reset password"
          disabled={!isValid || isLoading}
          className="mt-1 w-full rounded-3xl bg-button py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Resetting…' : 'Reset Password'}
        </Button>

        <Link to="/login" className="text-center text-sm text-gray-500 hover:underline">
          Back
        </Link>
      </form>
    </AuthPageShell>
  );
};

export default ResetPassword;
