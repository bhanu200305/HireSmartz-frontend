import { useState } from 'react';
import { MdOutlineLockOpen } from 'react-icons/md';
import { Button, Input, showToast } from '..';
import { useUnlockUserByEmailMutation } from '../../api/authentication-service/Admin/admin';
import { getAuthErrorCode, getAuthErrorMessage } from '../../shared/utils/auth/authError.helpers';

// Loose check only — real validation is server-side (an invalid address
// 422s as invalid_email). This just stops an obviously-empty/malformed
// address from reaching the confirm step.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// error_code -> message shown instead of the backend's own (deliberately
// uniform, anti-enumeration — docs/API_CONTRACT.md §4.1 — so not worth
// passing straight through) wording for these two specific cases. Anything
// else falls back to getAuthErrorMessage's generic handling.
const UNLOCK_ERROR_MESSAGES: Record<string, string> = {
  credential_not_found: 'No account found with that email.',
  invalid_email: 'Enter a valid email address.',
};

/**
 * POST /admin/users/unlock (docs/API_CONTRACT.md §8). Clears a locked
 * account's lockout and its failed-attempt counter in one call, looked up by
 * email — a Company Admin reaching for this has the person's email on hand,
 * not their raw user id (unlockUser/useUnlockUserMutation, the {id}/unlock
 * form this replaces, is kept around for the row-action use case elsewhere,
 * which already has the id from the row it's acting on).
 *
 * Reachable by a Company Admin for their own tenant's users, or platform
 * support for anybody — the server decides which; this form doesn't know or
 * ask, same as the UUID version it replaces here.
 */
const UnlockUserSection = () => {
  const [email, setEmail] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [unlockUserByEmail, { isLoading }] = useUnlockUserByEmailMutation();

  const trimmedEmail = email.trim();
  const isValidEmail = EMAIL_PATTERN.test(trimmedEmail);

  const handleConfirm = async () => {
    try {
      await unlockUserByEmail({ email: trimmedEmail }).unwrap();
      showToast({ message: `${trimmedEmail} has been unlocked.`, type: 'success' });
      setEmail('');
      setIsConfirming(false);
    } catch (err) {
      const code = getAuthErrorCode(err);
      showToast({
        message:
          (code && UNLOCK_ERROR_MESSAGES[code]) ||
          getAuthErrorMessage(err, 'Could not unlock this account.'),
        type: 'error',
      });
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <MdOutlineLockOpen className="text-xl text-brand-700" />
        <h3 className="text-lg font-semibold text-gray-900">Unlock a user account</h3>
      </div>
      <p className="mb-4 text-sm text-gray-500">
        Clears the lockout from too many failed sign-in attempts, and resets the failure counter so
        it doesn&apos;t immediately re-lock.
      </p>

      <label htmlFor="unlock-user-email" className="mb-1 block text-xs font-medium text-gray-500">
        User email
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="unlock-user-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setIsConfirming(false);
          }}
          placeholder="user@company.com"
          className="border-[var(--border)] px-4 text-sm"
        />
        <Button
          type="button"
          appname="unlock user"
          onClick={() => setIsConfirming(true)}
          disabled={!isValidEmail || isLoading}
          className="shrink-0 rounded-3xl border border-[var(--border)] px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Unlock
        </Button>
      </div>

      {isConfirming && isValidEmail && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            Unlock <code className="font-mono">{trimmedEmail}</code>?
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              appname="cancel unlock user"
              onClick={() => setIsConfirming(false)}
              disabled={isLoading}
              className="rounded-3xl border border-[var(--border)] px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              appname="confirm unlock user"
              onClick={handleConfirm}
              disabled={isLoading}
              className="rounded-3xl bg-button px-4 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Unlocking…' : 'Confirm unlock'}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};

export default UnlockUserSection;
