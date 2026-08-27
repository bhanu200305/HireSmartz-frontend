import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaCheckCircle, FaRegCopy } from 'react-icons/fa';
import { MdLockOutline, MdErrorOutline, MdPersonOutline, MdOutlinePhone } from 'react-icons/md';
import { get } from 'lodash-es';
import { Select } from 'antd';
import { Button, CustomCheckbox, Input, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import Footer from '../Footer';
import {
  useLazyValidateInvitationQuery,
  useAcceptInvitationMutation,
  type InvitationErrorBody,
} from '../../api/organization-service/Invitations/invitations';
import { buildOtpAuthUri, generateBase32Secret } from '../../shared/utils/mfa.helpers';
import { handlePhoneNumberChange } from '../../shared/utils/validation/input.helpers';
import { countryCodes } from '../../constants/countryCode';
import { acceptInvitationSchema, type AcceptInvitationFormValues } from './AcceptInvitationSchema';

// Same default every other phone field in this app starts from (see
// EditCandidate.tsx/UserProfile).
const DEFAULT_COUNTRY_CODE = '+1';

// Copy for every documented error the two calls on this screen
// (validateInvitation / acceptInvitation) can return. Centralised so the
// "invite not available" screen and the submit-time messaging stay
// consistent with each other.
const INVITATION_NOT_FOUND_COPY = {
  title: 'Invite not available',
  message:
    "This invite link isn't valid. Double-check the link from your email, or ask whoever invited you to send a new one.",
};
const INVITATION_EXPIRED_COPY = {
  title: 'This invite has expired',
  message: 'Ask whoever invited you to resend it — invites are valid for 48 hours.',
};
const INVITATION_ALREADY_ACCEPTED_COPY = {
  title: 'Already set up',
  message:
    'This invite has already been used to create an account. If that was you, log in instead.',
};
const GENERIC_INVITE_ERROR_COPY = {
  title: 'Invite not available',
  message:
    'This invite link is invalid, expired, or has already been used. Ask whoever invited you to resend it.',
};

/** Static "can't show the form" screen (used when the token itself is bad) — branches on error_code. */
const inviteScreenCopyFor = (errorCode: string | undefined) => {
  switch (errorCode) {
    case 'INVITATION_NOT_FOUND':
      return INVITATION_NOT_FOUND_COPY;
    case 'INVITATION_EXPIRED':
      return INVITATION_EXPIRED_COPY;
    case 'INVITATION_ALREADY_ACCEPTED':
      return INVITATION_ALREADY_ACCEPTED_COPY;
    default:
      return GENERIC_INVITE_ERROR_COPY;
  }
};

/**
 * Submit-time (accept-call) error message. Covers the same three invite-state
 * errors as above — the token can go stale in the gap between page load and
 * submit — plus VALIDATION_ERROR. EXTERNAL_SERVICE_ERROR is deliberately NOT
 * handled here: it gets its own persistent banner (see `ExternalServiceErrorBanner`)
 * instead of a toast, because "just retry" isn't a safe thing to imply for it.
 */
const submitErrorMessageFor = (errorCode: string | undefined, fallback: string): string => {
  switch (errorCode) {
    case 'INVITATION_EXPIRED':
      return INVITATION_EXPIRED_COPY.message;
    case 'INVITATION_ALREADY_ACCEPTED':
      return INVITATION_ALREADY_ACCEPTED_COPY.message;
    case 'INVITATION_NOT_FOUND':
      return INVITATION_NOT_FOUND_COPY.message;
    case 'VALIDATION_ERROR':
      return "We couldn't process that — please check the highlighted fields and try again.";
    default:
      return fallback;
  }
};

/**
 * authentication-service failed while provisioning the new account's
 * credentials — see AcceptInvitationUseCase's docstring. The invite itself
 * is usually still PENDING and safe to retry (the local write hadn't
 * happened yet), but a credential can also have been created on the auth
 * side moments before the failure — so this must not read as a plain
 * "network hiccup, just try again." Rendered as a persistent inline panel
 * (not an auto-dismissing toast) with an explicit retry action and a
 * fallback path to support.
 */
const ExternalServiceErrorBanner = ({
  invitedEmail,
  onRetry,
  isRetrying,
}: {
  invitedEmail: string;
  onRetry: () => void;
  isRetrying: boolean;
}) => (
  <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
    <div className="flex items-start gap-2">
      <MdErrorOutline className="mt-0.5 shrink-0 text-lg text-red-500" />
      <div>
        <p className="text-sm font-medium text-red-800">
          We couldn&apos;t finish setting up your account
        </p>
        <p className="mt-1 text-sm text-red-700">
          Something went wrong on our end while activating {invitedEmail}. Your invite is still
          valid, so it&apos;s safe to try again — but if this happens more than once, please contact
          your admin or CareerForce Pro support before trying a different email address. Your
          account may have been partially created, and support can check before you continue.
        </p>
      </div>
    </div>
    <Button
      type="button"
      appname="retry account setup"
      onClick={onRetry}
      disabled={isRetrying}
      className="mt-3 rounded-3xl bg-button px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isRetrying ? 'Retrying…' : 'Retry'}
    </Button>
  </div>
);

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
  // Set only for EXTERNAL_SERVICE_ERROR on submit — everything else on this
  // path stays a toast. Cleared on every new submit attempt.
  const [externalServiceError, setExternalServiceError] = useState(false);

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

  const { control, handleSubmit, trigger, setValue, formState } =
    useForm<AcceptInvitationFormValues>({
      resolver: zodResolver(acceptInvitationSchema),
      defaultValues: {
        firstName: '',
        lastName: '',
        countryCode: DEFAULT_COUNTRY_CODE,
        phoneNumber: '',
        isPlatformInvite: false,
        password: '',
        confirmPassword: '',
        mfaAcknowledged: false,
      },
      mode: 'onChange',
    });
  const { errors, isValid } = formState;

  // is_platform_invite only becomes known once the token validates — until
  // then `isPlatformInvite` stays at its `false` default, which is harmless
  // since the form isn't rendered before `invitation` loads anyway (see the
  // isFetching/isError early returns below).
  useEffect(() => {
    if (invitation) {
      setValue('isPlatformInvite', invitation.is_platform_invite, { shouldValidate: true });
    }
  }, [invitation, setValue]);

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
    setExternalServiceError(false);
    try {
      await acceptInvitation({
        token,
        password: data.password,
        mfa_secret: mfaSecret,
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim() || undefined,
        country_code: data.isPlatformInvite ? undefined : data.countryCode?.trim() || undefined,
        phone_number: data.isPlatformInvite ? undefined : data.phoneNumber?.trim() || undefined,
      }).unwrap();
      setIsAccepted(true);
      showToast({ message: 'Account activated. You can now log in.', type: 'success' });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: unknown) {
      const body = get(err, 'data') as InvitationErrorBody | undefined;
      if (body?.error_code === 'EXTERNAL_SERVICE_ERROR') {
        // Persistent inline banner, not a toast — see ExternalServiceErrorBanner.
        setExternalServiceError(true);
        return;
      }
      showToast({
        message: submitErrorMessageFor(
          body?.error_code,
          get(err, 'data.message', 'Failed to accept invitation. Please try again.')
        ),
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
    const body = get(error, 'data') as InvitationErrorBody | undefined;
    const copy = inviteScreenCopyFor(body?.error_code);
    const isAlreadyAccepted = body?.error_code === 'INVITATION_ALREADY_ACCEPTED';
    return (
      <PageShell>
        <div className="flex flex-col items-center text-center gap-3">
          <MdErrorOutline className="text-4xl text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900">{copy.title}</h2>
          <p className="text-sm text-gray-500">{copy.message}</p>
          <Link to="/login" className="text-sm text-primary hover:underline mt-2">
            {isAlreadyAccepted ? 'Go to login' : 'Back to login'}
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

      {externalServiceError && (
        <ExternalServiceErrorBanner
          invitedEmail={invitation.invited_email}
          onRetry={handleSubmit(onSubmit)}
          isRetrying={isAccepting}
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <Controller
            name="firstName"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                placeholder="First name*"
                prefix={
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-100 mr-1">
                    <MdPersonOutline className="text-brand-900 text-sm" />
                  </div>
                }
                className="w-full !normal-case px-4 py-2 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              />
            )}
          />
          {errors.firstName && (
            <p className="text-red-500 text-sm px-2 py-1 whitespace-pre-line">
              {errors.firstName.message}
            </p>
          )}
        </div>

        <div>
          <Controller
            name="lastName"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                placeholder="Last name"
                prefix={
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-100 mr-1">
                    <MdPersonOutline className="text-brand-900 text-sm" />
                  </div>
                }
                className="w-full !normal-case px-4 py-2 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              />
            )}
          />
          {errors.lastName && (
            <p className="text-red-500 text-sm px-2 py-1 whitespace-pre-line">
              {errors.lastName.message}
            </p>
          )}
        </div>

        {!invitation.is_platform_invite && (
          <div>
            <div className="flex gap-2">
              <Controller
                name="countryCode"
                control={control}
                render={({ field }) => (
                  <div className="w-24 shrink-0 rounded-3xl border bg-white px-1 border-[var(--border)] focus-within:ring focus-within:ring-brand-300">
                    <Select
                      value={field.value}
                      onChange={field.onChange}
                      variant="borderless"
                      className="w-full"
                      showSearch
                      popupMatchSelectWidth={280}
                      filterOption={(input, option) =>
                        String(option?.label ?? '')
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      optionLabelProp="value"
                      options={countryCodes.map(({ short, value, label }) => ({
                        label: `${short} - ${label}`,
                        value,
                      }))}
                    />
                  </div>
                )}
              />
              <div className="min-w-0 flex-1">
                <Controller
                  name="phoneNumber"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="tel"
                      placeholder="Phone number*"
                      maxLength={14}
                      prefix={
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-100 mr-1">
                          <MdOutlinePhone className="text-brand-900 text-sm" />
                        </div>
                      }
                      className="w-full !normal-case px-4 py-2 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                      onChange={(e) => handlePhoneNumberChange(e, setValue, 'phoneNumber', trigger)}
                    />
                  )}
                />
              </div>
            </div>
            {(errors.countryCode || errors.phoneNumber) && (
              <p className="text-red-500 text-sm px-2 py-1 whitespace-pre-line">
                {errors.countryCode?.message || errors.phoneNumber?.message}
              </p>
            )}
          </div>
        )}

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
          className="mt-1 w-full rounded-3xl bg-button py-2.5 font-medium text-white transition-all duration-150 hover:brightness-105 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
        >
          {isAccepting ? 'Activating…' : 'Activate account'}
        </Button>
      </form>
    </PageShell>
  );
};

export default AcceptInvitation;
