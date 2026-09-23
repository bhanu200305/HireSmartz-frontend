import { useSearchParams } from 'react-router-dom';
import InterviewConsentModal from '../../components/shared/ui/InterviewConsentModal';

export const PublicInterviewConsentPage = () => {
  const [searchParams] = useSearchParams();

  const bookingId = searchParams.get('bookingId');
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const isValid = Boolean(bookingId && token && email);

  const handleCancel = () => {
    window.close();
  };

  const handleContinue = () => {
    if (!isValid) return;
    const backendEndpoint = import.meta.env.VITE_BACKEND_ENDPOINT || '';
    // Construct the redirect URL: {VITE_BACKEND_ENDPOINT}/v1/interview/call-me-now/{bookingId}?token={token}&email={email}
    const redirectUrl = `${backendEndpoint}/v1/interview/call-me-now/${bookingId}?token=${encodeURIComponent(token!)}&email=${encodeURIComponent(email!)}`;
    window.location.href = redirectUrl;
  };

  if (!isValid) {
    return (
      <div className="min-h-screen bg-[#4D4D4D] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-[#F2F2F2] p-7 shadow-2xl text-center">
          <h2 className="text-2xl font-bold text-[#2D2D2D] mb-4">Invalid or Incomplete Link</h2>
          <p className="text-[#2D2D2D] text-sm mb-6 leading-relaxed">
            This interview consent link is invalid or missing required parameters. Please make sure
            you followed the full link from your invitation email.
          </p>
          <button
            type="button"
            onClick={handleCancel}
            className="min-w-30 rounded-lg border border-[#B8BDC4] bg-[#F2F2F2] px-5 py-2.5 text-xs font-semibold text-[#2D2D2D] transition hover:bg-[#E8EAED] cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#4D4D4D]">
      <InterviewConsentModal
        title="Consent for AI-Assisted Interview"
        description={
          <div className="space-y-4">
            <p>Before proceeding, please review and confirm the following:</p>
            <p>
              This interview will be conducted using an AI voice agent. By checking the box below,
              you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Have this call <strong>recorded</strong>
              </li>
              <li>
                Have your responses <strong>analyzed using AI-based tools</strong> as part of the
                evaluation process
              </li>
              <li>
                Allow the recording to be <strong>stored and reviewed</strong> by authorized
                personnel and/or hiring partners
              </li>
            </ul>
          </div>
        }
        disclaimer={
          <p className="mt-4">
            You may decline without affecting your candidacy. An alternative interview option (e.g.,
            live call with a recruiter) is available upon request. Please contact the hiring manager
            directly.
          </p>
        }
        consentLabel="I have read and agree to the above, and I consent to this recorded, AI-assisted interview."
        onCancel={handleCancel}
        onContinue={handleContinue}
        cancelText="CANCEL"
        continueText="CONTINUE"
        requireCheckbox={true}
        panelClassName="max-w-2xl"
      />
    </div>
  );
};

export default PublicInterviewConsentPage;
