import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import { MdErrorOutline } from 'react-icons/md';
import { AuthPageShell } from '../shared';
import { Loader } from '../shared/ui/loader';
import { useVerifyEmailMutation } from '../../api/authentication-service/EmailVerification/verifyEmail';
import { getAuthErrorCode, getAuthErrorMessage } from '../../shared/utils/auth/authError.helpers';

type ScreenState = 'verifying' | 'verified' | 'already_verified' | 'invalid';

/**
 * Lands here from the link verify-email / resend-verification emails.
 * Anonymous, no session — the token in the URL is the entire proof
 * (docs/API_CONTRACT.md §5 "POST /verify-email"). notification-service's
 * LinkBuilder.email_verification_url() places it in the path
 * (routes.tsx's /verify-email/:token); the query-string read is kept only
 * as a fallback for any older link still in flight. There's nothing for the
 * visitor to do but wait for the one call this page makes on mount.
 */
const VerifyEmail = () => {
  const { token: pathToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const token = pathToken || searchParams.get('token');
  const navigate = useNavigate();
  const [screen, setScreen] = useState<ScreenState>(token ? 'verifying' : 'invalid');
  const [errorMessage, setErrorMessage] = useState('');
  const [verifyEmail] = useVerifyEmailMutation();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!token || hasRun.current) return;
    hasRun.current = true;

    verifyEmail({ token })
      .unwrap()
      .then((result) => {
        setScreen('verified');
        setTimeout(() => navigate('/login', { state: { prefillEmail: result.email } }), 2000);
      })
      .catch((err) => {
        const errorCode = getAuthErrorCode(err);
        if (errorCode === 'email_already_verified') {
          setScreen('already_verified');
          return;
        }
        setErrorMessage(getAuthErrorMessage(err, 'This link is invalid or has expired.'));
        setScreen('invalid');
      });
  }, [token, verifyEmail, navigate]);

  if (screen === 'verifying') {
    return (
      <AuthPageShell>
        <Loader />
        <p className="text-center text-sm text-gray-500">Verifying your email…</p>
      </AuthPageShell>
    );
  }

  if (screen === 'verified') {
    return (
      <AuthPageShell>
        <div className="flex flex-col items-center gap-3 text-center">
          <FaCheckCircle className="text-4xl text-brand-600" />
          <h2 className="text-xl font-semibold text-gray-900">Email verified</h2>
          <p className="text-sm text-gray-500">Redirecting you to log in…</p>
        </div>
      </AuthPageShell>
    );
  }

  if (screen === 'already_verified') {
    return (
      <AuthPageShell>
        <div className="flex flex-col items-center gap-3 text-center">
          <FaCheckCircle className="text-4xl text-brand-600" />
          <h2 className="text-xl font-semibold text-gray-900">Already verified</h2>
          <p className="text-sm text-gray-500">
            This address was confirmed already, go ahead and log in.
          </p>
          <Link to="/login" className="mt-2 text-sm text-primary hover:underline">
            Go to login
          </Link>
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
          {errorMessage || 'Verification links expire; ask for a new one from the login page.'}
        </p>
        <Link to="/login" className="mt-2 text-sm text-primary hover:underline">
          Back
        </Link>
      </div>
    </AuthPageShell>
  );
};

export default VerifyEmail;
