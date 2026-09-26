import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Select } from 'antd';
import { MdOutlineSecurity, MdPhoneIphone } from 'react-icons/md';
import { FaRegCopy } from 'react-icons/fa';
import { Badge, Button, Input, PasswordInput, showToast } from '..';
import { countryCodes } from '../../constants/countryCode';
import {
  isPhoneValidForCountry,
  restrictPhoneDigitsForCountry,
  toE164,
} from '../../shared/utils/validation/phoneValidation';
import { cleanPhoneNumber } from '../../shared/utils/methods';
import {
  useConfirmMfaMethodMutation,
  useDisableMfaMethodMutation,
  useEnableMfaMethodMutation,
  useGetMfaStatusQuery,
  useResendMfaEnrolmentCodeMutation,
  useSetDefaultMfaMethodMutation,
  type MfaEnrolmentView,
  type MfaMethodView,
} from '../../api/authentication-service/Mfa/management';
import type { MfaMethodType } from '../../api/authentication-service/Login/login';
import { getAuthErrorCode, getAuthErrorMessage } from '../../shared/utils/auth/authError.helpers';
import { maskDeliveryHint } from '../../shared/utils/formatting/maskDeliveryHint';
import { useGetOwnUserProfileQuery } from '../../api/organization-service/Users/users';
import { useGetOwnPlatformProfileQuery } from '../../api/organization-service/Platform/staff';
import type { RootState } from '../../redux/provider/store';

const METHOD_LABELS: Record<MfaMethodType, string> = {
  totp: 'Authenticator app',
  sms: 'Text message (SMS)',
  email: 'Email',
};

/** In-place "enter the code we just sent / that's on your app" step, shared
 * by every method type once /enable has returned. */
