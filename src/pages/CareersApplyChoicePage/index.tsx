import { useEffect } from 'react';
import { Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { LuArrowRight, LuFileText, LuPhoneCall } from 'react-icons/lu';
import { PublicFooter } from '../../components/shared/PublicFooter';
import { usePublicCareersBranding } from '../../hooks/usePublicCareersBranding';
import {
  publicApplyPathFor,
  useGetPublicJobQuery,
} from '../../api/job-service/PublicCareers/index';

// New — no legacy equivalent to rewire. Splits candidate-service's two
// genuinely different apply paths (FRONTEND_INTEGRATION_DETAILS.md §5) into
// an explicit choice before the candidate commits to one: Path A
// (resume-first, `CareersApplyPage`, already real) vs Path B (instant call,
// no resume yet, `contact_no` required — `CareersInstantCallPage`, new).
//
// Since the Intake Call became optional (2026-10-05) the job decides the path:
// a job with an Intake Call round (before or after Resume) shows the
// two-option choice below; a job with no Intake Call goes straight to the
// resume form. The choice also shows while job-service doesn't report
// `intake_call_position` yet.

export const CareersApplyChoicePage = () => {
  const { organizationId, jobId } = useParams<{ organizationId: string; jobId: string }>();
  const navigate = useNavigate();
  const { companyName, logoUrl } = usePublicCareersBranding(organizationId);
  const { data: job, isLoading: isJobLoading } = useGetPublicJobQuery(
    { organizationId: organizationId ?? '', jobId: jobId ?? '' },
    { skip: !organizationId || !jobId }
  );
  const applyPath = publicApplyPathFor(job);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    if (applyPath === 'resume') {
      navigate(`/careers/${organizationId}/jobs/${jobId}/apply`, { replace: true });
    }
  }, [applyPath, navigate, organizationId, jobId]);

  // Nothing to choose between while the job (and so its path) is loading,
  // or once it's known and the redirect above is under way.
  if (isJobLoading || applyPath === 'resume') {
    return (
      <div className="public-page min-h-screen bg-gray-50 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="public-page min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-gray-900 shadow-md text-white px-4 h-12 flex items-center justify-center relative shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 inline-flex cursor-pointer items-center gap-1 text-white p-1 hover:opacity-75 transition-opacity"
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
          <span className="text-sm">Back</span>
        </button>
        {logoUrl ? (
          <span className="bg-white rounded-md px-3 py-1.5 flex items-center">
            <img src={logoUrl} alt={companyName ?? 'Company logo'} className="h-7 object-contain" />
          </span>
        ) : (
          <span className="text-white font-bold text-xl tracking-widest">CFP</span>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full px-4 py-14">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
          How would you like to apply?
        </h1>
        <p className="text-sm text-gray-500 text-center mb-10">Pick whichever works for you</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          <button
            type="button"
            onClick={() => navigate(`/careers/${organizationId}/jobs/${jobId}/apply`)}
            className="group text-left rounded-2xl border border-gray-200 bg-white p-7 shadow-sm hover:shadow-lg hover:border-primary hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <LuFileText size={22} />
              </span>
              <LuArrowRight
                size={18}
                className="text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all mt-2"
              />
            </div>
            <div className="font-bold text-gray-900 mb-1.5">Apply With Resume</div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Fill out your details and upload your resume. We&apos;ll review and follow up by
              email.
            </p>
          </button>
          <button
            type="button"
            onClick={() => navigate(`/careers/${organizationId}/jobs/${jobId}/apply/call`)}
            className="group text-left rounded-2xl border border-gray-200 bg-white p-7 shadow-sm hover:shadow-lg hover:border-primary hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <LuPhoneCall size={22} />
              </span>
              <LuArrowRight
                size={18}
                className="text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all mt-2"
              />
            </div>
            <div className="font-bold text-gray-900 mb-1.5">Instant Call With Iris</div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Skip the form. Give us a call number and we&apos;ll call you. Upload your resume
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
