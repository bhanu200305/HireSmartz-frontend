import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Select, Input } from 'antd';
import {
  EnvironmentOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useListPublicJobsQuery } from '../../api/job-service/PublicCareers/index';
import type { PublicJobListing } from '../../api/job-service/PublicCareers/index';
import { PublicFooter } from '../../components/shared/PublicFooter';
import { usePublicCareersBranding } from '../../hooks/usePublicCareersBranding';
import {
  formatSalary,
  formatExperience,
  formatPostedAgo,
} from '../../shared/utils/publicJobDisplay';

const { Option } = Select;

// job-service's public board route only takes `page`/`page_size` — no
// search or facet params (see api/job-service/PublicCareers/index.ts's own
// docstring: "this client doesn't invent params the API can't answer").
// Location/experience/salary/date-posted/search filtering below is
// therefore done entirely client-side, over one big fetch capped at the
// backend's own MAX_PAGE_SIZE (public_router.py) rather than the 20-a-page
// default — large enough to cover a typical org's whole open-roles list in
// one call, so filtering and the "page X of Y" control below stay honest
// (both work off the exact same loaded array, never disagreeing with a
// server-side count). A card list of 20 is still what's shown at once.
const FETCH_SIZE = 200;
const CARDS_PER_PAGE = 20;

const EXPERIENCE_BUCKETS: { value: string; label: string; min?: number; max?: number }[] = [
  { value: 'any', label: 'Any Experience' },
  { value: '0-2', label: '0-2 Years', min: 0, max: 2 },
  { value: '3-5', label: '3-5 Years', min: 3, max: 5 },
  { value: '5-8', label: '5-8 Years', min: 5, max: 8 },
  { value: '8+', label: '8+ Years', min: 8 },
];

const SALARY_BUCKETS: { value: string; label: string; min?: number; max?: number }[] = [
  { value: 'any', label: 'Any Salary' },
  { value: '0-50', label: 'Up to $50K', max: 50_000 },
  { value: '50-90', label: '$50K - $90K', min: 50_000, max: 90_000 },
  { value: '90-130', label: '$90K - $130K', min: 90_000, max: 130_000 },
  { value: '130+', label: '$130K+', min: 130_000 },
];

/** `days` is how far back from now the bucket reaches; `undefined` on
 * "Any Time" means no cutoff at all. Mirrors the experience/salary
 * buckets' own open-ended-range shape rather than inventing a new one. */
const DATE_POSTED_BUCKETS: { value: string; label: string; days?: number }[] = [
  { value: 'any', label: 'Time of Posting' },
  { value: '1', label: 'Last 24 Hours', days: 1 },
  { value: '3', label: 'Last 3 Days', days: 3 },
  { value: '7', label: 'Last 7 Days', days: 7 },
  { value: '14', label: 'Last 14 Days', days: 14 },
  { value: '30', label: 'Last 30 Days', days: 30 },
];

/** Does a job's (possibly open-ended) range overlap a filter bucket's
 * (possibly open-ended) range? A job with no upper experience bound, for
 * instance, still qualifies for the "8+ Years" bucket. Both sides are real
 * `number`s by the time they reach here — `PublicCareers/index.ts`'s own
 * `transformResponse` normalizes job-service's Decimal-as-JSON-string
 * experience fields before this component ever sees them. */
const rangesOverlap = (
  jobMin: number | null,
  jobMax: number | null,
  bucketMin: number | undefined,
  bucketMax: number | undefined
): boolean => {
  if (bucketMin === undefined && bucketMax === undefined) return true;
  const loJob = jobMin ?? -Infinity;
  const hiJob = jobMax ?? Infinity;
  const loBucket = bucketMin ?? -Infinity;
  const hiBucket = bucketMax ?? Infinity;
  return loJob <= hiBucket && hiJob >= loBucket;
};

/** Same permissive philosophy as `rangesOverlap`: a job with no
 * `job_open_date` at all matches every "posted within N days" bucket
 * rather than being hidden by one — we genuinely don't know, so we don't
 * assume it's stale. */
const postedWithinDays = (jobOpenDate: string | null, days: number | undefined): boolean => {
  if (days === undefined) return true;
  if (!jobOpenDate) return true;
  const postedMs = new Date(jobOpenDate).getTime();
  if (Number.isNaN(postedMs)) return true;
  return postedMs >= Date.now() - days * 86_400_000;
};

