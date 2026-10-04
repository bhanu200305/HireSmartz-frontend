import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MdOutlineMailLock } from 'react-icons/md';
import { FaArrowLeft } from 'react-icons/fa';
import { AuthPageShell, Button, Input, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import { useStartAccountRecoveryMutation } from '../../../api/authentication-service/AccountRecovery/startAccountRecovery';
import { getAuthErrorMessage } from '../../../shared/utils/auth/authError.helpers';

/**
 * The "I lost everything" last resort — /forgot-password only helps if the
 * primary mailbox still works; this is for when the two-factor method is
 * gone too. Structurally ForgotPassword's twin, with honest copy about what
 * this actually does (resets the password AND disables every MFA method).
 *
 * Enumeration-safe: /account-recovery always returns 202 {accepted: true},
 * whether or not the address is known or verified — never render anything
 * here that differs based on what was typed (see startAccountRecovery.ts).
 */
const StartAccountRecovery = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [startAccountRecovery, { isLoading }] = useStartAccountRecoveryMutation();

  const isValidShape = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidShape || isLoading) return;
    try {
      await startAccountRecovery({ recovery_email: email.trim() }).unwrap();
      setIsDone(true);
    } catch (err) {
      showToast({
        message: getAuthErrorMessage(err, 'Could not start account recovery. Please try again.'),
        type: 'error',
      });
    }
  };

  if (isDone) {
    return (
      <AuthPageShell>
        <div className="flex flex-col items-center gap-3 text-center">
          <MdOutlineMailLock className="text-4xl text-brand-600" />
          <h2 className="text-xl font-semibold text-gray-900">Check That Inbox</h2>
          <p className="text-sm text-gray-500">
            If this address is a confirmed recovery email, a link is on its way. It expires in 1
            hour. If you never set up a recovery email, no email will arrive. Contact support
            instead.
          </p>
          <Link to="/login" className="mt-2 text-sm text-primary hover:underline">
            Back
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      {isLoading && <Loader />}
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold text-gray-900">Recover Your Account</h2>
        <p className="mt-1 text-sm text-gray-500">
          This only works if you added a recovery email in Settings → Security before losing access.
          It&apos;s a different address from the one you log in with. Recovering will{' '}
          <span className="font-medium">
            reset your password and remove your two-factor methods
          </span>
          .
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          type="email"
          noAutoCapitalize
          value={email}
          onChange={(e) => setEmail(e.target.value.replace(/\s/g, ''))}
          placeholder="Recovery email (not your login email)"
          className="border-[var(--border)] px-4 focus:ring focus:ring-brand-300"
        />

        <Button
          type="submit"
          appname="start account recovery"
          disabled={!isValidShape || isLoading}
          className="w-full rounded-3xl bg-button py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Submitting…' : 'Send Recovery Link'}
        </Button>

        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-800">
          Never set up a recovery email, or lost access to it too? Contact support and we&apos;ll
          verify your identity manually.
        </p>

        <button
          type="button"
          onClick={() => navigate('/login')}
          className="flex items-center justify-center text-sm text-gray-500 hover:underline cursor-pointer"
        >
          <FaArrowLeft className="mr-2 inline-block text-xs" />
          Back
        </button>
      </form>
    </AuthPageShell>
  );
};

export default StartAccountRecovery;
