import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PublicFooter } from '../../components/shared/PublicFooter';
import { usePublicCareersBranding } from '../../hooks/usePublicCareersBranding';

// New — no legacy equivalent to rewire. Splits candidate-service's two
// genuinely different apply paths (FRONTEND_INTEGRATION_DETAILS.md §5) into
// an explicit choice before the candidate commits to one: Path A
// (resume-first, `CareersApplyPage`, already real) vs Path B (instant call,
// no resume yet, `contact_no` required — `CareersInstantCallPage`, new).

export const CareersApplyChoicePage = () => {
  const { organizationId, jobId } = useParams<{ organizationId: string; jobId: string }>();
  const navigate = useNavigate();
  const { companyName, logoUrl } = usePublicCareersBranding(organizationId);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="public-page min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-gray-900 shadow-md text-white px-4 h-12 flex items-center justify-center relative shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 cursor-pointer text-white p-1 hover:opacity-75 transition-opacity"
          aria-label="Go back"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {logoUrl ? (
          <img src={logoUrl} alt={companyName ?? 'Company logo'} className="h-14 object-contain" />
        ) : (
          <span className="text-white font-bold text-xl tracking-widest">CFP</span>
        )}
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          How would you like to apply?
        </h1>
        <p className="text-sm text-gray-500 text-center mb-8">Pick whichever works for you</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => navigate(`/careers/${organizationId}/jobs/${jobId}/apply`)}
            className="text-left rounded-2xl border border-gray-200 bg-white p-6 hover:border-black transition-colors"
          >
            <div className="text-3xl mb-3">📄</div>
            <div className="font-bold text-gray-900 mb-1">Apply with Resume</div>
            <p className="text-sm text-gray-500">
              Fill out your details and upload your resume. We&apos;ll review and follow up by
              email.
            </p>
          </button>
          <button
            type="button"
            onClick={() => navigate(`/careers/${organizationId}/jobs/${jobId}/apply/call`)}
            className="text-left rounded-2xl border border-gray-200 bg-white p-6 hover:border-black transition-colors"
          >
            <div className="text-3xl mb-3">📞</div>
            <div className="font-bold text-gray-900 mb-1">Talk to Us Now</div>
            <p className="text-sm text-gray-500">
              Skip the form — give us a call number and we&apos;ll call you. Upload your resume
              afterward.
            </p>
          </button>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default CareersApplyChoicePage;
