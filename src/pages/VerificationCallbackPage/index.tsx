import { useSearchParams } from 'react-router-dom';
import { useGetVerificationCallbackQuery } from '../../api/candidate-service/PublicApply/index';

// New — the ONE real, buildable piece of the ID.me verification flow on
// this frontend. `GET /public/v1/verification/callback?code=&state=` is a
// REDIRECT TARGET (PROJECT_UNDERSTANDING.md §7 / FRONTEND_INTEGRATION_DETAILS.md
// §5.3) — ID.me sends the candidate's browser here after their own
// identity-proofing flow finishes; `code`/`state` arrive as query params
// ID.me itself appends, never constructed by this app.
//
// Deliberately NOT built: a "Selfie Capture" or "Redirect Handoff" screen
// that pretends this frontend can START verification. It can't — the only
// start endpoint (`POST /internal/v1/candidates/{id}/verification/start`)
// is internal, service-token-gated, called by interview-service itself
// during a live call flow, not reachable from a browser. Building a fake
// "take a selfie" step here would imply a capability this app doesn't have;
// this page only handles the one real half of the flow.

export const VerificationCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') ?? '';
  const state = searchParams.get('state') ?? '';

  const { data, isLoading, isError } = useGetVerificationCallbackQuery(
    { code, state },
    { skip: !code || !state }
  );

  const missingParams = !code || !state;
  const verified = data?.data.verified === true;

  return (
    <div className="public-page min-h-screen bg-[#4D4D4D] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#F2F2F2] p-8 shadow-2xl text-center">
        {missingParams ? (
          <>
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 text-2xl flex items-center justify-center mx-auto mb-4">
              !
            </div>
            <h1 className="text-lg font-bold text-[#2D2D2D] mb-2">Invalid Verification Link</h1>
            <p className="text-sm text-[#2D2D2D]">
              This link is missing required parameters. Please use the link ID.me sent you, not a
              bookmarked or shared one.
            </p>
          </>
        ) : isLoading ? (
          <>
            <div className="w-8 h-8 mx-auto mb-4 rounded-full border-2 border-gray-300 border-t-[var(--primary)] animate-spin" />
            <p className="text-sm text-[#2D2D2D]">Confirming your identity…</p>
          </>
        ) : isError ? (
          <>
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 text-2xl flex items-center justify-center mx-auto mb-4">
              !
            </div>
            <h1 className="text-lg font-bold text-[#2D2D2D] mb-2">Something Went Wrong</h1>
            <p className="text-sm text-[#2D2D2D]">
              We couldn&apos;t confirm this verification. If you believe this is an error, contact
              the recruiting team.
            </p>
          </>
        ) : verified ? (
          <>
            <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 text-2xl flex items-center justify-center mx-auto mb-4">
              ✓
            </div>
            <h1 className="text-lg font-bold text-[#2D2D2D] mb-2">Identity Verified</h1>
            <p className="text-sm text-[#2D2D2D]">
              You&apos;re all set. You can close this window and return to your interview.
            </p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 text-2xl flex items-center justify-center mx-auto mb-4">
              !
            </div>
            <h1 className="text-lg font-bold text-[#2D2D2D] mb-2">We Couldn&apos;t Verify You</h1>
            <p className="text-sm text-[#2D2D2D]">
              ID.me was unable to confirm your identity. If you believe this is an error, contact
              the recruiting team.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default VerificationCallbackPage;
