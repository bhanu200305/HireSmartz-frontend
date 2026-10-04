import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import { MdErrorOutline } from 'react-icons/md';
import { AuthPageShell } from '../shared';
import { Loader } from '../shared/ui/loader';
import { useConfirmRecoveryEmailMutation } from '../../api/authentication-service/RecoveryEmail/confirmRecoveryEmail';
import { getAuthErrorCode, getAuthErrorMessage } from '../../shared/utils/auth/authError.helpers';

type ScreenState = 'verifying' | 'verified' | 'invalid';

/**
 * Lands here from the link sent to a just-set recovery email address.
 * Anonymous, no session — the token in the URL is the entire proof, same
 * shape as VerifyEmail. notification-service's LinkBuilder places it in the
 * path (routes.tsx's /confirm-recovery-email/:token).
 */
const ConfirmRecoveryEmail = () => {
  const { token: pathToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const token = pathToken || searchParams.get('token');
  const navigate = useNavigate();
  const [screen, setScreen] = useState<ScreenState>(token ? 'verifying' : 'invalid');
  const [confirmedEmail, setConfirmedEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmRecoveryEmail] = useConfirmRecoveryEmailMutation();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!token || hasRun.current) return;
    hasRun.current = true;

    confirmRecoveryEmail({ token })
      .unwrap()
      .then((res) => {
        setConfirmedEmail(res.email);
        setScreen('verified');
      })
      .catch((err) => {
        const errorCode = getAuthErrorCode(err);
        setErrorMessage(
          errorCode === 'recovery_email_already_exists'
            ? "That address is already confirmed as another account's recovery email."
            : getAuthErrorMessage(err, 'This link is invalid or has expired.')
        );
        setScreen('invalid');
      });
  }, [token, confirmRecoveryEmail]);

  if (screen === 'verifying') {
    return (
      <AuthPageShell>
        <Loader />
        <p className="text-center text-sm text-gray-500">Confirming your recovery email…</p>
      </AuthPageShell>
    );
  }

  if (screen === 'verified') {
    return (
      <AuthPageShell>
        <div className="flex flex-col items-center gap-3 text-center">
          <FaCheckCircle className="text-4xl text-brand-600" />
          <h2 className="text-xl font-semibold text-gray-900">Recovery Email Confirmed</h2>
          <p className="text-sm text-gray-500">
            {confirmedEmail} can now be used to recover your account if you ever lose access to your
            primary email and two-factor method.
          </p>
          <button
            type="button"
            onClick={() => navigate('/settings/security')}
            className="mt-2 text-sm text-primary hover:underline cursor-pointer"
          >
            Go To Security Settings
          </button>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <div className="flex flex-col items-center gap-3 text-center">
        <MdErrorOutline className="text-4xl text-red-500" />
        <h2 className="text-xl font-semibold text-gray-900">This link isn&apos;t valid</h2>
        <p className="text-sm text-gray-500">
          {errorMessage ||
            'Confirmation links expire; set a recovery email again to get a new one.'}
        </p>
        <Link to="/login" className="mt-2 text-sm text-primary hover:underline">
          Back
        </Link>
      </div>
    </AuthPageShell>
  );
};

export default ConfirmRecoveryEmail;
