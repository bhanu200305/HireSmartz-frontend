import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { MdOutlineMailLock } from 'react-icons/md';
import { Button, Input, showToast } from '..';
import { Loader } from '../shared/ui/loader';
import {
  useMfaLoginChallengeMutation,
  useMfaLoginVerifyMutation,
} from '../../api/authentication-service/Mfa/loginChallenge';
import type {
  LoginTokenResponse,
  MfaRequiredResponse,
} from '../../api/authentication-service/Login/login';
import { getAuthErrorCode, getAuthErrorMessage } from '../../shared/utils/auth/authError.helpers';
import { maskDeliveryHint } from '../../shared/utils/formatting/maskDeliveryHint';

const METHOD_LABELS: Record<string, string> = {
  totp: 'authenticator app',
  sms: 'text message',
  email: 'email',
};

const describeMethod = (methodType: string, maskedDestination: string | null): string => {
  const label = METHOD_LABELS[methodType] ?? methodType;
  return maskedDestination ? `${label} (${maskDeliveryHint(maskedDestination)})` : label;
};

/**
 * The second step of login for an account with MFA armed. Renders after
 * POST /auth/login returns `status: "mfa_required"` (docs/API_CONTRACT.md
 * §5) — this component owns everything from there: entering the code,
 * resending it, switching to another enrolled factor, and completing the
 * login on success.
 *
 * Deliberately holds the challenge state (mfa_token, method_type,
 * available_methods) as a prop/callback pair rather than in Redux — it is
 * transient, exists only while this screen is mounted, and unlike the
 * post-login session there is nothing here worth surviving a refresh.
 */