const ConfirmEnrolment = ({
  enrolment,
  onDone,
  onCancel,
}: {
  enrolment: MfaEnrolmentView;
  onDone: () => void;
  onCancel: () => void;
}) => {
  const [code, setCode] = useState('');
  const [confirmMfaMethod, { isLoading: isConfirming }] = useConfirmMfaMethodMutation();
  const [resendCode, { isLoading: isResending }] = useResendMfaEnrolmentCodeMutation();
  // An enrolment that's never been /confirm'd has nothing to disarm, but
  // /mfa/disable still requires the current password unconditionally (see
  // mfa_router.py's disable_mfa docstring — it's guarding against a hijacked
  // session turning off MFA at all, not just an already-armed factor). So a
  // plain "Cancel" that only clears this component's own local state leaves
  // the just-created row behind forever as "Awaiting confirmation" — /enable
  // already created it server-side, and nothing else ever removes it. This
  // second step actually deletes it.
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelPassword, setCancelPassword] = useState('');
  const [disableMethod, { isLoading: isCancelSubmitting }] = useDisableMfaMethodMutation();

  const handleCopySecret = async () => {
    if (!enrolment.secret) return;
    try {
      await navigator.clipboard.writeText(enrolment.secret);
      showToast({ message: 'Secret key copied.', type: 'success' });
    } catch {
      showToast({ message: 'Could not copy. Please select and copy manually.', type: 'error' });
    }
  };

  const handleConfirm = async () => {
    if (code.trim().length < 4) return;
    try {
      await confirmMfaMethod({
        mfa_method_id: enrolment.mfa_method_id,
        code: code.trim(),
      }).unwrap();
      showToast({ message: 'Two-factor method confirmed and armed.', type: 'success' });
      onDone();
    } catch (err) {
      if (getAuthErrorCode(err) === 'mfa_method_not_found') {
        showToast({ message: 'This method was already removed.', type: 'error' });
        onCancel();
        return;
      }
      showToast({
        message: getAuthErrorMessage(err, 'That code was not accepted. Please try again.'),
        type: 'error',
      });
      setCode('');
    }
  };

  const handleResend = async () => {
    try {
      await resendCode({ mfa_method_id: enrolment.mfa_method_id }).unwrap();
      showToast({ message: 'A new code was sent.', type: 'success' });
    } catch (err) {
      if (getAuthErrorCode(err) === 'mfa_method_not_found') {
        showToast({ message: 'This method was already removed.', type: 'error' });
        onCancel();
        return;
      }
      showToast({ message: getAuthErrorMessage(err, 'Could not resend the code.'), type: 'error' });
    }
  };

  const handleCancelEnrolment = async () => {
    if (!cancelPassword) return;
    try {
      await disableMethod({
        mfa_method_id: enrolment.mfa_method_id,
        current_password: cancelPassword,
      }).unwrap();
      onCancel();
    } catch (err) {
      if (getAuthErrorCode(err) === 'mfa_method_not_found') {
        // Already gone — another tab (or another way this same tab acted on
        // it) removed it first. Nothing left to cancel.
        onCancel();
        return;
      }
      showToast({
        message: getAuthErrorMessage(err, 'Could not cancel this enrolment.'),
        type: 'error',
      });
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-gray-50 p-4">
      {enrolment.secret && enrolment.provisioning_uri ? (
        <>
          <p className="text-sm font-medium text-gray-700">
            Add this key to your authenticator app
          </p>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-white border border-[var(--border)] px-3 py-2">
            <code className="flex-1 truncate text-xs text-gray-700">{enrolment.secret}</code>
            <button
              type="button"
              onClick={handleCopySecret}
              className="text-brand-600 hover:text-brand-700 cursor-pointer shrink-0"
              aria-label="Copy secret key"
            >
              <FaRegCopy />
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-600">
          A code was sent
          {enrolment.delivery_hint ? ` to ${maskDeliveryHint(enrolment.delivery_hint)}` : ''}. Enter
          it below to finish.
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm();
          }}
          placeholder="Confirmation code"
          className="border-[var(--border)] px-4"
        />
        <Button
          type="button"
          appname="confirm mfa enrolment"
          onClick={handleConfirm}
          disabled={code.trim().length < 4 || isConfirming}
          className="shrink-0 rounded-3xl bg-button px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isConfirming ? 'Confirming…' : 'Confirm'}
        </Button>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        {!enrolment.secret && (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="text-primary hover:underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isResending ? 'Sending…' : 'Resend code'}
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsCancelling(true)}
          className="ml-auto font-medium text-gray-600 hover:text-red-600 hover:underline cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {isCancelling && (
        // Confirming the code (above) and cancelling out of it (here) both
        // act on the SAME just-created row — /mfa/enable already created it
        // server-side the moment this component mounted, so "Cancel" has to
        // actually delete it (current password required, same as Remove on
        // an already-armed method below) or it sits behind as a permanent
        // "Awaiting confirmation" entry with no other way to clear it.
        <div className="mt-3 flex flex-col gap-2 border-t border-[var(--border)] pt-3">
          <p className="text-xs text-gray-500">Enter your password to cancel this enrolment.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <PasswordInput
              autoComplete="current-password"
              value={cancelPassword}
              onChange={(e) => setCancelPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCancelEnrolment();
              }}
              placeholder="Confirm your current password"
              className="border-[var(--border)] px-4"
            />
            <Button
              type="button"
              appname="cancel mfa enrolment"
              onClick={handleCancelEnrolment}
              disabled={!cancelPassword || isCancelSubmitting}
              className="shrink-0 rounded-3xl bg-red-600 px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCancelSubmitting ? 'Cancelling…' : 'Confirm cancel'}
            </Button>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsCancelling(false);
              setCancelPassword('');
            }}
            className="self-start text-xs text-gray-500 hover:underline cursor-pointer"
          >
            Never mind, keep entering the code
          </button>
        </div>
      )}
    </div>
  );
};

