import { useState } from 'react';
import { MdOutlineMailLock } from 'react-icons/md';
import { Badge, Button, Input, PasswordInput, showToast } from '..';
import {
  useGetRecoveryEmailStatusQuery,
  useRemoveRecoveryEmailMutation,
  useSetRecoveryEmailMutation,
} from '../../api/authentication-service/RecoveryEmail/recoveryEmail';
import { getAuthErrorCode, getAuthErrorMessage } from '../../shared/utils/auth/authError.helpers';

/** "Add a recovery email" form — shown when nothing is set yet. */
const SetRecoveryEmailForm = ({ onPending }: { onPending: (email: string) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [setRecoveryEmail, { isLoading }] = useSetRecoveryEmailMutation();

  const isValidShape = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    if (!isValidShape || !password) return;
    try {
      await setRecoveryEmail({ current_password: password, recovery_email: email }).unwrap();
      showToast({
        message: `We've sent a confirmation link to ${email}.`,
        type: 'success',
      });
      onPending(email);
      setPassword('');
    } catch (err) {
      const code = getAuthErrorCode(err);
      if (code === 'recovery_email_matches_primary') {
        setEmailError('This is already your primary email; use a different address.');
        return;
      }
      showToast({
        message: getAuthErrorMessage(err, 'Could not set a recovery email. Please try again.'),
        type: 'error',
      });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-500">
        A recovery email is your last resort if you ever lose access to both your primary email and
        your two-factor method; it must be confirmed before it can be used.
      </p>
      <div>
        <Input
          type="email"
          noAutoCapitalize
          value={email}
          onChange={(e) => {
            setEmail(e.target.value.replace(/\s/g, ''));
            if (emailError) setEmailError('');
          }}
          placeholder="Recovery email address"
          className="border-[var(--border)] px-4"
        />
        {emailError && <p className="mt-1 px-2 text-sm text-red-500">{emailError}</p>}
      </div>
      <PasswordInput
        autoComplete="current-password"
        noAutoCapitalize
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Confirm your current password"
        className="border-[var(--border)] px-4"
      />
      <Button
        type="button"
        appname="set recovery email"
        onClick={handleSubmit}
        disabled={!isValidShape || !password || isLoading}
        className="w-fit shrink-0 rounded-3xl bg-button px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? 'Sending…' : 'Send Confirmation Link'}
      </Button>
    </div>
  );
};

/** Shown right after a successful set — the backend has no persisted
 * "pending" flag (the candidate address only lands on the account once
 * confirmed), so this state is tracked locally and lasts only for this
 * page visit. A reload before confirming shows the unset form again,
 * which is honest: nothing is actually on the account yet either. */
const PendingConfirmation = ({
  email,
  onResent,
  onCancel,
}: {
  email: string;
  onResent: () => void;
  onCancel: () => void;
}) => {
  const [password, setPassword] = useState('');
  const [setRecoveryEmail, { isLoading }] = useSetRecoveryEmailMutation();

  const handleResend = async () => {
    if (!password) return;
    try {
      await setRecoveryEmail({ current_password: password, recovery_email: email }).unwrap();
      showToast({ message: `A new confirmation link was sent to ${email}.`, type: 'success' });
      setPassword('');
      onResent();
    } catch (err) {
      showToast({
        message: getAuthErrorMessage(err, 'Could not resend the confirmation link.'),
        type: 'error',
      });
    }
  };

  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900">{email}</p>
          <p className="text-xs text-gray-500">Waiting for you to confirm this address.</p>
        </div>
        <Badge status="warning">Awaiting Confirmation</Badge>
      </div>
      <div className="mt-3 flex flex-col gap-2 border-t border-[var(--border)] pt-3 sm:flex-row">
        <PasswordInput
          autoComplete="current-password"
          noAutoCapitalize
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Confirm your current password to resend"
          className="border-[var(--border)] px-4"
        />
        <Button
          type="button"
          appname="resend recovery email confirmation"
          onClick={handleResend}
          disabled={!password || isLoading}
          className="shrink-0 rounded-3xl bg-button px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Sending…' : 'Resend Link'}
        </Button>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="mt-2 text-xs text-gray-400 hover:underline cursor-pointer"
      >
        Use A Different Address Instead
      </button>
    </div>
  );
};

/** Confirmed state — masked address, with re-auth-gated removal. */
const VerifiedRecoveryEmail = ({ maskedEmail }: { maskedEmail: string }) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [password, setPassword] = useState('');
  const [removeRecoveryEmail, { isLoading }] = useRemoveRecoveryEmailMutation();

  const handleRemove = async () => {
    if (!password) return;
    try {
      await removeRecoveryEmail({ current_password: password }).unwrap();
      showToast({ message: 'Recovery email removed.', type: 'success' });
      setIsRemoving(false);
      setPassword('');
    } catch (err) {
      showToast({
        message: getAuthErrorMessage(err, 'Could not remove your recovery email.'),
        type: 'error',
      });
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900">{maskedEmail}</p>
          <p className="text-xs text-gray-500">Confirmed, usable for full account recovery.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge status="success">Verified</Badge>
          <button
            type="button"
            onClick={() => setIsRemoving((v) => !v)}
            className="text-xs text-red-600 hover:underline cursor-pointer"
          >
            Remove
          </button>
        </div>
      </div>

      {isRemoving && (
        <div className="mt-3 flex flex-col gap-2 border-t border-[var(--border)] pt-3 sm:flex-row">
          <PasswordInput
            autoComplete="current-password"
            noAutoCapitalize
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Confirm your current password"
            className="border-[var(--border)] px-4"
          />
          <Button
            type="button"
            appname="remove recovery email"
            onClick={handleRemove}
            disabled={!password || isLoading}
            className="shrink-0 rounded-3xl bg-red-600 px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Removing…' : 'Confirm Removal'}
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * The recovery-email surface: /api/v1/auth/recovery-email (get/set/remove).
 * Third security card, alongside MfaSection/SessionsSection — see
 * docs/plans/account-recovery for the full feature this belongs to.
 */
const RecoverySection = () => {
  const { data, isLoading, isError } = useGetRecoveryEmailStatusQuery();
  // Local-only "just submitted, waiting on confirmation" state — see
  // PendingConfirmation's comment for why the backend has nothing to
  // persist here until the link is actually clicked.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <MdOutlineMailLock className="text-xl text-brand-700" />
        <h3 className="text-lg font-semibold text-gray-900">Recovery Email</h3>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {isError && <p className="text-sm text-red-600">Could not load your recovery email.</p>}

      {data &&
        (data.is_verified && data.recovery_email ? (
          <VerifiedRecoveryEmail maskedEmail={data.recovery_email} />
        ) : pendingEmail ? (
          <PendingConfirmation
            email={pendingEmail}
            onResent={() => {}}
            onCancel={() => setPendingEmail(null)}
          />
        ) : (
          <SetRecoveryEmailForm onPending={setPendingEmail} />
        ))}
    </section>
  );
};

export default RecoverySection;