const MfaChallengeStep = ({
  mfaState,
  onVerified,
  onBack,
}: {
  mfaState: MfaRequiredResponse;
  onVerified: (tokens: LoginTokenResponse) => void;
  onBack: () => void;
}) => {
  const [challenge, setChallenge] = useState(mfaState);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  // Set only for mfa_attempts_exceeded — the code field itself is now a dead
  // end (the guard is blocking further attempts on this challenge), so this
  // replaces the retry UI with the one real path forward instead of leaving
  // a cleared field and no explanation.
  const [attemptsExceeded, setAttemptsExceeded] = useState(false);
  // Progressive disclosure for "I can't complete this challenge at all" —
  // distinct from `attemptsExceeded` (a backend-enforced lockout). This is
  // the always-available way out: offer switching to another enrolled
  // factor first, and only surface account recovery once the user has
  // asked for it, so the code screen doesn't lead with a recovery link
  // ahead of the far more common "just send it another way" case.
  const [showRecoveryOptions, setShowRecoveryOptions] = useState(false);

  const [mfaLoginVerify, { isLoading: isVerifying }] = useMfaLoginVerifyMutation();
  const [mfaLoginChallenge, { isLoading: isReissuing }] = useMfaLoginChallengeMutation();

  const isBusy = isVerifying || isReissuing;

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Digits only, matching how every method type here actually delivers a code.
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setCode(value);
    if (codeError) setCodeError('');
  };

  // Auth-service's own spec for these codes — branch on `error_code`, never
  // on message text, since the backend can reword the message without
  // notice but the code is the contract. `mfa_session_expired` is the one
  // code in this set that ISN'T live on the backend yet (checked
  // 2026-09-24: authentication-service's `verify_mfa_token` still raises
  // the old uniform `invalid_mfa_code` for an expired/invalid interim
  // token, not a distinct code) — handled here anyway so this component
  // starts working the moment the backend ships it, with no second
  // frontend change needed.
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 4 || isBusy) return;

    try {
      const tokens = await mfaLoginVerify({ mfa_token: challenge.mfa_token, code }).unwrap();
      onVerified(tokens);
    } catch (err) {
      const errorCode = getAuthErrorCode(err);

      if (errorCode === 'mfa_session_expired') {
        showToast({
          message: 'Your sign-in expired, please log in again.',
          type: 'error',
        });
        onBack();
        return;
      }
      if (errorCode === 'mfa_attempts_exceeded') {
        setAttemptsExceeded(true);
        setCode('');
        return;
      }
      if (errorCode === 'mfa_challenge_expired') {
        setCodeError('Code expired.');
        setCode('');
        return;
      }
      if (errorCode === 'invalid_mfa_code') {
        setCodeError('Incorrect code, try again.');
        setCode('');
        return;
      }
      // Anything else (a network error, a code this screen doesn't know
      // about yet) falls back to the backend's own message rather than
      // inventing one.
      setCodeError(getAuthErrorMessage(err, 'That code was not accepted. Please try again.'));
      setCode('');
    }
  };

  const reissueChallenge = async (mfaMethodId?: string) => {
    if (isBusy) return;
    try {
      const reissued = await mfaLoginChallenge({
        mfa_token: challenge.mfa_token,
        mfa_method_id: mfaMethodId,
      }).unwrap();
      // Replaces the stored token with the freshly-issued one — the old
      // token no longer refers to a live challenge the instant this
      // succeeds, per the backend's own contract.
      setChallenge(reissued);
      setAttemptsExceeded(false);
      setShowRecoveryOptions(false);
      setCode('');
      setCodeError('');
      showToast({
        message: `A new code was sent via ${describeMethod(reissued.method_type, reissued.delivery_hint)}.`,
        type: 'success',
      });
    } catch (err) {
      const errorCode = getAuthErrorCode(err);

      if (errorCode === 'mfa_session_expired') {
        showToast({
          message: 'Your sign-in expired, please log in again.',
          type: 'error',
        });
        onBack();
        return;
      }
      if (errorCode === 'mfa_rate_limited') {
        // Explicitly no auto-retry — the lock clears itself server-side
        // after 15 minutes, and retrying on a timer here would just spend
        // the same budget the lock exists to protect.
        showToast({
          message: 'Too many codes requested. Please try again later.',
          type: 'error',
        });
        return;
      }
      showToast({
        message: getAuthErrorMessage(err, 'Could not send a new code. Please try again.'),
        type: 'error',
      });
    }
  };

  const otherMethods = challenge.available_methods.filter(
    (m) => m.mfa_method_id !== challenge.mfa_method_id
  );

  if (attemptsExceeded) {
    return (
      <div className="login-tab-fade flex flex-col items-center gap-3 text-center">
        {isBusy && <Loader />}
        <MdOutlineMailLock className="text-4xl text-red-500" />
        <h2 className="text-xl font-semibold text-gray-900">Too many attempts</h2>
        <p className="text-sm text-gray-500">
          This code has been blocked for too many wrong attempts. Request a new one, or recover your
          account if you no longer have access to your two-factor method.
        </p>
        <Button
          type="button"
          appname="resend mfa code after lockout"
          onClick={() => void reissueChallenge(challenge.mfa_method_id)}
          disabled={isBusy}
          className="mt-1 w-full rounded-3xl bg-button py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isReissuing ? 'Sending…' : 'Resend Code'}
        </Button>
        <Link
          to="/account-recovery"
          className="w-full rounded-3xl border border-[var(--border)] py-2.5 text-center font-medium text-gray-700"
        >
          Recover your account
        </Link>
        <button
          type="button"
          onClick={onBack}
          className="mt-1 flex items-center gap-1 text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <FaArrowLeft size={12} /> Back
        </button>
      </div>
    );
  }

  return (
    <form key="mfa" onSubmit={handleVerify} className="login-tab-fade flex flex-col gap-4">
      {isBusy && <Loader />}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Verify it&apos;s you</h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter the code from your {describeMethod(challenge.method_type, challenge.delivery_hint)}.
        </p>
      </div>

      <Input
        name="mfaCode"
        inputMode="numeric"
        error={codeError}
        value={code}
        onChange={handleCodeChange}
        placeholder="Verification code"
        className="border-[var(--border)] px-4 text-center tracking-[0.3em] focus:ring focus:ring-brand-300"
      />

      <Button
        type="submit"
        appname="verify mfa code"
        disabled={code.length < 4 || isBusy}
        className="mt-1 w-full rounded-3xl bg-button py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isVerifying ? 'Verifying…' : 'Verify'}
      </Button>

      <div className="flex flex-col items-center gap-2 text-sm">
        <button
          type="button"
          className="text-primary hover:underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => reissueChallenge(undefined)}
          disabled={isBusy}
        >
          Resend Code
        </button>

        {!showRecoveryOptions ? (
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 hover:underline cursor-pointer"
            onClick={() => setShowRecoveryOptions(true)}
          >
            Can&apos;t use your authenticator?
          </button>
        ) : (
          <>
            {otherMethods.map((method) => (
              <button
                key={method.mfa_method_id}
                type="button"
                className="text-gray-500 hover:underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => reissueChallenge(method.mfa_method_id)}
                disabled={isBusy}
              >
                Send It Via {describeMethod(method.method_type, method.masked_destination)} Instead
              </button>
            ))}
            <Link to="/account-recovery" className="text-gray-500 hover:underline">
              Recover your account
            </Link>
          </>
        )}

        <button
          type="button"
          onClick={onBack}
          className="mt-1 flex items-center gap-1 text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <FaArrowLeft size={12} /> Back
        </button>
      </div>
    </form>
  );
};

export default MfaChallengeStep;
