import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import {
  EnvironmentOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ScheduleOutlined,
  LaptopOutlined,
} from '@ant-design/icons';
import { useGetPublicJobQuery } from '../../api/job-service/PublicCareers/index';
import { PublicFooter } from '../../components/shared/PublicFooter';
import { usePublicCareersBranding } from '../../hooks/usePublicCareersBranding';
import {
  formatSalary,
  formatExperience,
  formatPostedAgo,
} from '../../shared/utils/publicJobDisplay';

const formatLocation = (
  loc: { city: string | null; state: string | null; country: string | null } | undefined
): string | null => {
  if (!loc) return null;
  return [loc.city, loc.state, loc.country].filter(Boolean).join(', ') || null;
};

// responsibilities/requirements/other_requirements are AI-extracted, one point per line.
// jd is raw text extracted from the uploaded PDF/DOCX, so its line breaks are mostly
// hard-wraps rather than paragraph breaks and can carry stray control characters.
const CONTROL_CHAR = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const BULLET_PREFIX = /^[•*-]\s*/;
const HEADING_PREFIX = /^#{1,6}\s*/;

// Merges hard-wrapped lines into paragraphs; strips Markdown heading/bullet syntax.
type JdLine = { kind: 'heading' | 'bullet' | 'text'; text: string };

const JdBlock = ({ text, jobTitle }: { text: string | null; jobTitle: string | null }) => {
  if (!text) return null;
  const rawLines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const lines: JdLine[] = [];
  let current: string[] = [];
  const flushCurrent = () => {
    if (current.length) lines.push({ kind: 'text', text: current.join(' ') });
    current = [];
  };
  for (const raw of rawLines) {
    if (HEADING_PREFIX.test(raw)) {
      flushCurrent();
      const heading = raw.replace(HEADING_PREFIX, '').trim();
      // Substitute the real title for the literal heading text.
      const resolvedHeading =
        heading.toLowerCase() === 'job title' && jobTitle ? jobTitle : heading;
      if (resolvedHeading) {
        lines.push({ kind: 'heading', text: resolvedHeading });
      }
      continue;
    }
    const isBullet = CONTROL_CHAR.test(raw) || BULLET_PREFIX.test(raw);
    const line = raw.replace(CONTROL_CHAR, '').replace(BULLET_PREFIX, '').trim();
    if (!line) continue;
    if (isBullet) {
      flushCurrent();
      lines.push({ kind: 'bullet', text: line });
      continue;
    }
    current.push(line);
    if (/[.:!?]$/.test(line)) flushCurrent();
  }
  flushCurrent();
  if (lines.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5">
      <h2 className="text-base font-bold text-gray-900 mb-3">Job Description</h2>
      <div className="space-y-2.5">
        {lines.map((line, i) => {
          if (line.kind === 'heading') {
            return (
              <h3 key={i} className="text-sm font-bold text-gray-900 pt-1.5 first:pt-0">
                {line.text}
              </h3>
            );
          }
          if (line.kind === 'bullet') {
            return (
              <p key={i} className="text-sm text-gray-600 leading-relaxed pl-4 -indent-4">
                • {line.text}
              </p>
            );
          }
          return (
            <p key={i} className="text-sm text-gray-600 leading-relaxed">
              {line.text}
            </p>
          );
        })}
      </div>
    </div>
  );
};

export const CareersJobDetailPage = () => {
  const { organizationId, jobId } = useParams<{ organizationId: string; jobId: string }>();
  const navigate = useNavigate();
  const {
    companyName,
    logoUrl,
    isLoading: brandingLoading,
  } = usePublicCareersBranding(organizationId);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const { data: job, isLoading } = useGetPublicJobQuery(
    { organizationId: organizationId ?? '', jobId: jobId ?? '' },
    { skip: !organizationId || !jobId }
  );

  const experience = job ? formatExperience(job.min_experience_req, job.max_experience_req) : null;
  const salary = job ? formatSalary(job.salary_min, job.salary_max, job.is_exempted) : null;
  const primaryLocation = job?.locations?.[0] ? formatLocation(job.locations[0]) : null;
  const postedAgo = job ? formatPostedAgo(job.job_open_date) : null;

  const handleApply = () => {
    // Routes through the apply-method choice (resume vs. talk-now) instead
    // of straight to the resume form — see CareersApplyChoicePage.
    navigate(`/careers/${organizationId}/jobs/${jobId}/apply-choice`);
  };

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
        {brandingLoading ? null : logoUrl ? (
          <img src={logoUrl} alt={companyName ?? 'Company logo'} className="h-14 object-contain" />
        ) : (
          <span className="text-white font-bold text-xl tracking-widest">CFP</span>
        )}
      </header>

      <main className="w-full max-w-3xl mx-auto px-4 md:px-8 py-6">
        {isLoading || !job ? (
          <div className="flex justify-center items-center min-h-[70vh]">
            <Spin size="large" />
          </div>
        ) : (
          <>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {job.job_title ?? job.job_profile_code}
            </h1>
            <p className="text-sm text-gray-400 mb-3">{job.job_profile_code}</p>

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
              {job.job_type_name && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <ScheduleOutlined />
                  <span>{job.job_type_name}</span>
                </div>
              )}
              {job.job_mode_name && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <LaptopOutlined />
                  <span>{job.job_mode_name}</span>
                </div>
              )}
              {postedAgo && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <ClockCircleOutlined />
                  <span>{postedAgo}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
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
                  {skill.skill_type.toLowerCase() === 'required' ? '' : ' (preferred)'}
                </span>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              <JdBlock text={job.jd} jobTitle={job.job_title} />
            </div>
          </>
        )}
      </main>

      {job && (
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4 z-10">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={handleApply}
              className="w-full cursor-pointer bg-black text-white font-bold tracking-widest text-sm py-3.5 rounded-full hover:bg-gray-800 active:scale-95 transition-all"
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
