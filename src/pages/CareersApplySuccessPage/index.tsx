import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PublicFooter } from '../../components/shared/PublicFooter';
import { usePublicCareersBranding } from '../../hooks/usePublicCareersBranding';

// New — generic confirmation for the real `/careers/...` apply tree (the
// old `/public/q/...` tree had its own `PublicJobSuccessPage`, but that
// whole route tree is legacy — see the plan's Phase 6 note). Reached from
// both apply paths:
// - Path A (resume) when the job has no Intake Call round / booking
//   degraded to null (`CareersApplyPage`) — `?callPlaced` absent.
// - Path B (instant call, `CareersInstantCallPage`) — `?callPlaced=true|false`.
//   `false` here is NOT an error (§6 "Degraded booking") — worded
//   accordingly, not as a failure.

export const CareersApplySuccessPage = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const callPlacedParam = searchParams.get('callPlaced');
  const { companyName, logoUrl } = usePublicCareersBranding(organizationId);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const message =
    callPlacedParam === 'true'
      ? "We've received your request; Iris will call you shortly."
      : callPlacedParam === 'false'
        ? "We've received your request, but couldn't place the call right now. Our team will follow up by phone or email."
        : "We've received your application. We'll be in touch if you're a match.";

  return (
    <div className="public-page min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-gray-900 shadow-md text-white px-4 h-12 flex items-center justify-center relative shrink-0">
        {logoUrl ? (
          <img src={logoUrl} alt={companyName ?? 'Company logo'} className="h-9 object-contain" />
        ) : (
          <span className="text-white font-bold text-xl tracking-widest">CFP</span>
        )}
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 text-3xl flex items-center justify-center mx-auto mb-4">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanks!</h1>
          <p className="text-sm text-gray-500 mb-8">{message}</p>
          <button
            type="button"
            onClick={() => navigate(`/careers/${organizationId}`)}
            className="rounded-full border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Browse More Roles
          </button>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default CareersApplySuccessPage;