/** One armed-or-arming factor row, with its own default/remove affordances. */
const MethodRow = ({ method }: { method: MfaMethodView }) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [password, setPassword] = useState('');
  const [setDefault, { isLoading: isSettingDefault }] = useSetDefaultMfaMethodMutation();
  const [disableMethod, { isLoading: isDisabling }] = useDisableMfaMethodMutation();

  const handleSetDefault = async () => {
    try {
      await setDefault({ mfa_method_id: method.mfa_method_id }).unwrap();
    } catch (err) {
      showToast({ message: getAuthErrorMessage(err, 'Could not set as default.'), type: 'error' });
    }
  };

  const handleDisable = async () => {
    if (!password) return;
    try {
      await disableMethod({
        mfa_method_id: method.mfa_method_id,
        current_password: password,
      }).unwrap();
      showToast({ message: 'Two-factor method removed.', type: 'success' });
      setIsRemoving(false);
      setPassword('');
    } catch (err) {
      if (getAuthErrorCode(err) === 'mfa_method_not_found') {
        // Already gone — another tab removed it first. The list refetch
        // (triggered by this error, see management.ts) will drop this row;
        // just stop showing the now-pointless password form.
        showToast({ message: 'This method was already removed.', type: 'error' });
        setIsRemoving(false);
        setPassword('');
        return;
      }
      // invalid_credentials on a wrong password, among others — always the
      // backend's own message, never invented client-side.
      showToast({
        message: getAuthErrorMessage(err, 'Could not remove this method.'),
        type: 'error',
      });
    }
  };

  return (
    // The whole card toggles the removal panel, not just the "Remove" text —
    // there was previously no visual cue that only that one small link did
    // anything, which read as the row simply not responding to clicks
    // anywhere else on it. Inner interactive controls (Set as default, the
    // password form once open) stop the click from bubbling here so they
    // don't also re-toggle the panel out from under the user.
    <div
      className="cursor-pointer rounded-2xl border border-[var(--border)] p-4"
      onClick={() => setIsRemoving((v) => !v)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900">{METHOD_LABELS[method.method_type]}</p>
          {method.masked_destination && (
            <p className="text-xs text-gray-500">{maskDeliveryHint(method.masked_destination)}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {method.is_default && <Badge status="info">Default</Badge>}
          {!method.is_enabled && <Badge status="warning">Awaiting confirmation</Badge>}
          {method.is_enabled && !method.is_default && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSetDefault();
              }}
              disabled={isSettingDefault}
              className="text-xs text-primary hover:underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              Set as default
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsRemoving((v) => !v);
            }}
            className="text-xs text-red-600 hover:underline cursor-pointer"
          >
            Remove
          </button>
        </div>
      </div>

      {isRemoving && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-3 flex flex-col gap-2 border-t border-[var(--border)] pt-3 sm:flex-row"
        >
          <PasswordInput
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleDisable();
            }}
            placeholder="Confirm your current password"
            className="border-[var(--border)] px-4"
          />
          <Button
            type="button"
            appname="disable mfa method"
            onClick={handleDisable}
            disabled={!password || isDisabling}
            className="shrink-0 rounded-3xl bg-red-600 px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDisabling ? 'Removing…' : 'Confirm removal'}
          </Button>
        </div>
      )}
    </div>
  );
};

/** The "add a new factor" affordance for one not-yet-added method type. */
const AddMethodButton = ({
  methodType,
  onEnrolled,
  existingCountryCode,
  existingNationalNumber,
}: {
  methodType: MfaMethodType;
  onEnrolled: (enrolment: MfaEnrolmentView) => void;
  /** Whatever's already on the profile — prefilled in, not enforced; see
   * the "+ Add" button's onClick below. */
  existingCountryCode: string;
  existingNationalNumber: string;
}) => {
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  // Dial code + national digits, same split UserProfile's own phone field
  // uses (countryCode.ts's `{label, value, short}` + restrictPhoneDigitsForCountry)
  // — replaces the old single free-text E.164 field, which had no country
  // picker at all and only showed "+919876543210" as placeholder text (never
  // a real prefilled value, but easy to mistake for one against a grayed-out
  // empty input).
  const [countryCode, setCountryCode] = useState('');
  const [nationalNumber, setNationalNumber] = useState('');
  const [enableMethod, { isLoading }] = useEnableMfaMethodMutation();

  const startEnrolment = async (phone?: string) => {
    try {
      const enrolment = await enableMethod({
        method_type: methodType,
        phone_number: phone,
      }).unwrap();
      onEnrolled(enrolment);
      setShowPhoneInput(false);
      setCountryCode('');
      setNationalNumber('');
    } catch (err) {
      showToast({
        message: getAuthErrorMessage(
          err,
          `Could not start ${METHOD_LABELS[methodType]} enrollment.`
        ),
        type: 'error',
      });
    }
  };

  if (methodType === 'sms' && showPhoneInput) {
    const isValidPhone =
      Boolean(countryCode) && isPhoneValidForCountry(nationalNumber, countryCode);
    // Guarded the same way the "Send code" button's own `disabled` is — Enter
    // pressed right after picking a country (before a number is typed) just
    // no-ops rather than submitting an incomplete number.
    const submitIfValid = () => {
      if (isValidPhone && !isLoading) startEnrolment(toE164(countryCode, nationalNumber));
    };
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-[var(--border)] p-4 sm:flex-row sm:items-center">
        <div className="phone-input-wrapper flex flex-1 items-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-gray)] pl-4 pr-2 transition-colors focus-within:border-[var(--primary-300)] focus-within:bg-white focus-within:shadow-[0_0_0_3px_var(--focus-ring)]">
          <MdPhoneIphone className="text-lg shrink-0 text-[var(--gray-400)]" />
          <Select
            value={countryCode || undefined}
            onChange={(value) => {
              setCountryCode(value);
              setNationalNumber((prev) => restrictPhoneDigitsForCountry(prev, value));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitIfValid();
            }}
            className="border-none bg-transparent focus:outline-none focus:ring-0"
            dropdownStyle={{ minWidth: 'min(300px, 92vw)' }}
            variant="borderless"
            style={{ width: '76px', fontSize: '14px' }}
            options={countryCodes.map(({ label, value, short }) => ({
              label: `${short} - ${label}`,
              value,
            }))}
            optionLabelProp="value"
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            placeholder="Search..."
          />
          <div className="h-6 border-l-2 border-[var(--border)]" />
          <Input
            type="tel"
            value={nationalNumber}
            onChange={(e) =>
              setNationalNumber(restrictPhoneDigitsForCountry(e.target.value, countryCode))
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitIfValid();
            }}
            placeholder="Phone number"
            maxLength={15}
            className="!shadow-none w-full border-none bg-transparent py-2.5 focus:outline-none focus:ring-0"
          />
        </div>
        <Button
          type="button"
          appname="start sms mfa enrolment"
          onClick={submitIfValid}
          disabled={!isValidPhone || isLoading}
          className="shrink-0 rounded-3xl bg-button px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Sending…' : 'Send code'}
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (methodType === 'sms') {
          // Prefill with whatever's already on the profile — a better
          // default, not a new field; the user can still change either
          // part, and whatever's in the boxes when they hit "Send code" is
          // what's sent.
          setCountryCode(existingCountryCode);
          setNationalNumber(
            restrictPhoneDigitsForCountry(existingNationalNumber, existingCountryCode)
          );
          setShowPhoneInput(true);
        } else {
          startEnrolment(undefined);
        }
      }}
      disabled={isLoading}
      className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-gray-600 hover:border-primary hover:text-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
    >
      + Add {METHOD_LABELS[methodType].toLowerCase()}
    </button>
  );
};

