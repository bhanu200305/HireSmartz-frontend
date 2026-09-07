import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import { EnvironmentOutlined, CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';
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

// The backend returns free-text blocks (jd/responsibilities/requirements/
// other_requirements), not markdown with '## ' section headers like the old
// aiJobDescription field did. The two shapes below aren't rendered the same
// way, because they aren't the same kind of text:
//
// - responsibilities/requirements/other_requirements are AI-extracted, one
//   complete point per line — a real bullet list.
// - jd is the RAW text ai-service's jd_text_extractor.py pulls straight out
//   of the uploaded PDF/DOCX (deliberately left unprocessed — see that
//   module's own docstring). Its '\n's are mostly the source document's
//   hard line-wraps, not paragraph breaks, and it can carry a stray control
//   character where a bullet glyph's font had no proper Unicode mapping
//   (pypdf extracts that as U+007F, which renders as an invisible box).
//   Both are handled here rather than upstream, since jd is intentionally
//   kept as the raw original.
const CONTROL_CHAR = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const BULLET_PREFIX = /^[•*-]\s*/;

const BulletBlock = ({ title, text }: { title: string; text: string | null }) => {
  if (!text) return null;
  const items = text
    .split('\n')
    .map((line) => line.replace(CONTROL_CHAR, '').trim())
    .filter(Boolean);
  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5">
      <h2 className="text-base font-bold text-gray-900 mb-3">{title}</h2>
      <ul className="list-disc pl-5 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-600 leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

// jd's raw extracted lines are mostly mid-sentence hard-wraps, not real
// paragraph breaks — merge lines into flowing paragraphs instead of
// rendering one fragment per line. A line is kept accumulating into the
// current paragraph until it ends a sentence (. ! ? :); a line that was
// bulleted in the source (control char or -/*/• prefix) is flushed as its
// own line instead, with a real bullet character.
const JdBlock = ({ text }: { text: string | null }) => {
  if (!text) return null;
  const rawLines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const paragraphs: string[] = [];
  let current: string[] = [];
  for (const raw of rawLines) {
    const isBullet = CONTROL_CHAR.test(raw) || BULLET_PREFIX.test(raw);
    const line = raw.replace(CONTROL_CHAR, '').replace(BULLET_PREFIX, '').trim();
    if (!line) continue;
    if (isBullet) {
      if (current.length) paragraphs.push(current.join(' '));
      current = [];
      paragraphs.push(`• ${line}`);
      continue;
    }
    current.push(line);
    if (/[.:!?]$/.test(line)) {
      paragraphs.push(current.join(' '));
      current = [];
    }
  }
  if (current.length) paragraphs.push(current.join(' '));
  if (paragraphs.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5">
      <h2 className="text-base font-bold text-gray-900 mb-3">Job Description</h2>
      <div className="space-y-2.5">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-sm text-gray-600 leading-relaxed">
            {p}
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
  const postedAgo = job ? formatPostedAgo(job.job_open_date) : null;

  const handleApply = () => {
    // Routes through the apply-method choice (resume vs. talk-now) instead
    // of straight to the resume form — see CareersApplyChoicePage.
    navigate(`/careers/${organizationId}/jobs/${jobId}/apply-choice`);
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
              {postedAgo && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <ClockCircleOutlined />
                  <span>{postedAgo}</span>
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
              <JdBlock text={job.jd} />
              <BulletBlock title="Responsibilities" text={job.responsibilities} />
              <BulletBlock title="Requirements" text={job.requirements} />
              <BulletBlock title="Other Requirements" text={job.other_requirements} />
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
