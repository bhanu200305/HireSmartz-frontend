import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { usePublicBranding } from '../../hooks/usePublicBranding';
import { PublicFooter } from '../../components/shared/PublicFooter';

export const PublicJobSuccessPage = () => {
  const { qrCode } = useParams<{ qrCode: string }>();
  const navigate = useNavigate();
  const { state } = useLocation();
  const successMessage =
    (state as { message?: string } | null)?.message ??
    'Your application has been submitted successfully.';
  const jobTitle = (state as { jobTitle?: string } | null)?.jobTitle;

  const companyId = (state as { companyId?: number } | null)?.companyId ?? null;

  const { bannerUrl, headerStyle } = usePublicBranding(companyId);

  return (
    <div className="public-page min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header
        className="text-white px-4 py-3 flex items-center justify-center relative shrink-0"
        style={headerStyle}
      >
        {bannerUrl ? (
          <img src={bannerUrl} alt="Company Logo" className="h-16 object-contain max-w-90" />
        ) : (
          <span className="text-white font-bold text-base tracking-widest">CFP</span>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-start px-6 pt-16 pb-10 max-w-lg mx-auto w-full">
        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-8 shrink-0">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22c55e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-5 text-center">
          Application Submitted !
        </h1>

        <p className="text-gray-500 text-base leading-relaxed text-center mb-10">
          {successMessage}
          {jobTitle && (
            <>
              {' '}
              Ready to apply for another role? Tap{' '}
              <strong className="text-gray-800">Apply for Another Job.</strong>
            </>
          )}
        </p>

        <div className="flex flex-col gap-4 w-full">
          <button
            onClick={() => navigate(`/public/q/${qrCode}`)}
            className="w-full bg-black text-white font-bold tracking-widest text-sm py-4 rounded-full hover:bg-gray-800 active:scale-95 transition-all"
          >
            APPLY FOR ANOTHER JOB
          </button>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default PublicJobSuccessPage;