/**
 * The full /api/v1/mfa surface: current factors, add/confirm/default/remove,
 * and the "2 recommended" progress banner the backend itself reports rather
 * than enforces (docs/API_CONTRACT.md §6.1) — an incomplete enrolment is
 * never blocked at login, only surfaced here.
 */
const MfaSection = () => {
  const { data, isLoading, isError } = useGetMfaStatusQuery();
  const [pendingEnrolment, setPendingEnrolment] = useState<MfaEnrolmentView | null>(null);

  // Same profile the standalone profile page already loads (UserProfile) —
  // reused here only to default the SMS phone input, not as a new source of
  // truth for it.
  const callerKind = useSelector((state: RootState) => state.LoginSlice.callerKind);
  const isPlatformCaller = callerKind === 'platform';
  const { data: tenantProfile } = useGetOwnUserProfileQuery(undefined, { skip: isPlatformCaller });
  const { data: platformProfile } = useGetOwnPlatformProfileQuery(undefined, {
    skip: !isPlatformCaller,
  });
  const profile = isPlatformCaller ? platformProfile : tenantProfile;
  const existingCountryCode = profile?.country_code || '';
  const existingNationalNumber = profile?.phone_no ? cleanPhoneNumber(profile.phone_no) : '';

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <MdOutlineSecurity className="text-xl text-brand-700" />
        <h3 className="text-lg font-semibold text-gray-900">Two-factor authentication</h3>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {isError && <p className="text-sm text-red-600">Could not load your two-factor methods.</p>}

      {data && (
        <>
          <p className="mb-4 text-sm text-gray-500">
            {data.is_complete
              ? 'Your account meets the recommended minimum of two factors.'
              : `We recommend at least ${data.minimum_required} factors; a single one is a single point of failure if you lose access to it.`}
          </p>

          <div className="flex flex-col gap-3">
            {data.methods.map((method) => (
              <MethodRow key={method.mfa_method_id} method={method} />
            ))}

            {data.available_to_add.map((methodType) =>
              pendingEnrolment && pendingEnrolment.method_type === methodType ? (
                <div
                  key={methodType}
                  className="rounded-2xl border border-dashed border-[var(--border)] p-4"
                >
                  <p className="text-sm font-medium text-gray-700">
                    Adding {METHOD_LABELS[methodType].toLowerCase()}
                  </p>
                  <ConfirmEnrolment
                    enrolment={pendingEnrolment}
                    onDone={() => setPendingEnrolment(null)}
                    onCancel={() => setPendingEnrolment(null)}
                  />
                </div>
              ) : (
                <AddMethodButton
                  key={methodType}
                  methodType={methodType}
                  onEnrolled={setPendingEnrolment}
                  existingCountryCode={existingCountryCode}
                  existingNationalNumber={existingNationalNumber}
                />
              )
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default MfaSection;
