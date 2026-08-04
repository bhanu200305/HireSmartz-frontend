import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Spin } from 'antd';
import { EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useGetPublicJobByIdQuery } from '../../api/candidate-service/PublicQr/index';
import { usePublicBranding } from '../../hooks/usePublicBranding';
import { PublicFooter } from '../../components/shared/PublicFooter';
import type { PublicJob } from '../../types/PublicQr';
import { ApplyLaterModal } from '../../components/shared/ApplyLaterModal';

interface Section {
  title: string;
  bullets: string[];
}

const parseMarkdownSections = (md: string | null): Section[] => {
  if (!md) return [];
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const line of md.split('\n')) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current);
      current = { title: line.slice(3).trim(), bullets: [] };
    } else if (line.trim().startsWith('- ') && current) {
      current.bullets.push(line.trim().slice(2).trim());
    }
  }
  if (current) sections.push(current);
  return sections;
};

const getPostedDaysAgo = (dateStr: string): string => {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return 'Posted today';
  if (days === 1) return 'Posted 1 day ago';
  return `Posted ${days} days ago`;
};

const formatSalary = (min: number, max: number): string => {
  const fmt = (n: number): string => (n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`);
  return `${fmt(min)} – ${fmt(max)}`;
};

export const PublicJobDetailPage = () => {
  const { qrCode, jobId } = useParams<{ qrCode: string; jobId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const jobFromState = (state as { job?: PublicJob } | null)?.job;

  const { data: fetchedJob, isLoading } = useGetPublicJobByIdQuery(
    { qrCode: qrCode ?? '', jobId: Number(jobId) },
    { skip: !!jobFromState || !qrCode || !jobId }
  );

  const companyIdFromState = (state as { companyId?: number } | null)?.companyId ?? null;
  const companyIdFromParams = searchParams.get('companyId')
    ? Number(searchParams.get('companyId'))
    : null;
  const companyId = companyIdFromState ?? companyIdFromParams;
  const job = jobFromState ?? fetchedJob;

  const { bannerUrl, headerStyle } = usePublicBranding(companyId);
  const sections = parseMarkdownSections(job?.aiJobDescription ?? null);
  const locationLabel = job?.location
    ? [job.location.addressLine1, job.location.addressLine2, job.location.city, job.location.state]
        .filter(Boolean)
        .join(', ')
    : 'Location not specified';

  const handleApply = () => {
    navigate(
      `/public/q/${qrCode}/jobs/${jobId}/apply${companyId ? `?companyId=${companyId}` : ''}`,
      { state: { job, companyId } }
    );
  };

  const [applyLaterOpen, setApplyLaterOpen] = useState(false);

  return (
    <div className="public-page min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header
        className="text-white px-4 py-3 flex items-center justify-center relative shrink-0"
        style={headerStyle}
      >
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 text-white p-1 hover:opacity-75 transition-opacity"
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
        {bannerUrl ? (
          <img src={bannerUrl} alt="Company Logo" className="h-16 object-contain max-w-90" />
        ) : (
          <span className="text-white font-bold text-xl tracking-widest">CFP</span>
        )}
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 md:px-8 py-6 pb-32">
        {isLoading || !job ? (
          <div className="flex justify-center py-20">
            <Spin size="large" />
          </div>
        ) : (
          <>
            {/* Job Header */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{job.jobTitle}</h1>

            <div className="flex flex-col gap-1.5 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <EnvironmentOutlined />
                <span>
                  {locationLabel}
                  {job.isRemote ? ' (Remote)' : job.jobType ? ` (${job.jobType})` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ClockCircleOutlined />
                <span>{getPostedDaysAgo(job.createdAt)}</span>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="px-3 py-1 rounded-full border border-gray-200 text-xs font-medium text-gray-600 bg-white">
                {job.isRemote ? 'Remote' : job.jobType}
              </span>
              {job.department && (
                <span className="px-3 py-1 rounded-full border border-gray-200 text-xs font-medium text-gray-600 bg-white">
                  {job.department}
                </span>
              )}
              <span className="px-3 py-1 rounded-full border border-gray-200 text-xs font-medium text-gray-600 bg-white">
                {formatSalary(job.minimumSalary, job.maximumSalary)}
              </span>
            </div>

            {/* Sections */}
            <div className="flex flex-col gap-4">
              {sections.map((section) => (
                <div
                  key={section.title}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5"
                >
                  <h2 className="text-base font-bold text-gray-900 mb-3">{section.title}</h2>
                  {section.title.toLowerCase().includes('about') ? (
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {section.bullets.join(' ')}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {section.bullets.map((bullet, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Sticky Footer Buttons */}
      {job && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 z-10">
          <div className="flex flex-col md:flex-row gap-3 max-w-3xl mx-auto">
            <button
              onClick={handleApply}
              className="w-full md:flex-1 bg-black text-white font-bold tracking-widest text-sm py-3.5 rounded-full hover:bg-gray-800 active:scale-95 transition-all md:order-2"
            >
              APPLY FOR THIS JOB
            </button>
            <button
              onClick={() => setApplyLaterOpen(true)}
              className="w-full md:flex-1 border-2 border-gray-900 text-gray-900 font-semibold text-sm py-3.5 rounded-full hover:bg-gray-50 active:scale-95 transition-all md:order-1"
            >
              APPLY LATER
            </button>
          </div>
        </div>
      )}

      <ApplyLaterModal
        open={applyLaterOpen}
        qrCode={qrCode ?? ''}
        jobId={jobId !== undefined ? Number(jobId) : undefined}
        onClose={() => setApplyLaterOpen(false)}
      />

      <PublicFooter />
    </div>
  );
};

export default PublicJobDetailPage;
