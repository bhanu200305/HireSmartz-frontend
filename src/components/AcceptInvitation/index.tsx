import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaCheckCircle, FaRegCopy } from 'react-icons/fa';
import { MdLockOutline, MdErrorOutline } from 'react-icons/md';
import { get } from 'lodash-es';
import { Button, CustomCheckbox, Input, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import Footer from '../Footer';
import {
  useLazyValidateInvitationQuery,
  useAcceptInvitationMutation,
} from '../../api/organization-service/Invitations/invitations';
import { buildOtpAuthUri, generateBase32Secret } from '../../shared/utils/mfa.helpers';
import { acceptInvitationSchema, type AcceptInvitationFormValues } from './AcceptInvitationSchema';

const PageShell = ({ children }: { children: ReactNode }) => (
  <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden font-['DM Sans'] bg-gradient-to-br from-[#2c47a3] via-[#3f5bc4] to-[#6fc3e0] px-4 py-12">
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
    <div className="login-card-pop relative z-10 w-full max-w-md rounded-3xl bg-white px-8 py-9 shadow-2xl ring-1 ring-black/5">
      <div className="mb-6 flex flex-col items-center">
        <img src="/cfpLogo.svg" alt="CareerForce Pro" className="h-10 w-auto object-contain" />
        <span className="ai-recruitment-text mt-2 text-[11px] tracking-widest">
          AI POWERED RECRUITMENT SOLUTIONS
        </span>
      </div>
      {children}
    </div>
    <Footer className="relative z-10 mt-8 shrink-0 text-white/70" />
  </div>
);

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  sales: 'Sales',
  support: 'Support',
  finance: 'Finance',
  ops: 'Ops',
  company_admin: 'Company Admin',
  recruiter: 'Recruiter',
  hiring_manager: 'Hiring Manager',
};

const formatRole = (role: string): string => ROLE_LABELS[role] ?? role;

const AcceptInvitation = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  const [validateInvitation, { data: invitation, isFetching, isError, error }] =
    useLazyValidateInvitationQuery();
  const [acceptInvitation, { isLoading: isAccepting }] = useAcceptInvitationMutation();

  useEffect(() => {
    if (token) {
      validateInvitation(token);
    }
  }, [token, validateInvitation]);

  const mfaSecret = useMemo(() => generateBase32Secret(), [invitation?.invited_email]);
  const otpAuthUri = useMemo(
    () =>
      invitation?.invited_email
        ? buildOtpAuthUri({ secret: mfaSecret, accountEmail: invitation.invited_email })
        : '',
    [invitation?.invited_email, mfaSecret]
  );

  const { control, handleSubmit, trigger, formState } = useForm<AcceptInvitationFormValues>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { password: '', confirmPassword: '', mfaAcknowledged: false },
    mode: 'onChange',
  });
  const { errors, isValid } = formState;

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(mfaSecret);
      showToast({ message: 'Secret key copied.', type: 'success' });
    } catch {
      showToast({ message: 'Could not copy — please select and copy manually.', type: 'error' });
    }
  };

  const onSubmit = async (data: AcceptInvitationFormValues) => {
    if (!token) return;
    try {
      await acceptInvitation({ token, password: data.password, mfa_secret: mfaSecret }).unwrap();
      setIsAccepted(true);
      showToast({ message: 'Account activated. You can now log in.', type: 'success' });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: unknown) {
      showToast({
        message: get(err, 'data.message', 'Failed to accept invitation. Please try again.'),
        type: 'error',
      });
    }
  };

  if (isFetching) {
    return (
      <PageShell>
        <Loader />
        <p className="text-center text-gray-500 text-sm">Checking your invite…</p>
      </PageShell>
    );
  }

  if (isError || !invitation?.valid) {
    const message = get(
      error,
      'data.message',
      'This invite link is invalid, expired, or has already been used. Ask whoever invited you to resend it.'
    );
    return (
      <PageShell>
        <div className="flex flex-col items-center text-center gap-3">
          <MdErrorOutline className="text-4xl text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900">Invite not available</h2>
          <p className="text-sm text-gray-500">{message}</p>
          <Link to="/login" className="text-sm text-primary hover:underline mt-2">
            Back to login
          </Link>
        </div>
      </PageShell>
    );
  }

  if (isAccepted) {
    return (
      <PageShell>
        <div className="flex flex-col items-center text-center gap-3">
          <FaCheckCircle className="text-4xl text-brand-600" />
          <h2 className="text-xl font-semibold text-gray-900">You&apos;re all set up</h2>
          <p className="text-sm text-gray-500">Redirecting you to the login page…</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {isAccepting && <Loader />}
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Join {invitation.organization_name}</h2>
        <p className="mt-1 text-sm text-gray-500">
          You&apos;ve been invited as{' '}
          <span className="font-medium">{formatRole(invitation.role)}</span>. Set a password and MFA
          to activate <span className="font-medium">{invitation.invited_email}</span>.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type={showPassword ? 'text' : 'password'}
                placeholder="Password*"
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
                  trigger('confirmPassword');
                }}
              />
            )}
          />
          {errors.password && (
            <p className="text-red-500 text-sm px-2 py-1 whitespace-pre-line">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <Controller
            name="confirmPassword"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm password*"
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
          {errors.confirmPassword && (
            <p className="text-red-500 text-sm px-2 py-1 whitespace-pre-line">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-700">Set up two-factor authentication</p>
          <p className="mt-1 text-xs text-gray-500">
            Add this key to an authenticator app (Google Authenticator, 1Password, Authy…), then
            confirm below.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white border border-[var(--border)] px-3 py-2">
            <code className="flex-1 truncate text-xs text-gray-700">{mfaSecret}</code>
            <button
              type="button"
              onClick={handleCopySecret}
              className="text-brand-600 hover:text-brand-700 cursor-pointer shrink-0"
              aria-label="Copy secret key"
            >
              <FaRegCopy />
            </button>
          </div>
          {otpAuthUri && <p className="mt-2 break-all text-[10px] text-gray-400">{otpAuthUri}</p>}

          <Controller
            name="mfaAcknowledged"
            control={control}
            render={({ field }) => (
              <CustomCheckbox
                className="mt-3 custom-checkbox"
                label="I've added this key to my authenticator app"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            )}
          />
          {errors.mfaAcknowledged && (
            <p className="text-red-500 text-sm px-2 py-1">{errors.mfaAcknowledged.message}</p>
          )}
        </div>

        <Button
          type="submit"
          appname="accept invitation"
          disabled={!isValid || isAccepting}
          className="mt-1 w-full rounded-3xl bg-button py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAccepting ? 'Activating…' : 'Activate account'}
        </Button>
      </form>
    </PageShell>
  );
};

export default AcceptInvitation;
