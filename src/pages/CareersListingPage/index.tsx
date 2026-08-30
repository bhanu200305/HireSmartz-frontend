import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import { EnvironmentOutlined, CalendarOutlined, SearchOutlined } from '@ant-design/icons';
import { useListPublicJobsQuery } from '../../api/job-service/PublicCareers/index';
import type { PublicJobListing } from '../../api/job-service/PublicCareers/index';
import { PublicFooter } from '../../components/shared/PublicFooter';
import { usePublicCareersBranding } from '../../hooks/usePublicCareersBranding';

const PAGE_SIZE = 20;

const formatSalary = (min: number | null, max: number | null): string | null => {
  if (min === null && max === null) return null;
  const fmt = (n: number): string => (n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`);
  if (min !== null && max !== null) return `${fmt(min)} - ${fmt(max)}`;
  return fmt((min ?? max) as number);
};

const formatExperience = (min: number | null, max: number | null): string | null => {
  if (min === null && max === null) return null;
  if (min !== null && max !== null) return `${min}-${max} Years of Experience`;
  return `${min ?? max}+ Years of Experience`;
};

interface JobCardProps {
  job: PublicJobListing;
  organizationId: string;
}

const JobCard = ({ job, organizationId }: JobCardProps) => {
  const navigate = useNavigate();

  const goToDetail = () => {
    navigate(`/careers/${organizationId}/jobs/${job.id}`);
  };

  const goToApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/careers/${organizationId}/jobs/${job.id}/apply`);
  };

  const experience = formatExperience(job.min_experience_req, job.max_experience_req);
  const salary = formatSalary(job.salary_min, job.salary_max);

  return (
    <div
      onClick={goToDetail}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <p className="text-left text-base md:text-lg font-semibold text-gray-900 leading-tight">
          {job.job_title ?? job.job_profile_code}
        </p>

        <div className="flex flex-col gap-1 mt-1.5">
          {job.location_city && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <EnvironmentOutlined className="text-xs shrink-0" />
              <span className="truncate">{job.location_city}</span>
            </div>
          )}
          {experience && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <CalendarOutlined className="text-xs shrink-0" />
              <span>{experience}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {job.vacancies !== null && (
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-gray-200 text-xs font-medium text-gray-600">
              {job.vacancies} {job.vacancies === 1 ? 'opening' : 'openings'}
            </span>
          )}
          {salary && (
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-gray-200 text-xs font-medium text-gray-600">
              {salary}
            </span>
          )}
        </div>
      </div>

      <div className="flex md:flex-col items-center justify-end md:justify-center md:ml-6 md:shrink-0">
        <button
          onClick={goToApply}
          className="bg-black text-white text-sm font-bold tracking-wide px-6 py-2.5 rounded-full hover:bg-gray-800 active:scale-95 transition-all whitespace-nowrap"
        >
          APPLY
        </button>
      </div>
    </div>
  );
};

export const CareersListingPage = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { companyName, logoUrl } = usePublicCareersBranding(organizationId);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const [page, setPage] = useState(1);

  const {
    data: jobsData,
    isLoading,
    isFetching,
  } = useListPublicJobsQuery(
    { organizationId: organizationId ?? '', page, pageSize: PAGE_SIZE },
    { skip: !organizationId }
  );

  const jobs = jobsData?.items ?? [];
  const totalPages = jobsData ? Math.max(1, Math.ceil(jobsData.total / jobsData.page_size)) : 1;

  return (
    <div className="public-page min-h-screen bg-white flex flex-col">
      {/* Header — company logo when the tenant has one set, via job-service's
          public branding endpoint (proxies organization-service's existing
          internal branding lookup). Falls back to the plain "CFP" mark. */}
      <header className="bg-black text-white px-4 py-3 flex items-center justify-center relative">
        {logoUrl ? (
          <img src={logoUrl} alt={companyName ?? 'Company logo'} className="h-10 object-contain" />
        ) : (
          <span className="text-white font-bold text-xl tracking-widest">CFP</span>
        )}
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Job Openings</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Spin size="large" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <SearchOutlined className="text-4xl mb-3" />
            <p className="text-lg font-medium">No jobs found</p>
            <p className="text-sm">Please check back later</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4" style={{ opacity: isFetching ? 0.6 : 1 }}>
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} organizationId={organizationId ?? ''} />
            ))}
          </div>
        )}

        {jobsData && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-full border border-gray-200 text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-full border border-gray-200 text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
};

export default CareersListingPage;
