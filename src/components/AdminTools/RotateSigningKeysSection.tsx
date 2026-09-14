import { useState } from 'react';
import { MdOutlineVpnKey, MdErrorOutline } from 'react-icons/md';
import { Button, showToast } from '..';
import {
  useRotateSigningKeysMutation,
  type RotateSigningKeysResponse,
} from '../../api/authentication-service/Admin/admin';
import { getAuthErrorMessage } from '../../shared/utils/auth/authError.helpers';

/**
 * POST /admin/signing-keys/rotate (docs/API_CONTRACT.md §8) — platform only,
 * re-keys every token the whole fleet verifies against. The single most
 * disruptive action this frontend can trigger, so it gets its own explicit
 * two-step confirm (no destination to type, unlike unlocking a specific
 * user — there's nothing to confirm except "yes, do this now") and a
 * result panel that stays on screen rather than a toast that disappears,
 * since `new_kid` / `previous_kid` are values an operator may need to
 * reference afterwards.
 */
const RotateSigningKeysSection = () => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [result, setResult] = useState<RotateSigningKeysResponse | null>(null);
  const [rotateSigningKeys, { isLoading }] = useRotateSigningKeysMutation();

  const handleConfirm = async () => {
    try {
      const response = await rotateSigningKeys().unwrap();
      setResult(response);
      setIsConfirming(false);
      showToast({ message: 'Signing key rotated.', type: 'success' });
    } catch (err) {
      showToast({
        message: getAuthErrorMessage(
          err,
          'Could not rotate the signing key. This action is platform-only.'
        ),
        type: 'error',
      });
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <MdOutlineVpnKey className="text-xl text-brand-700" />
        <h3 className="text-lg font-semibold text-gray-900">Rotate the signing key</h3>
      </div>
      <p className="mb-4 text-sm text-gray-500">
        Issues a new key and switches every future token to it. The previous public key stays in
        JWKS for the retirement grace period, so sessions already issued keep working until it
        expires naturally. This doesn&apos;t force a fleet-wide logout.
      </p>

      {!isConfirming && (
        <Button
          type="button"
          appname="start rotate signing key"
          onClick={() => setIsConfirming(true)}
          disabled={isLoading}
          className="rounded-3xl border border-red-200 px-5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Rotate signing key
        </Button>
      )}

      {isConfirming && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <MdErrorOutline className="mt-0.5 shrink-0 text-lg text-red-500" />
            <p className="text-sm text-red-800">
              This re-keys every token the entire fleet verifies against. No customer account should
              ever need this. Confirm you mean to rotate it now.
            </p>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              appname="cancel rotate signing key"
              onClick={() => setIsConfirming(false)}
              disabled={isLoading}
              className="rounded-3xl border border-[var(--border)] bg-white px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              appname="confirm rotate signing key"
              onClick={handleConfirm}
              disabled={isLoading}
              className="rounded-3xl bg-red-600 px-4 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Rotating…' : 'Yes, rotate now'}
            </Button>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-gray-50 p-4 text-sm">
          <p className="font-medium text-gray-700">Rotated</p>
          <p className="mt-1 text-gray-600">
            New key: <code className="font-mono">{result.new_kid}</code>
          </p>
          <p className="text-gray-600">
            Previous key: <code className="font-mono">{result.previous_kid}</code>{' '}
            <span className="text-gray-400">(still valid until the retirement window ends)</span>
          </p>
        </div>
      )}
    </section>
  );
};

export default RotateSigningKeysSection;
