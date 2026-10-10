import { useEffect, useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import {
  MdLockOutline,
  MdErrorOutline,
  MdPersonOutline,
  MdOutlinePhone,
  MdOutlineEmail,
  MdOutlineSms,
  MdOutlineBadge,
  MdOutlineSecurity,
} from 'react-icons/md';
import { get } from 'lodash-es';
import { Select } from 'antd';
import { Button, Input, PasswordInput, PasswordRequirementsChecklist, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import Footer from '../Footer';
import {
  useLazyValidateInvitationQuery,
  useAcceptInvitationMutation,
  useSendInviteMfaCodeMutation,
  type InvitationErrorBody,
  type MfaMethodType,
} from '../../api/organization-service/Invitations/invitations';
import {
  restrictPhoneDigitsForCountry,
  splitE164,
} from '../../shared/utils/validation/phoneValidation';
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
  title: 'Invite Not Available',
  message:
    "This invite link isn't valid. Double-check the link from your email, or ask whoever invited you to send a new one.",
};
const INVITATION_EXPIRED_COPY = {
  title: 'This invite has expired',
  message: 'Ask whoever invited you to resend it. Invites are valid for 48 hours.',
};
const INVITATION_ALREADY_ACCEPTED_COPY = {
  title: 'Already Set Up',
  message:
    'This invite has already been used to create an account. If that was you, log in instead.',
};
const GENERIC_INVITE_ERROR_COPY = {
  title: 'Invite Not Available',
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
      return "We couldn't process that. Please check the highlighted fields and try again.";
    // MFA is mandatory now — a wrong/missing code means NOTHING was
    // created, on either side (see AcceptInvitationUseCase's docstring).
    // Told plainly, not softened into "something went wrong", because the
    // fix is specific: re-enter the code, or request a new one.
    case 'invalid_mfa_code':
      return "That verification code isn't correct. Double-check it, or request a new one, and try again.";
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
          valid, so it&apos;s safe to try again, but if this happens more than once, please contact
          your admin or Careerforce Pro support before trying a different email address. Your
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

/**
 * `wide` widens the inner card for the multi-section form itself (name,
 * phone, password, MFA all at once needs more breathing room than the
 * narrow single-field message screens below it) without touching the
 * outer gradient background every AuthPageShell-style screen shares.
 */
const PageShell = ({ children, wide = false }: { children: ReactNode; wide?: boolean }) => (
  // No `overflow-hidden` on this element itself — it used to clip the whole
  // page (logo/header down through the footer) to exactly one viewport
  // tall, so on this form specifically (the longest of the shared
  // auth-shell screens: name + phone + password + MFA all at once) a short
  // viewport left the top and bottom genuinely unreachable, with no
  // scrollbar to get to them. The decorative blobs below — the actual
  // reason `overflow-hidden` was here — are clipped to their own wrapper
  // instead, so the page can grow taller than 100vh and scroll normally
  // while the background still can't cause horizontal overflow.
  <div className="relative flex min-h-screen w-full flex-col items-center justify-center font-['DM Sans'] bg-gradient-to-br from-[#2c47a3] via-[#3f5bc4] to-[#6fc3e0] px-4 py-12">
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
    </div>
    <div
      className={`login-card-pop relative z-10 w-full rounded-3xl bg-white px-8 py-9 shadow-2xl ring-1 ring-black/5 sm:px-10 ${wide ? 'max-w-2xl' : 'max-w-md'}`}
    >
      <div className="mb-6 flex flex-col items-center">
        <img src="/cfpLogo.svg" alt="Careerforce Pro" className="h-10 w-auto object-contain" />
        <span className="ai-recruitment-text mt-2 text-xs tracking-widest uppercase">
          AI Powered Recruitment Solutions
        </span>
      </div>
      {children}
    </div>
    <Footer className="relative z-10 mt-8 shrink-0 text-white/70" />
  </div>
);

/** Small section header, shared by every group in the form below
 * (name/phone, password, two-factor) so the wider card reads as clearly
 * organized sections instead of one long stack of fields. */
const SectionHeading = ({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: ReactNode;
}) => (
  <div className="mb-3 flex items-center gap-2">
    <Icon className="text-base text-brand-600" />
    <span className="text-xs font-semibold tracking-wide text-gray-500">{children}</span>
  </div>
);

type MfaOption = {
  value: MfaMethodType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};
const MFA_OPTIONS: MfaOption[] = [
  { value: 'email', label: 'Email', icon: MdOutlineEmail },
  { value: 'sms', label: 'Phone', icon: MdOutlineSms },
];

// Authenticator app (TOTP) is deliberately not offered here — the client
// wants only email/SMS at first-time setup. It's still available afterward
// from Security Settings (see MfaSection.tsx) for anyone who wants to add it
// voluntarily; this picker just never shows it as a starting choice.

/** Equal-width, evenly-aligned method picker — replaces antd's
 * Radio.Group/Radio.Button here, whose default sizing let the options
 * render at visibly different widths with wrapped label text. */
const MfaMethodPicker = ({
  value,
  onChange,
}: {
  value: MfaMethodType;
  onChange: (value: MfaMethodType) => void;
}) => (
  <div className="grid grid-cols-2 gap-2">
    {MFA_OPTIONS.map(({ value: optionValue, label, icon: Icon }) => {
      const selected = value === optionValue;
      return (
        <button
          key={optionValue}
          type="button"
          onClick={() => onChange(optionValue)}
          aria-pressed={selected}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center text-xs font-medium transition-colors cursor-pointer ${
            selected
              ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
              : 'border-[var(--border)] bg-white text-gray-600 hover:border-brand-300 hover:text-brand-700'
          }`}
        >
          <Icon className="text-lg" />
          <span className="leading-tight">{label}</span>
        </button>
      );
    })}
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
  const [isAccepted, setIsAccepted] = useState(false);
  // Set only for EXTERNAL_SERVICE_ERROR on submit — everything else on this
  // path stays a toast. Cleared on every new submit attempt.
  const [externalServiceError, setExternalServiceError] = useState(false);

  const [validateInvitation, { data: invitation, isFetching, isError, error }] =
    useLazyValidateInvitationQuery();
  const [acceptInvitation, { isLoading: isAccepting }] = useAcceptInvitationMutation();
  const [sendInviteMfaCode, { isLoading: isSendingCode }] = useSendInviteMfaCodeMutation();

  useEffect(() => {
    if (token) {
      validateInvitation(token);
    }
  }, [token, validateInvitation]);

  const { control, handleSubmit, trigger, setValue, getValues, setError, formState } =
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
        methodType: 'email',
        mfaCode: '',
      },
      mode: 'onChange',
    });
  const { errors, isValid } = formState;
  const methodType = useWatch({ control, name: 'methodType' });
  const countryCode = useWatch({ control, name: 'countryCode' });
  const phoneNumber = useWatch({ control, name: 'phoneNumber' });
  const password = useWatch({ control, name: 'password' }) ?? '';

  // A code, once sent, is only valid for the destination it was sent to and
  // the method it was sent for. Tracked outside the form because it's a
  // fact about a network call this screen made, not a value the backend
  // reads directly.
  const [deliveryHint, setDeliveryHint] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);

  // is_platform_invite only becomes known once the token validates — until
  // then `isPlatformInvite` stays at its `false` default, which is harmless
  // since the form isn't rendered before `invitation` loads anyway (see the
  // isFetching/isError early returns below).
  //
  // Same load for `contact_phone`: a Company Admin invite already carries
  // the phone number typed into the "Add Company" form (ConfirmTenantUseCase
  // on the backend), so prefill it rather than make the same person type it
  // again — still editable, still validated, just not blank by default.
  // `shouldDirty: false` on both so an untouched prefill doesn't make the
  // form register as "changed" before the person has actually done anything.
  useEffect(() => {
    if (invitation) {
      setValue('isPlatformInvite', invitation.is_platform_invite, { shouldValidate: true });
      // Same idea as contact_phone below: whoever created this invite may
      // already have typed a name (single invite or bulk import). The wire
      // carries one combined string — split on the first space into
      // firstName/the rest, since this form still collects them separately.
      if (invitation.first_name || invitation.last_name) {
        // Already separate: no guessing where the first name ends.
        if (invitation.first_name) {
          setValue('firstName', invitation.first_name, {
            shouldDirty: false,
            shouldValidate: true,
          });
        }
        if (invitation.last_name) {
          setValue('lastName', invitation.last_name, { shouldDirty: false });
        }
      } else if (invitation.invited_name) {
        const [firstName, ...rest] = invitation.invited_name.trim().split(/\s+/);
        if (firstName) {
          setValue('firstName', firstName, { shouldDirty: false, shouldValidate: true });
        }
        if (rest.length > 0) {
          setValue('lastName', rest.join(' '), { shouldDirty: false });
        }
      }
      if (invitation.contact_phone) {
        const { countryCode: prefilledCountryCode, phoneNumber: prefilledPhoneNumber } = splitE164(
          invitation.contact_phone
        );
        if (prefilledCountryCode) {
          setValue('countryCode', prefilledCountryCode, { shouldDirty: false });
        }
        if (prefilledPhoneNumber) {
          setValue('phoneNumber', prefilledPhoneNumber, {
            shouldDirty: false,
            shouldValidate: true,
          });
        }
      }
    }
  }, [invitation, setValue]);

  // Switching method, or editing the SMS destination after a code was sent,
  // makes the previous code (if any) stale — clear it rather than let a
  // leftover value from a different factor reach the submit call.
  useEffect(() => {
    setDeliveryHint(null);
    setCodeSent(false);
    setValue('mfaCode', '', { shouldValidate: true });
  }, [methodType, setValue]);
  useEffect(() => {
    if (methodType === 'sms') {
      setDeliveryHint(null);
      setCodeSent(false);
      setValue('mfaCode', '', { shouldValidate: true });
    }
  }, [countryCode, phoneNumber, methodType, setValue]);

  const handleSendCode = async () => {
    if (!token || (methodType !== 'email' && methodType !== 'sms')) return;
    if (methodType === 'sms') {
      const valid = await trigger(['countryCode', 'phoneNumber']);
      if (!valid) return;
    }
    try {
      const values = getValues();
      const result = await sendInviteMfaCode({
        token,
        method_type: methodType,
        phone_number:
          methodType === 'sms'
            ? `${values.countryCode?.trim() ?? ''}${values.phoneNumber?.trim() ?? ''}`
            : undefined,
      }).unwrap();
      setDeliveryHint(result.delivery_hint);
      setCodeSent(true);
      showToast({ message: `Code sent to ${result.delivery_hint}.`, type: 'success' });
    } catch (err: unknown) {
      const body = get(err, 'data') as InvitationErrorBody | undefined;
      showToast({
        message: submitErrorMessageFor(
          body?.error_code,
          get(err, 'data.message', "Couldn't send a code. Please try again.")
        ),
        type: 'error',
      });
    }
  };

  const onSubmit = async (data: AcceptInvitationFormValues) => {
    if (!token) return;
    setExternalServiceError(false);
    try {
      await acceptInvitation({
        token,
        password: data.password,
        method_type: data.methodType,
        mfa_code: data.mfaCode,
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim() || undefined,
        country_code: data.isPlatformInvite ? undefined : data.countryCode?.trim() || undefined,
        phone_number: data.isPlatformInvite ? undefined : data.phoneNumber?.trim() || undefined,
      }).unwrap();
      setIsAccepted(true);
      // A 200 here already means the chosen factor is armed — MFA is
      // mandatory now, so there's nothing conditional left to tell the user.
      showToast({
        message: 'Account activated with two-factor authentication on. You can now log in.',
        type: 'success',
      });
      // The email goes in the address too: router state alone is lost on a
      // reload or a hard redirect. The login page removes it once it has read it.
      const invitedEmail = invitation?.invited_email;
      setTimeout(
        () =>
          navigate(invitedEmail ? `/login?email=${encodeURIComponent(invitedEmail)}` : '/login', {
            state: { prefillEmail: invitedEmail },
          }),
        2000
      );
    } catch (err: unknown) {
      const body = get(err, 'data') as InvitationErrorBody | undefined;
      if (body?.error_code === 'PASSWORD_POLICY_VIOLATION') {
        // The backend caught something the checklist above didn't (the
        // common-password blocklist and email-similarity check aren't
        // replicated client-side — see passwordPolicy.ts) — shown as a
        // field error on the password input, same as every other
        // field-specific rejection this form makes, never as a toast: a
        // toast here used to read as "credential provisioning failed" (an
        // organization-service misclassification fixed alongside this),
        // which told the user nothing about what to actually change.
        const violations = Array.isArray(body.details?.violations)
          ? (body.details!.violations as string[])
          : [];
        setError('password', {
          type: 'server',
          message:
            violations.length > 0
              ? violations.map((violation) => `• ${violation}`).join('\n')
              : "That password doesn't meet the requirements above.",
        });
        return;
      }
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

  // The code must actually have been requested — the regex in the schema
  // only checks shape, not that a real code is outstanding for it to be
  // checked against.
  const needsCodeRequest = !codeSent;

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
            {isAlreadyAccepted ? 'Go to login' : 'Back'}
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
    <PageShell wide>
      {isAccepting && <Loader />}
      <div className="text-center mb-7">
        <h2 className="text-2xl font-bold text-gray-900">Join {invitation.organization_name}</h2>
        <p className="mt-1.5 text-sm text-gray-500">
          Set a password and two-factor authentication to activate your account.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <MdOutlineBadge className="text-sm" />
            {formatRole(invitation.role)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            <MdOutlineEmail className="text-sm" />
            {invitation.invited_email}
          </span>
        </div>
      </div>

      {externalServiceError && (
        <ExternalServiceErrorBanner
          invitedEmail={invitation.invited_email}
          onRetry={handleSubmit(onSubmit)}
          isRetrying={isAccepting}
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div>
          <SectionHeading icon={MdPersonOutline}>Your details</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="text"
                    placeholder="First Name*"
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
                    placeholder="Last Name*"
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
          </div>

          {(!invitation.is_platform_invite || methodType === 'sms') && (
            <div className="mt-4">
              {invitation.is_platform_invite && (
                <p className="mb-1 px-2 text-xs text-gray-500">
                  Where should we text your verification code?
                </p>
              )}
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
                        placeholder="Phone Number*"
                        maxLength={15}
                        prefix={
                          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-100 mr-1">
                            <MdOutlinePhone className="text-brand-900 text-sm" />
                          </div>
                        }
                        className="w-full !normal-case px-4 py-2 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                        onChange={(e) => {
                          setValue(
                            'phoneNumber',
                            restrictPhoneDigitsForCountry(
                              e.target.value,
                              getValues('countryCode') ?? ''
                            ),
                            { shouldDirty: true, shouldValidate: true }
                          );
                          trigger('phoneNumber');
                        }}
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
        </div>

        <div>
          <SectionHeading icon={MdLockOutline}>Create a Password</SectionHeading>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <PasswordInput
                    {...field}
                    autoComplete="new-password"
                    noAutoCapitalize
                    placeholder="Password*"
                    prefix={
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-100 mr-1">
                        <MdLockOutline className="text-brand-900 text-sm" />
                      </div>
                    }
                    className="w-full !normal-case px-4 py-2 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
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
                  <PasswordInput
                    {...field}
                    autoComplete="new-password"
                    noAutoCapitalize
                    placeholder="Confirm Password*"
                    prefix={
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-100 mr-1">
                        <MdLockOutline className="text-brand-900 text-sm" />
                      </div>
                    }
                    className="w-full !normal-case px-4 py-2 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                  />
                )}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm px-2 py-1 whitespace-pre-line">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>
          {password.length > 0 && (
            <div className="px-2">
              <PasswordRequirementsChecklist password={password} />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-gray-50 p-4 sm:p-5">
          <SectionHeading icon={MdOutlineSecurity}>Two-Factor Authentication</SectionHeading>
          <p className="-mt-2 mb-3 text-xs text-gray-500">
            Required to activate your account. Choose how you&apos;d like to verify it&apos;s you.
          </p>

          <Controller
            name="methodType"
            control={control}
            render={({ field }) => (
              <MfaMethodPicker value={field.value} onChange={field.onChange} />
            )}
          />

          {(methodType === 'email' || methodType === 'sms') && (
            <div className="mt-3">
              <p className="text-xs text-gray-500">
                {methodType === 'email' ? (
                  <>
                    We&apos;ll send a code to{' '}
                    <span className="font-medium">{invitation.invited_email}</span>.
                  </>
                ) : (
                  "We'll text a code to the phone number above."
                )}
              </p>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={isSendingCode}
                className="mt-2 rounded-3xl border border-brand-600 px-4 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSendingCode ? 'Sending…' : codeSent ? 'Resend Code' : 'Send Code'}
              </button>
              {deliveryHint && (
                <p className="mt-2 text-xs text-gray-500">Code sent to {deliveryHint}.</p>
              )}
            </div>
          )}

          <Controller
            name="mfaCode"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                inputMode="numeric"
                maxLength={6}
                disabled={needsCodeRequest}
                placeholder="6-digit verification code"
                className="mt-3 w-full !normal-case px-4 py-2 bg-white border rounded-3xl text-center font-mono tracking-[0.4em] focus:ring focus:ring-brand-300 border-[var(--border)] disabled:bg-gray-100 disabled:cursor-not-allowed"
                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            )}
          />
          {errors.mfaCode ? (
            <p className="text-red-500 text-sm px-2 py-1">{errors.mfaCode.message}</p>
          ) : needsCodeRequest ? (
            <p className="mt-1 text-xs text-gray-500">
              Request a code above before entering it here.
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              A wrong or missing code will stop your account from being created; you&apos;ll be
              asked to try again.
            </p>
          )}
        </div>

        <Button
          type="submit"
          appname="accept invitation"
          disabled={!isValid || isAccepting || needsCodeRequest}
          className="mt-1 w-full rounded-3xl bg-button py-2.5 font-medium text-white transition-all duration-150 hover:brightness-105 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
        >
          {isAccepting ? 'Activating…' : 'Activate Account'}
        </Button>
      </form>
    </PageShell>
  );
};

export default AcceptInvitation;
