import { useState } from 'react';
import { MdOutlineLockOpen } from 'react-icons/md';
import { Button, Input, showToast } from '..';
import { useUnlockUserMutation } from '../../api/authentication-service/Admin/admin';
import { getAuthErrorMessage } from '../../shared/utils/auth/authError.helpers';

// Loose check only — real validation is server-side (a non-UUID 422s as
// VALIDATION_ERROR). This just stops an obviously-empty/malformed id from
// reaching the confirm step.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /admin/users/{id}/unlock (docs/API_CONTRACT.md §8). Clears a locked
 * account's lockout and its failed-attempt counter in one call. Reachable
 * by a Company Admin for their own tenant's users, or platform support for
 * anybody — the server decides which; this form doesn't know or ask.
 */
const UnlockUserSection = () => {
  const [userId, setUserId] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [unlockUser, { isLoading }] = useUnlockUserMutation();

  const isValidId = UUID_PATTERN.test(userId.trim());

  const handleConfirm = async () => {
    try {
      await unlockUser({ userId: userId.trim() }).unwrap();
      showToast({ message: 'Account unlocked.', type: 'success' });
      setUserId('');
      setIsConfirming(false);
    } catch (err) {
      showToast({
        message: getAuthErrorMessage(err, 'Could not unlock this account.'),
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

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value.trim());
            setIsConfirming(false);
          }}
          placeholder="User id (UUID)"
          className="border-[var(--border)] px-4 font-mono text-sm"
        />
        <Button
          type="button"
          appname="unlock user"
          onClick={() => setIsConfirming(true)}
          disabled={!isValidId || isLoading}
          className="shrink-0 rounded-3xl border border-[var(--border)] px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Unlock
        </Button>
      </div>

      {isConfirming && isValidId && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            Unlock <code className="font-mono">{userId}</code>?
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