// Purely cosmetic — gives each card a stable, varied accent instead of every
// role looking identical. Hashing the job id (not the title) means a given
// job keeps the same color across re-renders/re-fetches.
const AVATAR_VARIANTS = [
  { bg: 'bg-primary-50', text: 'text-primary-700', ring: 'ring-primary-100' },
  { bg: 'bg-accent-50', text: 'text-accent-600', ring: 'ring-accent-100' },
  { bg: 'bg-primary-100', text: 'text-primary-800', ring: 'ring-primary-200' },
  { bg: 'bg-accent-100', text: 'text-accent-600', ring: 'ring-accent-300' },
];

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const avatarVariant = (seed: string) => AVATAR_VARIANTS[hashString(seed) % AVATAR_VARIANTS.length];

const initialsOf = (label: string): string => {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

const NEW_BADGE_WINDOW_DAYS = 3;
const isRecentlyPosted = (jobOpenDate: string | null): boolean => {
  if (!jobOpenDate) return false;
  const postedMs = new Date(jobOpenDate).getTime();
  if (Number.isNaN(postedMs)) return false;
  return postedMs >= Date.now() - NEW_BADGE_WINDOW_DAYS * 86_400_000;
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
    // Same apply-method choice (resume vs. talk-now) that the job detail
    // page's "APPLY FOR THIS JOB" button routes through — see
    // CareersApplyChoicePage. Was previously skipping straight to `/apply`.
    navigate(`/careers/${organizationId}/jobs/${job.id}/apply-choice`);
  };

  const experience = formatExperience(job.min_experience_req, job.max_experience_req);
  const salary = formatSalary(job.salary_min, job.salary_max);
  const postedAgo = formatPostedAgo(job.job_open_date);
  const label = job.job_title ?? job.job_profile_code;
  const variant = avatarVariant(job.id);

  return (
    <div
      onClick={goToDetail}
      className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 flex flex-col gap-4 hover:shadow-lg hover:border-primary-200 hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden"
    >
      {/* Accent bar — sweeps in on hover instead of sitting there always, so
          the resting list stays calm and the interaction feels alive. */}
      <span className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-primary-500 to-accent-400 transition-transform duration-300 group-hover:scale-x-100" />

      <div className="flex items-start gap-3.5">
        <div
          className={`flex h-11 w-11 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ring-4 ${variant.bg} ${variant.text} ${variant.ring}`}
        >
          {initialsOf(label)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-left text-base md:text-lg font-bold text-gray-900 leading-tight transition-colors group-hover:text-primary-600">
              {label}
            </p>
            {isRecentlyPosted(job.job_open_date) && (
              <span className="shrink-0 rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                New
              </span>
            )}
          </div>
          <p className="text-left text-xs text-gray-400 mt-0.5">{job.job_profile_code}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-[3.5rem] md:pl-[3.75rem]">
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
        {postedAgo && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <ClockCircleOutlined className="text-xs shrink-0" />
            <span>{postedAgo}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pl-[3.5rem] md:pl-[3.75rem]">
        <div className="flex flex-wrap gap-2">
          {job.vacancies !== null && (
            <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              {job.vacancies} {job.vacancies === 1 ? 'opening' : 'openings'}
            </span>
          )}
          {salary && (
            <span className="inline-flex items-center rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-600">
              {salary}
            </span>
          )}
        </div>

        <button
          onClick={goToApply}
          className="whitespace-nowrap rounded-full bg-gradient-to-r from-primary-600 to-accent-500 px-6 py-2.5 text-sm font-bold tracking-wide text-white shadow-sm transition-all hover:shadow-md hover:brightness-105 active:scale-95"
        >
          Apply Now
        </button>
      </div>
    </div>
  );
};

const JobCardSkeleton = () => (
  <div className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 md:p-6">
    <div className="flex items-center gap-3.5">
      <div className="h-11 w-11 md:h-12 md:w-12 shrink-0 rounded-2xl bg-gray-200" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 rounded bg-gray-200" />
        <div className="h-3 w-1/3 rounded bg-gray-100" />
      </div>
    </div>
    <div className="mt-4 space-y-2 pl-[3.5rem] md:pl-[3.75rem]">
      <div className="h-3 w-1/2 rounded bg-gray-100" />
      <div className="h-3 w-2/5 rounded bg-gray-100" />
    </div>
    <div className="mt-4 flex gap-2 pl-[3.5rem] md:pl-[3.75rem]">
      <div className="h-6 w-20 rounded-full bg-gray-100" />
      <div className="h-6 w-24 rounded-full bg-gray-100" />
    </div>
  </div>
);

export const CareersListingPage = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { companyName, logoUrl } = usePublicCareersBranding(organizationId);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [experienceBucket, setExperienceBucket] = useState('any');
  const [salaryBucket, setSalaryBucket] = useState('any');
  const [datePostedBucket, setDatePostedBucket] = useState('any');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);

  const {
    data: jobsData,
    isLoading,
    isFetching,
  } = useListPublicJobsQuery(
    { organizationId: organizationId ?? '', page: 1, pageSize: FETCH_SIZE },
    { skip: !organizationId }
  );

  const allJobs = jobsData?.items ?? [];

  const locationOptions = useMemo(
    () =>
      Array.from(
        new Set(
          allJobs.map((job) => job.location_city).filter((city): city is string => Boolean(city))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [allJobs]
  );

  const filteredJobs = useMemo(() => {
    const experience = EXPERIENCE_BUCKETS.find((bucket) => bucket.value === experienceBucket);
    const salary = SALARY_BUCKETS.find((bucket) => bucket.value === salaryBucket);
    const datePosted = DATE_POSTED_BUCKETS.find((bucket) => bucket.value === datePostedBucket);
    const query = searchText.trim().toLowerCase();

    return allJobs.filter((job) => {
      if (
        selectedLocations.length &&
        (!job.location_city || !selectedLocations.includes(job.location_city))
      ) {
        return false;
      }
      if (
        experience &&
        !rangesOverlap(
          job.min_experience_req,
          job.max_experience_req,
          experience.min,
          experience.max
        )
      ) {
        return false;
      }
      if (salary && !rangesOverlap(job.salary_min, job.salary_max, salary.min, salary.max)) {
        return false;
      }
      if (datePosted && !postedWithinDays(job.job_open_date, datePosted.days)) {
        return false;
      }
      if (query) {
        const haystack = `${job.job_title ?? ''} ${job.job_profile_code}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [allJobs, selectedLocations, experienceBucket, salaryBucket, datePostedBucket, searchText]);

  // Every filter change starts back at page 1 of the (now different)
  // filtered result set.
  useEffect(() => {
    setPage(1);
  }, [selectedLocations, experienceBucket, salaryBucket, datePostedBucket, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / CARDS_PER_PAGE));
  const pagedJobs = filteredJobs.slice((page - 1) * CARDS_PER_PAGE, page * CARDS_PER_PAGE);

  const clearAllFilters = () => {
    setSelectedLocations([]);
    setExperienceBucket('any');
    setSalaryBucket('any');
    setDatePostedBucket('any');
    setSearchText('');
  };

  const hasActiveFilters =
    selectedLocations.length > 0 ||
    experienceBucket !== 'any' ||
    salaryBucket !== 'any' ||
    datePostedBucket !== 'any' ||
    searchText.trim().length > 0;

  const activeFilterChips = [
    ...selectedLocations.map((city) => ({
      key: `location:${city}`,
      label: city,
      onRemove: () => setSelectedLocations((prev) => prev.filter((c) => c !== city)),
    })),
    ...(experienceBucket !== 'any'
      ? [
          {
            key: 'experience',
            label: EXPERIENCE_BUCKETS.find((b) => b.value === experienceBucket)?.label ?? '',
            onRemove: () => setExperienceBucket('any'),
          },
        ]
      : []),
    ...(salaryBucket !== 'any'
      ? [
          {
            key: 'salary',
            label: SALARY_BUCKETS.find((b) => b.value === salaryBucket)?.label ?? '',
            onRemove: () => setSalaryBucket('any'),
          },
        ]
      : []),
    ...(datePostedBucket !== 'any'
      ? [
          {
            key: 'datePosted',
            label: DATE_POSTED_BUCKETS.find((b) => b.value === datePostedBucket)?.label ?? '',
            onRemove: () => setDatePostedBucket('any'),
          },
        ]
      : []),
    ...(searchText.trim()
      ? [{ key: 'search', label: `"${searchText.trim()}"`, onRemove: () => setSearchText('') }]
      : []),
  ];

  return (
    <div className="public-page min-h-screen bg-gray-50 flex flex-col">
      {/* Header — company logo when the tenant has one set, via job-service's
          public branding endpoint (proxies organization-service's existing
          internal branding lookup). Falls back to the plain "CFP" mark. */}
      <header className="bg-black text-white px-4 py-3 flex items-center justify-center relative shrink-0">
        {logoUrl ? (
          <img src={logoUrl} alt={companyName ?? 'Company logo'} className="h-10 object-contain" />
        ) : (
          <span className="text-white font-bold text-xl tracking-widest">CFP</span>
        )}
      </header>

      {/* Hero — title + role count + the search box, the most-used control,
          gets top billing on its own row rather than buried in the filter
          grid below. */}
      <div className="bg-gradient-to-b from-white to-gray-50 border-b border-gray-100">
        <div className="w-full max-w-5xl mx-auto px-4 md:px-8 pt-10 pb-7">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900">
            {companyName ? `Careers at ${companyName}` : 'Open Positions'}
          </h1>
          <p className="mt-1.5 text-sm md:text-base text-gray-500">
            {allJobs.length > 0
              ? `${jobsData?.total ?? allJobs.length} open role${(jobsData?.total ?? allJobs.length) === 1 ? '' : 's'} — find where you fit.`
              : 'Explore our open roles.'}
          </p>

          <div className="mt-5 max-w-xl">
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by job title"
              prefix={<SearchOutlined className="text-gray-400" />}
              size="large"
              style={{ borderRadius: 999 }}
              allowClear
            />
          </div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 py-6">
        {/* Filters — only shown once there's something to filter. Every
            control applies the moment it changes: this is all client-side
            over one already-loaded batch, so there's no network cost to
            filtering instantly. */}
        {allJobs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 md:p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Select
                mode="multiple"
                placeholder={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1 }}>
                    <EnvironmentOutlined />
                    Location
                  </span>
                }
                value={selectedLocations}
                onChange={setSelectedLocations}
                className="w-full"
                maxTagCount="responsive"
                suffixIcon={<DownOutlined style={{ fontSize: 10, color: '#9ca3af' }} />}
                style={{ height: 40 }}
              >
                {locationOptions.map((city) => (
                  <Option key={city} value={city}>
                    {city}
                  </Option>
                ))}
              </Select>

              <Select
                value={experienceBucket}
                onChange={setExperienceBucket}
                className="w-full"
                suffixIcon={<DownOutlined style={{ fontSize: 10, color: '#9ca3af' }} />}
                style={{ height: 40 }}
              >
                {EXPERIENCE_BUCKETS.map((bucket) => (
                  <Option key={bucket.value} value={bucket.value}>
                    {bucket.label}
                  </Option>
                ))}
              </Select>

              <Select
                value={salaryBucket}
                onChange={setSalaryBucket}
                className="w-full"
                suffixIcon={<DownOutlined style={{ fontSize: 10, color: '#9ca3af' }} />}
                style={{ height: 40 }}
              >
                {SALARY_BUCKETS.map((bucket) => (
                  <Option key={bucket.value} value={bucket.value}>
                    {bucket.label}
                  </Option>
                ))}
              </Select>

              <Select
                value={datePostedBucket}
                onChange={setDatePostedBucket}
                className="w-full"
                suffixIcon={<DownOutlined style={{ fontSize: 10, color: '#9ca3af' }} />}
                style={{ height: 40 }}
              >
                {DATE_POSTED_BUCKETS.map((bucket) => (
                  <Option key={bucket.value} value={bucket.value}>
                    {bucket.label}
                  </Option>
                ))}
              </Select>
            </div>

            {activeFilterChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                {activeFilterChips.map((chip) => (
                  <span
                    key={chip.key}
                    className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-700"
                  >
                    {chip.label}
                    <button
                      type="button"
                      onClick={chip.onRemove}
                      aria-label={`Remove filter ${chip.label}`}
                      className="w-4 h-4 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800 underline ml-1"
                >
                  Clear all
                </button>
              </div>
            )}

            {jobsData && jobsData.total > allJobs.length && (
              <p className="text-xs text-gray-400 mt-3">
                Showing the first {allJobs.length} of {jobsData.total} roles. Narrow your search to
                find a specific one.
              </p>
            )}
          </div>
        )}

        {/* A visible result count — proof a filter actually changed
            something, not just a silently-shorter list a user might not
            notice. */}
        {!isLoading && allJobs.length > 0 && (
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
            <ClockCircleOutlined
              className={`text-xs ${isFetching ? 'animate-spin' : 'invisible'}`}
            />
            <span>
              {hasActiveFilters
                ? `${filteredJobs.length} of ${allJobs.length} role${allJobs.length === 1 ? '' : 's'} match your filters`
                : `${allJobs.length} open role${allJobs.length === 1 ? '' : 's'}`}
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <SearchOutlined className="text-4xl mb-3" />
            <p className="text-lg font-medium text-gray-600">No jobs found</p>
            <p className="text-sm mt-1">
              {allJobs.length === 0 ? 'Please check back later' : 'Try adjusting your filters'}
            </p>
            {allJobs.length > 0 && hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-4 text-sm font-semibold text-primary hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4" style={{ opacity: isFetching ? 0.6 : 1 }}>
            {pagedJobs.map((job) => (
              <JobCard key={job.id} job={job} organizationId={organizationId ?? ''} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
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
