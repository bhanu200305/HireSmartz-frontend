import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import { EnvironmentOutlined, CalendarOutlined } from '@ant-design/icons';
import { useGetPublicJobQuery } from '../../api/job-service/PublicCareers/index';
import { PublicFooter } from '../../components/shared/PublicFooter';
import { usePublicCareersBranding } from '../../hooks/usePublicCareersBranding';

const formatSalary = (min: number | null, max: number | null): string | null => {
  if (min === null && max === null) return null;
  const fmt = (n: number): string => (n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`);
  if (min !== null && max !== null) return `${fmt(min)} – ${fmt(max)}`;
  return fmt((min ?? max) as number);
};

const formatExperience = (min: number | null, max: number | null): string | null => {
  if (min === null && max === null) return null;
  if (min !== null && max !== null) return `${min}-${max} Years of Experience`;
  return `${min ?? max}+ Years of Experience`;
};

const formatLocation = (
  loc: { city: string | null; state: string | null; country: string | null } | undefined
): string | null => {
  if (!loc) return null;
  return [loc.city, loc.state, loc.country].filter(Boolean).join(', ') || null;
};

// The backend returns free-text blocks (jd/responsibilities/requirements/
// other_requirements), not markdown with '## ' section headers like the old
// aiJobDescription field did — each block is rendered as its own card of
// plain paragraphs/lines rather than parsed into bullet sections.
const TextBlock = ({ title, text }: { title: string; text: string | null }) => {
  if (!text) return null;
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5">
      <h2 className="text-base font-bold text-gray-900 mb-3">{title}</h2>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <p key={i} className="text-sm text-gray-600 leading-relaxed">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
};

export const CareersJobDetailPage = () => {
  const { organizationId, jobId } = useParams<{ organizationId: string; jobId: string }>();
  const navigate = useNavigate();
  const { companyName, logoUrl } = usePublicCareersBranding(organizationId);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const { data: job, isLoading } = useGetPublicJobQuery(
    { organizationId: organizationId ?? '', jobId: jobId ?? '' },
    { skip: !organizationId || !jobId }
  );

  const experience = job ? formatExperience(job.min_experience_req, job.max_experience_req) : null;
  const salary = job ? formatSalary(job.salary_min, job.salary_max) : null;
  const primaryLocation = job?.locations?.[0] ? formatLocation(job.locations[0]) : null;

  const handleApply = () => {
    navigate(`/careers/${organizationId}/jobs/${jobId}/apply`);
  };

  return (
    <div className="public-page min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-black text-white px-4 py-3 flex items-center justify-center relative shrink-0">
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
        {logoUrl ? (
          <img src={logoUrl} alt={companyName ?? 'Company logo'} className="h-10 object-contain" />
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              {job.job_title ?? job.job_profile_code}
            </h1>

            <div className="flex flex-col gap-1.5 mb-4">
              {primaryLocation && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <EnvironmentOutlined />
                  <span>{primaryLocation}</span>
                </div>
              )}
              {experience && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CalendarOutlined />
                  <span>{experience}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {job.vacancies !== null && (
                <span className="px-3 py-1 rounded-full border border-gray-200 text-xs font-medium text-gray-600 bg-white">
                  {job.vacancies} {job.vacancies === 1 ? 'opening' : 'openings'}
                </span>
              )}
              {salary && (
                <span className="px-3 py-1 rounded-full border border-gray-200 text-xs font-medium text-gray-600 bg-white">
                  {salary}
                </span>
              )}
              {job.skills.map((skill) => (
                <span
                  key={skill.skill_label}
                  className="px-3 py-1 rounded-full border border-gray-200 text-xs font-medium text-gray-600 bg-white"
                >
                  {skill.skill_label}
                  {skill.skill_type.toLowerCase() === 'mandatory' ? '' : ' (preferred)'}
                </span>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              <TextBlock title="Job Description" text={job.jd} />
              <TextBlock title="Responsibilities" text={job.responsibilities} />
              <TextBlock title="Requirements" text={job.requirements} />
              <TextBlock title="Other Requirements" text={job.other_requirements} />
            </div>
          </>
        )}
      </main>

      {job && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 z-10">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={handleApply}
              className="w-full bg-black text-white font-bold tracking-widest text-sm py-3.5 rounded-full hover:bg-gray-800 active:scale-95 transition-all"
            >
              APPLY FOR THIS JOB
            </button>
          </div>
        </div>
      )}

      <PublicFooter />
    </div>
  );
};

export default CareersJobDetailPage;
