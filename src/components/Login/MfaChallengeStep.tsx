import { useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
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
import { getAuthErrorMessage } from '../../shared/utils/auth/authError.helpers';

const METHOD_LABELS: Record<string, string> = {
  totp: 'authenticator app',
  sms: 'text message',
  email: 'email',
};

const describeMethod = (methodType: string, maskedDestination: string | null): string => {
  const label = METHOD_LABELS[methodType] ?? methodType;
  return maskedDestination ? `${label} (${maskedDestination})` : label;
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

  const [mfaLoginVerify, { isLoading: isVerifying }] = useMfaLoginVerifyMutation();
  const [mfaLoginChallenge, { isLoading: isReissuing }] = useMfaLoginChallengeMutation();

  const isBusy = isVerifying || isReissuing;

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Digits only, matching how every method type here actually delivers a code.
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setCode(value);
    if (codeError) setCodeError('');
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 4 || isBusy) return;

    try {
      const tokens = await mfaLoginVerify({ mfa_token: challenge.mfa_token, code }).unwrap();
      onVerified(tokens);
    } catch (err) {
      // invalid_mfa_code / mfa_challenge_expired / mfa_attempts_exceeded all
      // land here with the backend's own (deliberately uniform) message —
      // never invented client-side, so the same wording used on the API
      // side reaches the user unchanged.
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
      setChallenge(reissued);
      setCode('');
      setCodeError('');
      showToast({
        message: `A new code was sent via ${describeMethod(reissued.method_type, reissued.delivery_hint)}.`,
        type: 'success',
      });
    } catch (err) {
      showToast({
        message: getAuthErrorMessage(err, 'Could not send a new code. Please try again.'),
        type: 'error',
      });
    }
  };

  const otherMethods = challenge.available_methods.filter(
    (m) => m.mfa_method_id !== challenge.mfa_method_id
  );

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
          Resend code
        </button>

        {otherMethods.map((method) => (
          <button
            key={method.mfa_method_id}
            type="button"
            className="text-gray-500 hover:underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => reissueChallenge(method.mfa_method_id)}
            disabled={isBusy}
          >
            Send it via {describeMethod(method.method_type, method.masked_destination)} instead
          </button>
        ))}

        <button
          type="button"
          onClick={onBack}
          className="mt-1 flex items-center gap-1 text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <FaArrowLeft size={12} /> Back to login
        </button>
      </div>
    </form>
  );
};

export default MfaChallengeStep;
