import { useState } from 'react';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { MdOutlineSecurity } from 'react-icons/md';
import { FaRegCopy } from 'react-icons/fa';
import { Badge, Button, Input, showToast } from '..';
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
import { getAuthErrorMessage } from '../../shared/utils/auth/authError.helpers';

const METHOD_LABELS: Record<MfaMethodType, string> = {
  totp: 'Authenticator app',
  sms: 'Text message (SMS)',
  email: 'Email',
};

// E.164 shape, matches the backend's own check — the fast pre-check;
// `isValidPhoneNumber` (below, where this is used) additionally confirms
// the digit count is actually right for whichever country the leading
// dial code implies, which this shape alone can't tell (it'd happily
// accept a 14-digit "+91..." number, well past what a real Indian number
// is).
const phoneNumberPattern = /^\+[1-9]\d{7,14}$/;

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

  const handleCopySecret = async () => {
    if (!enrolment.secret) return;
    try {
      await navigator.clipboard.writeText(enrolment.secret);
      showToast({ message: 'Secret key copied.', type: 'success' });
    } catch {
      showToast({ message: 'Could not copy — please select and copy manually.', type: 'error' });
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
      showToast({ message: getAuthErrorMessage(err, 'Could not resend the code.'), type: 'error' });
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
          A code was sent{enrolment.delivery_hint ? ` to ${enrolment.delivery_hint}` : ''}. Enter it
          below to finish.
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
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
          onClick={onCancel}
          className="ml-auto text-gray-400 hover:underline cursor-pointer"
        >
          Cancel
        </button>
      </div>
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
      // invalid_credentials on a wrong password, among others — always the
      // backend's own message, never invented client-side.
      showToast({
        message: getAuthErrorMessage(err, 'Could not remove this method.'),
        type: 'error',
      });
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900">{METHOD_LABELS[method.method_type]}</p>
          {method.masked_destination && (
            <p className="text-xs text-gray-500">{method.masked_destination}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {method.is_default && <Badge status="info">Default</Badge>}
          {!method.is_enabled && <Badge status="warning">Awaiting confirmation</Badge>}
          {method.is_enabled && !method.is_default && (
            <button
              type="button"
              onClick={handleSetDefault}
              disabled={isSettingDefault}
              className="text-xs text-primary hover:underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              Set as default
            </button>
          )}
          {method.is_enabled && (
            <button
              type="button"
              onClick={() => setIsRemoving((v) => !v)}
              className="text-xs text-red-600 hover:underline cursor-pointer"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {isRemoving && (
        <div className="mt-3 flex flex-col gap-2 border-t border-[var(--border)] pt-3 sm:flex-row">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
}: {
  methodType: MfaMethodType;
  onEnrolled: (enrolment: MfaEnrolmentView) => void;
}) => {
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [enableMethod, { isLoading }] = useEnableMfaMethodMutation();

  const startEnrolment = async (phone?: string) => {
    try {
      const enrolment = await enableMethod({
        method_type: methodType,
        phone_number: phone,
      }).unwrap();
      onEnrolled(enrolment);
      setShowPhoneInput(false);
      setPhoneNumber('');
    } catch (err) {
      showToast({
        message: getAuthErrorMessage(
          err,
          `Could not start ${METHOD_LABELS[methodType]} enrolment.`
        ),
        type: 'error',
      });
    }
  };

  if (methodType === 'sms' && showPhoneInput) {
    const isValidPhone = phoneNumberPattern.test(phoneNumber) && isValidPhoneNumber(phoneNumber);
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-[var(--border)] p-4 sm:flex-row sm:items-center">
        <Input
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value.trim())}
          placeholder="+919876543210"
          className="border-[var(--border)] px-4"
        />
        <Button
          type="button"
          appname="start sms mfa enrolment"
          onClick={() => startEnrolment(phoneNumber)}
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
      onClick={() => (methodType === 'sms' ? setShowPhoneInput(true) : startEnrolment(undefined))}
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
              : `We recommend at least ${data.minimum_required} factors — a single one is a single point of failure if you lose access to it.`}
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
