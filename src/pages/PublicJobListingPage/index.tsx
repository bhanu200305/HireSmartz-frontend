import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Select, Spin, Popover, Checkbox, Input, Modal } from 'antd';
import {
  EnvironmentOutlined,
  SearchOutlined,
  FilterOutlined,
  CalendarOutlined,
  ExportOutlined,
  DownOutlined,
} from '@ant-design/icons';
import {
  useGetPublicJobsQuery,
  useGetPublicLocationsQuery,
} from '../../api/candidate-service/PublicQr/index';
import type { PublicJob, PublicLocationItem } from '../../types/PublicQr';
import { ApplyLaterModal } from '../../components/shared/ApplyLaterModal';
import { usePublicBranding } from '../../hooks/usePublicBranding';
import { PublicFooter } from '../../components/shared/PublicFooter';

const { Option } = Select;

const PAGE_SIZE = 20;

const formatSalary = (min: number, max: number): string => {
  const fmt = (n: number): string => (n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`);
  return `${fmt(min)} - ${fmt(max)}`;
};

const formatExperience = (min: number, max: number | null): string => {
  if (max !== null && max !== undefined) return `${min}-${max} Years of Experience`;
  return `${min}+ Years of Experience`;
};

interface JobCardProps {
  job: PublicJob;
  qrCode: string;
  companyId: number | null;
}

const JobCard = ({ job, qrCode, companyId }: JobCardProps) => {
  const navigate = useNavigate();

  const goToDetail = () => {
    navigate(`/public/q/${qrCode}/jobs/${job.jobId}${companyId ? `?companyId=${companyId}` : ''}`, {
      state: { job, companyId },
    });
  };

  const goToApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(
      `/public/q/${qrCode}/jobs/${job.jobId}/apply${companyId ? `?companyId=${companyId}` : ''}`,
      { state: { job, companyId } }
    );
  };
  const locationLabel = job.isRemote
    ? 'Remote'
    : job.location
      ? [
          job.location.addressLine1,
          job.location.addressLine2,
          job.location.city,
          job.location.state,
        ]
          .filter(Boolean)
          .join(', ')
      : 'Location not specified';

  const truncatedDescription = (() => {
    const desc = job.aiJobDescription ?? '';
    const lines = desc.split('\n').filter((l: string) => l.trim().startsWith('-'));
    if (lines.length > 0) return lines[0].replace(/^-\s*/, '').slice(0, 120) + '...';
    return desc.slice(0, 120) + '...';
  })();

  return (
    <div
      onClick={goToDetail}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between hover:shadow-md transition-shadow relative cursor-pointer"
    >
      {/* Top-right icon */}
      <ExportOutlined className="absolute top-4 right-4 text-gray-400 text-base" />

      <div className="flex-1 min-w-0 pr-6">
        <p className="text-left text-base md:text-lg font-semibold text-gray-900 leading-tight">
          {job.jobTitle}
        </p>

        <div className="flex flex-col gap-1 mt-1.5">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <EnvironmentOutlined className="text-xs shrink-0" />
            <span className="truncate">{locationLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <CalendarOutlined className="text-xs shrink-0" />
            <span>{formatExperience(job.minimumExperience, job.maximumExperience)}</span>
          </div>
        </div>

        <p className="text-sm text-gray-600 mt-2 leading-relaxed line-clamp-2 hidden md:block">
          {truncatedDescription}
        </p>

        <div className="flex flex-wrap gap-2 mt-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full border border-gray-200 text-xs font-medium text-gray-600">
            {job.isRemote ? 'Remote' : job.jobType}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full border border-gray-200 text-xs font-medium text-gray-600">
            {formatSalary(job.minimumSalary, job.maximumSalary)}
          </span>
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

export const PublicJobListingPage = () => {
  const { qrCode } = useParams<{ qrCode: string }>();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  const [searchParams] = useSearchParams();
  const { state } = useLocation();
  const companyIdFromParams = searchParams.get('companyId')
    ? Number(searchParams.get('companyId'))
    : null;
  const companyIdFromState = (state as { companyId?: number } | null)?.companyId ?? null;
  const companyId = companyIdFromParams ?? companyIdFromState;

  const { bannerUrl, headerStyle } = usePublicBranding(companyId);

  const [page, setPage] = useState(0);
  const [selectedLocationLabels, setSelectedLocationLabels] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterFields, setFilterFields] = useState<string[]>(['jobtitle', 'jobtype']);
  const [filterOpen, setFilterOpen] = useState(false);
  const [applyLaterOpen, setApplyLaterOpen] = useState(false);
  const [qrErrorDismissed, setQrErrorDismissed] = useState(false);
  const [applyLaterJobId, setApplyLaterJobId] = useState<number | undefined>(undefined);

  // Tracks whether the location Select dropdown is currently open.
  // Cards are made non-interactive via pointer-events-none while the dropdown is open.
  const [isLocationOpen, setIsLocationOpen] = useState(false);

  // Active search params — only updated when Search is clicked
  const [activeSearch, setActiveSearch] = useState({
    search: '',
    searchFields: ['jobtitle', 'jobtype'],
    locationIds: [] as number[],
    remote: false,
  });

  const openApplyLater = (jobId?: number) => {
    setApplyLaterJobId(jobId);
    setApplyLaterOpen(true);
  };

  const {
    data: jobsData,
    isLoading: isJobsLoading,
    error: jobsError,
  } = useGetPublicJobsQuery(
    {
      qrCode: qrCode ?? '',
      page,
      size: PAGE_SIZE,
      search: activeSearch.search || undefined,
      searchFields: activeSearch.search ? activeSearch.searchFields : undefined,
      locationIds: activeSearch.locationIds.length ? activeSearch.locationIds : undefined,
      remote: activeSearch.remote || undefined,
    },
    { skip: !qrCode }
  );

  const qrErrorMessage =
    (jobsError as { data?: { message?: string; code?: string } } | undefined)?.data?.message ??
    null;

  const { data: locations, isLoading: isLocationsLoading } = useGetPublicLocationsQuery(
    qrCode ?? '',
    { skip: !qrCode }
  );

  // Build a map from "city, state" label → array of locationIds
  const locationGroupMap = useMemo(() => {
    const map = new Map<string, number[]>();
    locations?.forEach((loc: PublicLocationItem) => {
      const label = [loc.city, loc.state].filter(Boolean).join(', ') || loc.locationName;
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(loc.locationId);
    });
    return map;
  }, [locations]);

  // Unique grouped options for the dropdown
  const groupedLocationOptions = useMemo(() => {
    return Array.from(locationGroupMap.entries()).map(([label, ids]) => ({ label, ids }));
  }, [locationGroupMap]);

  const handleSearch = () => {
    const remoteSelected = selectedLocationLabels.includes('__remote__');
    const locationIds = selectedLocationLabels
      .filter((lbl) => lbl !== '__remote__')
      .flatMap((lbl) => locationGroupMap.get(lbl) ?? []);
    setActiveSearch({
      search: searchText.trim(),
      searchFields: filterFields,
      locationIds,
      remote: remoteSelected,
    });
    setPage(0);
  };

  const filteredJobs = jobsData?.content ?? [];

  return (
    <div className="public-page min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header
        className="text-white px-4 py-3 flex items-center justify-center relative"
        style={headerStyle}
      >
        {bannerUrl ? (
          <img src={bannerUrl} alt="Company Logo" className="h-16 object-contain max-w-90" />
        ) : (
          <span className="text-white font-bold text-xl tracking-widest">CFP</span>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 py-6">
        {/* Page Title Row */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Job Openings</h1>
          <button
            onClick={() => openApplyLater()}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-2 rounded-full transition-colors whitespace-nowrap"
          >
            APPLY LATER
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 md:p-4 mb-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
            {/* Location Dropdown */}
            <div className="flex-1">
              <Select
                mode="multiple"
                placeholder={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1 }}>
                    <EnvironmentOutlined />
                    Location
                  </span>
                }
                value={selectedLocationLabels}
                onChange={(vals: string[]) => {
                  const hadRemote = selectedLocationLabels.includes('__remote__');
                  const hasRemote = vals.includes('__remote__');
                  if (!hadRemote && hasRemote) {
                    setSelectedLocationLabels(['__remote__']);
                  } else if (hadRemote && vals.length > 1) {
                    setSelectedLocationLabels(vals.filter((v) => v !== '__remote__'));
                  } else {
                    setSelectedLocationLabels(vals);
                  }
                }}
                loading={isLocationsLoading}
                className="w-full"
                maxTagCount="responsive"
                onDropdownVisibleChange={(open) => {
                  setIsLocationOpen(open);
                }}
                suffixIcon={<DownOutlined style={{ fontSize: 10, color: '#9ca3af' }} />}
                style={{ height: 40 }}
              >
                <Option value="__remote__">Remote</Option>
                {groupedLocationOptions.map(({ label }) => (
                  <Option key={label} value={label}>
                    {label}
                  </Option>
                ))}
              </Select>
            </div>

            {/* Search Text Input + Filter Button (side by side on all sizes) */}
            <div className="flex gap-2 flex-1">
              <div className="flex-1 relative">
                <Input
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    if (e.target.value === '') {
                      setActiveSearch((prev) => ({
                        ...prev,
                        search: '',
                        searchFields: filterFields,
                      }));
                      setPage(0);
                    }
                  }}
                  onPressEnter={handleSearch}
                  placeholder="Search"
                  prefix={<SearchOutlined className="text-gray-400" />}
                  style={{ height: 40, borderRadius: 8 }}
                  allowClear
                />
              </div>

              {/* Filter Button with Popover */}
              <Popover
                open={filterOpen}
                onOpenChange={setFilterOpen}
                trigger="click"
                placement="bottomRight"
                content={
                  <div className="flex flex-col gap-2 min-w-40">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Categories
                    </p>
                    <Checkbox
                      checked={filterFields.includes('jobtitle')}
                      onChange={(e) =>
                        setFilterFields((prev) =>
                          e.target.checked
                            ? [...prev, 'jobtitle']
                            : prev.filter((f) => f !== 'jobtitle')
                        )
                      }
                    >
                      Job Title
                    </Checkbox>
                    <Checkbox
                      checked={filterFields.includes('jobtype')}
                      onChange={(e) =>
                        setFilterFields((prev) =>
                          e.target.checked
                            ? [...prev, 'jobtype']
                            : prev.filter((f) => f !== 'jobtype')
                        )
                      }
                    >
                      Job Type
                    </Checkbox>
                  </div>
                }
              >
                <button
                  className="shrink-0 w-10 h-10 border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                  style={{ minHeight: 40 }}
                >
                  <FilterOutlined />
                </button>
              </Popover>
            </div>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              className="w-full md:w-auto bg-black text-white font-bold tracking-widest text-sm px-8 rounded-full hover:bg-gray-800 active:scale-95 transition-all"
              style={{ height: 40 }}
            >
              SEARCH JOBS
            </button>
          </div>
        </div>

        {/* Job List */}
        {isJobsLoading ? (
          <div className="flex justify-center items-center py-20">
            <Spin size="large" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <SearchOutlined className="text-4xl mb-3" />
            <p className="text-lg font-medium">No jobs found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div
            className="flex flex-col gap-4"
            style={{ pointerEvents: isLocationOpen ? 'none' : 'auto' }}
          >
            {filteredJobs.map((job: PublicJob) => (
              <JobCard key={job.jobId} job={job} qrCode={qrCode ?? ''} companyId={companyId} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {jobsData && jobsData.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 rounded-full border border-gray-200 text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page + 1} of {jobsData.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(jobsData.totalPages - 1, p + 1))}
              disabled={page >= jobsData.totalPages - 1}
              className="px-4 py-2 rounded-full border border-gray-200 text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </main>

      <PublicFooter />
      <Modal
        open={!!qrErrorMessage && !qrErrorDismissed}
        footer={null}
        closable={false}
        centered
        width={360}
        styles={{ content: { borderRadius: 20, padding: '32px 28px' } }}
      >
        <h2 className="text-xl font-bold text-gray-900 mb-3">No longer available to scan</h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">{qrErrorMessage}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setQrErrorDismissed(true)}
            className="w-full bg-black text-white font-bold tracking-widest text-sm py-3.5 rounded-full hover:bg-gray-800 active:scale-95 transition-all"
          >
            OK
          </button>
        </div>
      </Modal>
      <ApplyLaterModal
        open={applyLaterOpen}
        qrCode={qrCode ?? ''}
        jobId={applyLaterJobId}
        onClose={() => setApplyLaterOpen(false)}
      />
    </div>
  );
};

export default PublicJobListingPage;
