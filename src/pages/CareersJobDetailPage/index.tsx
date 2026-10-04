import { useEffect, type ReactElement } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Result, Button } from 'antd';
import {
  EnvironmentOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ScheduleOutlined,
  LaptopOutlined,
  FieldTimeOutlined,
  ReadOutlined,
  DollarOutlined,
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

// responsibilities/requirements/other_requirements/benefits are AI-extracted, one point per line.
// jd is raw text extracted from the uploaded PDF/DOCX, so its line breaks are mostly
// hard-wraps rather than paragraph breaks and can carry stray control characters.
// eslint-disable-next-line no-control-regex -- matching control chars is the point, not a mistake
const CONTROL_CHAR = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const BULLET_PREFIX = /^[•*-]\s*/;
const HEADING_PREFIX = /^#{1,6}\s*/;
// Strips literal Markdown emphasis (`**bold**`) from AI-generated JD text.
const MARKDOWN_EMPHASIS = /\*+/g;
// A bold bullet line ending in a colon is a section label, not a bullet.
const SECTION_LABEL = /^[A-Z][A-Za-z0-9 /&-]{1,40}:$/;

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
    const line = raw
      .replace(CONTROL_CHAR, '')
      .replace(BULLET_PREFIX, '')
      .replace(MARKDOWN_EMPHASIS, '')
      .trim();
    if (!line) continue;
    if (isBullet && SECTION_LABEL.test(line)) {
      flushCurrent();
      lines.push({ kind: 'heading', text: line.replace(/:$/, '') });
      continue;
    }
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

  const {
    data: job,
    isLoading,
    isError,
  } = useGetPublicJobQuery(
    { organizationId: organizationId ?? '', jobId: jobId ?? '' },
    { skip: !organizationId || !jobId }
  );

  const experience = job ? formatExperience(job.min_experience_req, job.max_experience_req) : null;
  const salary = job
    ? formatSalary(
        job.exempt_salary_min,
        job.exempt_salary_max,
        job.non_exempt_salary_min,
        job.non_exempt_salary_max
      )
    : null;
  const primaryLocation = job?.locations?.[0] ? formatLocation(job.locations[0]) : null;
  const postedAgo = job ? formatPostedAgo(job.job_open_date) : null;

  const overviewItems = job
    ? [
        primaryLocation && { icon: <EnvironmentOutlined />, label: primaryLocation },
        experience && { icon: <CalendarOutlined />, label: experience },
        job.job_type_name && { icon: <ScheduleOutlined />, label: job.job_type_name },
        job.job_mode_name && { icon: <LaptopOutlined />, label: job.job_mode_name },
        job.shift_name && { icon: <FieldTimeOutlined />, label: job.shift_name },
        job.education_preference_name && {
          icon: <ReadOutlined />,
          label: job.education_preference_name,
        },
        postedAgo && { icon: <ClockCircleOutlined />, label: postedAgo },
      ].filter((item): item is { icon: ReactElement; label: string } => Boolean(item))
    : [];

  // skill_type is only ever "required"/"optional" — no "preferred" value.
  const requiredSkills = job?.skills.filter((s) => s.skill_type.toLowerCase() === 'required') ?? [];
  const optionalSkills = job?.skills.filter((s) => s.skill_type.toLowerCase() !== 'required') ?? [];

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
        {brandingLoading ? null : logoUrl ? (
          <img src={logoUrl} alt={companyName ?? 'Company logo'} className="h-9 object-contain" />
        ) : (
          <span className="text-white font-bold text-xl tracking-widest">CFP</span>
        )}
      </header>

      <main className="w-full max-w-3xl mx-auto px-4 md:px-8 py-6">
        {isError ? (
          <Result
            status="404"
            title="Job not found"
            subTitle="This job posting may have been closed or the link is incorrect."
            extra={
              <Button type="primary" onClick={() => navigate(`/careers/${organizationId}`)}>
                Back
              </Button>
            }
          />
        ) : isLoading || !job ? (
          <div className="flex justify-center items-center min-h-[70vh]">
            <Spin size="large" />
          </div>
        ) : (
          <>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {job.job_title ?? job.job_profile_code}
            </h1>
            <p className="text-sm text-gray-400 mb-4">{job.job_profile_code}</p>

            <div className="flex flex-col gap-4 mb-5">
              {(overviewItems.length > 0 || salary) && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5">
                  {salary && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3.5 py-1.5 text-sm font-bold text-primary-700 mb-4">
                      <DollarOutlined />
                      <span>{salary}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    {overviewItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 text-sm">
                          {item.icon}
                        </span>
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {job.skills.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5">
                  <h2 className="text-base font-bold text-gray-900 mb-3">Skills</h2>
                  {requiredSkills.length > 0 && (
                    <div className="mb-3 last:mb-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                        Required
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {requiredSkills.map((skill) => (
                          <span
                            key={skill.skill_label}
                            className="px-3 py-1.5 rounded-lg bg-primary-50 text-sm font-medium text-primary-700"
                          >
                            {skill.skill_label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {optionalSkills.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                        Optional
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {optionalSkills.map((skill) => (
                          <span
                            key={skill.skill_label}
                            className="px-3 py-1.5 rounded-lg bg-accent-50 text-sm font-medium text-accent-600"
                          >
                            {skill.skill_label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
              Apply For This Job
            </button>
          </div>
        </div>
      )}

      <PublicFooter />
    </div>
  );
};

export default CareersJobDetailPage;
