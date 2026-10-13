import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useConfirmSmsConsentMutation,
  useGetSmsConsentLinkDetailsQuery,
} from '../../api/candidate-service/PublicApply/index';
import { PublicFooter } from '../../components/shared/PublicFooter';
import {
  getCandidateErrorMessage,
  getCandidateErrorStatusCode,
} from '../../shared/utils/auth/candidateError.helpers';

// Destination of the "Get text updates" button in a recruiter-uploaded
// candidate's application-received email — `{frontend}/sms-consent/{token}`.
// Same no-login, signed-token, GET-details-then-POST shape as
// CareersResumeUploadPage, minus the file upload and CAPTCHA: just a yes/no
// confirm. The token never expires, so there is no "link expired" state;
// an invalid or tampered token is a generic 404 on both endpoints, shown as
// a plain "isn't valid" message (retrying can't fix a bad token). Any other
// error (e.g. a 429 from the per-IP rate limit) shows the backend's own
// message, same as the rest of the public apply flow.

const INVALID_LINK_MESSAGE =
  "This link isn't valid. Please use the link from your email, or contact the recruiter directly.";

export const CareersSmsConsentPage = () => {
  const { token } = useParams<{ token: string }>();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const {
    data: linkDetails,
    isLoading: isLoadingDetails,
    error: detailsError,
  } = useGetSmsConsentLinkDetailsQuery(token ?? '', { skip: !token });

  const [confirmSmsConsent, { isLoading: isConfirming }] = useConfirmSmsConsentMutation();
  const [confirmed, setConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [tokenRejected, setTokenRejected] = useState(false);

  const details = linkDetails?.data;
  const greetingName = details?.first_name?.trim() || details?.last_name?.trim() || '';

  const handleConfirm = async () => {
    if (!token) return;
    setConfirmError(null);
    try {
      await confirmSmsConsent(token).unwrap();
      setConfirmed(true);
    } catch (err) {
      if (getCandidateErrorStatusCode(err) === 404) {
        setTokenRejected(true);
      } else {
        setConfirmError(getCandidateErrorMessage(err, 'Something went wrong. Please try again.'));
      }
    }
  };

  const renderStatus = (heading: string, body: string) => (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 text-3xl flex items-center justify-center mx-auto mb-4">
        ✓
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{heading}</h1>
      <p className="text-sm text-gray-500 max-w-md mx-auto">{body}</p>
    </div>
  );

  const renderContent = () => {
    if (!token) {
      return (
        <p className="text-sm text-gray-500 text-center max-w-sm mx-auto">
          This link is missing its token. Please use the link from your email instead of navigating
          here directly.
        </p>
      );
    }
    if (isLoadingDetails) {
      return <p className="text-sm text-gray-400 text-center py-8">Loading…</p>;
    }
    if (tokenRejected || (detailsError && getCandidateErrorStatusCode(detailsError) === 404)) {
      return (
        <p className="text-sm text-gray-500 text-center max-w-sm mx-auto">{INVALID_LINK_MESSAGE}</p>
      );
    }
    if (detailsError || !details) {
      return (
        <p className="text-sm text-gray-500 text-center max-w-sm mx-auto">
          {getCandidateErrorMessage(detailsError, 'Could not load this page. Please try again.')}
        </p>
      );
    }
    if (confirmed) {
      return renderStatus(
        "You're all set!",
        `Thanks${greetingName ? `, ${greetingName}` : ''}. You'll now receive text updates about your application. Reply STOP at any time to opt out.`
      );
    }
    if (details.already_consented) {
      return renderStatus(
        "You've already confirmed this",
        `${greetingName ? `Thanks, ${greetingName}. ` : ''}You're already signed up for text updates about your application. No further action is needed.`
      );
    }

    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-8 sm:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {greetingName ? `Hi ${greetingName},` : 'Hi there,'}
        </h1>
        <p className="text-base text-gray-700 mb-4">
          Confirm you&apos;d like to receive text updates about your application.
        </p>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          By confirming, you agree to receive SMS updates regarding your job application, interview
          scheduling, reminders, and status updates from HireSmartz. Message frequency may
          vary. Message &amp; data rates may apply. Reply STOP to opt out.
        </p>

        {confirmError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            {confirmError}
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={isConfirming}
          className="w-full bg-black text-white font-bold tracking-widest uppercase text-sm py-3.5 rounded-full hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isConfirming ? 'Confirming…' : 'Yes, Send Me Text Updates'}
        </button>
        <p className="text-xs text-gray-400 text-center mt-3">
          Not interested? Just close this page; nothing will change.
        </p>
      </div>
    );
  };

  return (
    <div className="public-page min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-black text-white px-4 py-3 flex items-center justify-center shrink-0">
        <span className="text-white font-bold text-xl tracking-widest">CFP</span>
      </header>

      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-10">{renderContent()}</main>

      <PublicFooter />
    </div>
  );
};

export default CareersSmsConsentPage;
