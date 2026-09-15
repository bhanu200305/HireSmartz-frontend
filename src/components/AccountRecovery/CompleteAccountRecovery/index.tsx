import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaCheckCircle } from 'react-icons/fa';
import { MdErrorOutline, MdLockOutline } from 'react-icons/md';
import { AuthPageShell, Button, Input, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import { useCompleteAccountRecoveryMutation } from '../../../api/authentication-service/AccountRecovery/completeAccountRecovery';
import {
  getAuthErrorCode,
  getAuthErrorMessage,
} from '../../../shared/utils/auth/authError.helpers';
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '../../ResetPassword/ResetPasswordSchema';

/**
 * Lands here from the link /account-recovery emails, to the recovery
 * address. Anonymous, no session — the token in the URL IS the
 * authorisation, same shape as ResetPassword. Unlike a plain password
 * reset, completing this ALSO disables every enrolled MFA method — the
 * copy on both the form and the success screen says so explicitly, since
 * that's the one thing meaningfully different from /reset-password.
 */
const CompleteAccountRecovery = () => {
  const { token: pathToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const token = pathToken || searchParams.get('token');
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [tokenIsDead, setTokenIsDead] = useState(false);

  const [completeAccountRecovery, { isLoading }] = useCompleteAccountRecoveryMutation();

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

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) return;
    try {
      await completeAccountRecovery({ token, new_password: data.newPassword }).unwrap();
      setIsDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      if (getAuthErrorCode(err) === 'invalid_verification_token') {
        setTokenIsDead(true);
        return;
      }
      showToast({
        message: getAuthErrorMessage(err, 'Could not recover your account. Please try again.'),
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
            Recovery links expire after an hour and only work once. Start over to get a new one.
          </p>
          <Link to="/account-recovery" className="mt-2 text-sm text-primary hover:underline">
            Start account recovery again
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
          <h2 className="text-xl font-semibold text-gray-900">Account recovered</h2>
          <p className="text-sm text-gray-500">
            Your password was reset and your two-factor methods were removed for safety. You&apos;ll
            be asked to set up MFA again next time you log in. Redirecting you to log in…
          </p>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      {isLoading && <Loader />}
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold text-gray-900">Set a new password</h2>
        <p className="mt-1 text-sm text-gray-500">
          This also removes every two-factor method on your account and signs you out everywhere.
          You&apos;ll set up MFA again after logging back in.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <Controller
            name="newPassword"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type={showPassword ? 'text' : 'password'}
                noAutoCapitalize
                placeholder="New password*"
                prefix={
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-100 mr-1">
                    <MdLockOutline className="text-brand-900 text-sm" />
                  </div>
                }
                className="w-full !normal-case px-4 py-2 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                suffix={
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEye /> : <FaEyeSlash />}
                  </button>
                }
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
        </div>

        <div>
          <Controller
            name="confirmNewPassword"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type={showConfirmPassword ? 'text' : 'password'}
                noAutoCapitalize
                placeholder="Confirm new password*"
                prefix={
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-100 mr-1">
                    <MdLockOutline className="text-brand-900 text-sm" />
                  </div>
                }
                className="w-full !normal-case px-4 py-2 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                suffix={
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
                  </button>
                }
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
          appname="complete account recovery"
          disabled={!isValid || isLoading}
          className="mt-1 w-full rounded-3xl bg-button py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Recovering…' : 'Recover account'}
        </Button>

        <Link to="/login" className="text-center text-sm text-gray-500 hover:underline">
          Back to login
        </Link>
      </form>
    </AuthPageShell>
  );
};

export default CompleteAccountRecovery;
