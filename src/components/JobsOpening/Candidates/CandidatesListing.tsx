import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useSelector, shallowEqual } from 'react-redux';
import { Col, Row, Tooltip, Checkbox } from 'antd';
import dayjs from 'dayjs';
import clsx from 'clsx';
import {
  LuCalendarPlus,
  LuMail,
  LuSquarePen,
  LuThumbsDown,
  LuThumbsUp,
  LuUsers,
} from 'react-icons/lu';
import { TbBriefcase2 } from 'react-icons/tb';
import { IoArrowRedoOutline } from 'react-icons/io5';
import { MdClose, MdOutlineRemoveRedEye } from 'react-icons/md';
import { CommonCard, Button, Badge, showToast } from '../../shared';
import MasterPagination from '../../shared/ui/MasterPagination';
import { Search } from '../../shared/ui/search';
import { Loader } from '../../shared/ui/loader';
import { COL } from '../../shared/ui/Columns';
import type { SortDirection } from '../../../types';
import { useGetJobOpeningByIdQuery } from '../../../api/job-service/JobOpening/GetJobOpeningById';
import { useListJobTypesQuery } from '../../../api/job-service/JobOpening/catalogs';
import { useGetJobOpeningNotesQuery } from '../../../api/job-service/JobOpening/JobOpeningNotes';
import { useListTenantDepartmentsQuery } from '../../../api/organization-service/Tenants/departments';
import { useListTenantJobTitlesQuery } from '../../../api/organization-service/Tenants/jobTitles';
import { useSessionTenantId } from '../../../hooks/useSessionTenantId';
import useEffectivePermissions from '../../../hooks/useEffectivePermissions';
import { hasFeatureAccess, isAssignedToJob } from '../../../shared/utils/auth/getAccess';
import { asJobId } from '../../../api/job-service/jobId';
import {
  useListCandidatesQuery,
  type CandidateView,
  type ListCandidatesArgs,
} from '../../../api/candidate-service/Candidates/CandidateLifecycle';
import { useListCandidateStatusesQuery } from '../../../api/candidate-service/Master/master';
import { getCandidateErrorMessage } from '../../../shared/utils/auth/candidateError.helpers';
import FilterMenu, { type CandidateListFilterValues } from './FilterMenu';
import AddCandidateModal from './Modal/AddCandidateModal';
import BulkEmailCandidatesModal from './Modal/BulkEmailCandidatesModal';
import BulkScheduleInterviewsModal from './Modal/BulkScheduleInterviewsModal';
import ChangeCandidateStatusModal, {
  type ChangeCandidateStatusMode,
} from './Modal/ChangeCandidateStatusModal';
import CandidateRecruiterNotesPanel from './Notes/CandidateRecruiterNotesPanel';
import JobListingNotesPanel from '../Notes/JobListingNotesPanel';
import {
  candidateDisplayName,
  candidateInitials,
  candidateStatusColor,
  candidateStatusTooltip,
} from './candidateDisplay';

// Candidate list is job-scoped; there is no cross-job list route.
// `resume_score` of null means "not scored yet", not an error.

type SelectedMap = Record<string, boolean>;

const PAGE_SIZE = 20;

const buildCurrentSortKey = (sortBy: string, sortOrder: 'asc' | 'desc') =>
  sortOrder === 'desc' ? `-${sortBy}` : sortBy;

const CandidatesListing = () => {
  const navigate = useNavigate();
  const { role, callerKind, userId } = useSelector((state: any) => state.LoginSlice, shallowEqual);
  const tenantId = useSessionTenantId();
  const effectivePermissions = useEffectivePermissions();
  const { id } = useParams<{ id: string }>();
  const parsedJobId = asJobId(id);

  const [search, setSearch] = useState('');
  const [statusCode, setStatusCode] = useState<string | undefined>();
  const [source, setSource] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<NonNullable<ListCandidatesArgs['sortBy']>>('applied_date');
  const [sortOrder, setSortOrder] = useState<NonNullable<ListCandidatesArgs['sortOrder']>>('desc');
  const [page, setPage] = useState(0);

  const [selected, setSelected] = useState<SelectedMap>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAddCandidateModalOpen, setIsAddCandidateModalOpen] = useState(false);
  const [isJobNotesPanelOpen, setIsJobNotesPanelOpen] = useState(false);
  const [notesCandidate, setNotesCandidate] = useState<{ id: string; name: string } | null>(null);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);
  const [isBulkScheduleOpen, setIsBulkScheduleOpen] = useState(false);
  const [statusModal, setStatusModal] = useState<{
    mode: ChangeCandidateStatusMode;
    candidates: CandidateView[];
  } | null>(null);

  const { data: jobOpeningData, isLoading: isJobOpeningLoading } = useGetJobOpeningByIdQuery(
    { jobOpeningId: parsedJobId },
    { skip: !parsedJobId }
  );

  const canViewJobNotes = hasFeatureAccess('job_opening', 'view', role, effectivePermissions);
  // Reading notes needs only view access; writing needs job assignment.
  const canWriteJobNotes = !jobOpeningData
    ? true
    : isAssignedToJob(
        {
          hiringManagerIds: jobOpeningData.details?.hiring_manager_ids,
          recruiterIds: jobOpeningData.details?.recruiter_ids,
          createdById: jobOpeningData.details?.created_by,
        },
        userId,
        role,
        effectivePermissions
      );
  const canManageCandidates =
    hasFeatureAccess('job_opening', 'edit', role, effectivePermissions) ||
    hasFeatureAccess('job_opening', 'create', role, effectivePermissions);

  const { data: jobNotes = [] } = useGetJobOpeningNotesQuery(parsedJobId, {
    skip: !parsedJobId || !canViewJobNotes,
  });

  const isMasterCaller = callerKind === 'platform';
  const { data: candidateListDepartments = [] } = useListTenantDepartmentsQuery(tenantId ?? '', {
    skip: !tenantId,
  });
  const { data: candidateListJobTypes = [] } = useListJobTypesQuery({ isMaster: isMasterCaller });
  const { data: candidateListJobTitles = [] } = useListTenantJobTitlesQuery(
    { tenantId: tenantId ?? '', isMaster: isMasterCaller },
    { skip: !tenantId }
  );

  const { data: { jobProfileCode, jobTitle = [], department = [], jobType = [] } = {} } =
    jobOpeningData || {};
  const departmentId = department[0]?.id;
  const jobTypeId = jobType[0]?.id;
  const jobTitleId = jobTitle[0]?.id;
  const jobTitleName = candidateListJobTitles.find(
    (t) => String(t.org_job_title_id) === String(jobTitleId)
  )?.name;
  const departmentName = candidateListDepartments.find(
    (d) => String(d.org_department_id) === String(departmentId)
  )?.name;
  const jobTypeName = candidateListJobTypes.find(
    (t) => String(t.id) === String(jobTypeId)
  )?.job_type_name;

  const isDraft = jobOpeningData?.data?.isDraft || false;
  const isClosed = jobOpeningData?.data?.isClosed || false;

  const { data, isLoading, error, refetch } = useListCandidatesQuery(
    {
      jobOpeningId: parsedJobId,
      search: search || undefined,
      statusCode,
      source,
      sortBy,
      sortOrder,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    { skip: !parsedJobId, refetchOnMountOrArgChange: true }
  );

  const { data: statuses = [] } = useListCandidateStatusesQuery();
  const statusLabelByCode = useMemo(
    () => new Map(statuses.map((s) => [s.code, s.label])),
    [statuses]
  );
  const candidates = data?.items ?? [];
  const selectedIds = Object.keys(selected).filter((cid) => selected[cid]);
  const selectedCount = selectedIds.length;
  const selectedCandidates = candidates.filter((c) => selected[c.id]);

  const toggleSelect = (candidateId: string) =>
    setSelected((prev) => ({ ...prev, [candidateId]: !prev[candidateId] }));

  const allSelected = candidates.length > 0 && candidates.every((c) => selected[c.id]);
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected({});
      return;
    }
    const next: SelectedMap = {};
    candidates.forEach((c) => {
      next[c.id] = true;
    });
    setSelected(next);
  };

  const clearSelection = () => setSelected({});

  const handleSort = (key: string, direction: SortDirection) => {
    if (!direction) {
      setSortBy('applied_date');
      setSortOrder('desc');
    } else {
      setSortBy(key as NonNullable<ListCandidatesArgs['sortBy']>);
      setSortOrder(direction);
    }
    setPage(0);
  };

  const handleFilterChange = (next: Partial<CandidateListFilterValues>) => {
    if ('statusCode' in next) setStatusCode(next.statusCode);
    if ('source' in next) setSource(next.source);
    setPage(0);
  };

  const handleSearch = (query: string) => {
    setSearch(query);
    setPage(0);
  };

  const openStatusModal = (mode: ChangeCandidateStatusMode, targets: CandidateView[]) => {
    if (targets.length === 0) {
      showToast({ message: 'Please select at least one candidate', type: 'warning' });
      return;
    }
    setStatusModal({ mode, candidates: targets });
  };

  const handleStatusSuccess = () => {
    clearSelection();
    refetch();
  };

  const handleBackToList = () => navigate('/jobs');

  const buildDetailsPath = (candidateId: string) =>
    `/jobs/view/${parsedJobId}/candidates/${candidateId}/details`;

  const actionIconRowClass =
    'flex items-center gap-3 [&_svg]:!h-5 [&_svg]:!w-5 [&_svg]:!min-h-5 [&_svg]:!min-w-5 [&_svg]:!max-h-5 [&_svg]:!max-w-5';
  const notesPillIconClass =
    '[&_svg]:!h-5 [&_svg]:!w-5 [&_.anticon]:!inline-flex [&_.anticon]:!h-5 [&_.anticon]:!w-5 [&_.anticon]:!items-center [&_.anticon]:!justify-center';

  return (
    <div className="relative">
      {isJobOpeningLoading && <Loader />}
      <div className="flex justify-end items-center">
        <Button
          className="p-2 cursor-pointer flex items-center justify-center hover:underline text-primary"
          onClick={handleBackToList}
          title="Back"
        >
          <span className="text-sm">Back</span>
        </Button>
      </div>

      <div className="flex justify-end items-center mb-2">
        <div className="flex-1 rounded-2xl bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary">
                <TbBriefcase2 size={22} />
              </span>
              <div className="flex flex-col gap-1.5">
                <Link to={`/jobs/view/${parsedJobId}/details`}>
                  <span className="font-bold text-xl heading-font text-neutral-900 hover:text-primary hover:underline transition-colors capitalize">
                    {jobTitleName}
                  </span>
                </Link>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-neutral-100 px-3 py-1 font-semibold text-neutral-600">
                    {jobProfileCode || 'N/A'}
                  </span>
                  {departmentName && (
                    <span className="rounded-full bg-info-bg px-3 py-1 font-semibold text-info-text">
                      {departmentName}
                    </span>
                  )}
                  {jobTypeName && (
                    <span className="rounded-full bg-neutral-100 px-3 py-1 font-semibold text-neutral-600">
                      {jobTypeName}
                    </span>
                  )}
                  <span className="flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 font-semibold text-primary-700">
                    <LuUsers size={13} /> {data?.total ?? 0} candidate
                    {(data?.total ?? 0) === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="flex flex-col items-end gap-4 w-full lg:w-auto">
                <div className="flex flex-wrap items-center justify-end gap-4 w-full lg:w-auto">
                  <Search
                    appname="candidates listing"
                    placeholder="Search Candidate..."
                    onSearch={handleSearch}
                    allowClear
                    value={search}
                    className="bg-white border-gray-300 rounded-full py-2"
                  />

                  {canViewJobNotes && (
                    <Button
                      className={`rounded-full border border-primary-200 bg-primary-50 px-6 py-2 text-primary-700 font-semibold flex items-center gap-2 ${notesPillIconClass}`}
                      onClick={() => setIsJobNotesPanelOpen(true)}
                    >
                      <LuSquarePen size={18} />
                      <span>Notes</span>
                      <span className="min-w-8 h-8 px-2 rounded-xl bg-primary-600 text-white flex items-center justify-center text-sm leading-none">
                        {jobNotes.length}
                      </span>
                    </Button>
                  )}

                  {canManageCandidates && (
                    <Tooltip
                      title={
                        isDraft
                          ? 'Cannot add candidates to draft job openings'
                          : isClosed
                            ? 'Cannot add candidates to closed job openings'
                            : ''
                      }
                    >
                      <span>
                        <Button
                          className="text-white bg-primary rounded-full px-4 py-2 font-semibold"
                          onClick={() =>
                            !isDraft && !isClosed ? setIsAddCandidateModalOpen(true) : null
                          }
                          disabled={isDraft || isClosed}
                        >
                          ADD CANDIDATE
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                </div>
                <div className="w-full">
                  <FilterMenu
                    filters={{ statusCode, source }}
                    onFilterChange={handleFilterChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full">
        {/* overflow-x-auto + min-w keeps columns readable on narrow viewports.
            980px (up from 760px) — the old width was too tight for two-word
            sortable headers ("RESUME SCORE", "APPLIED DATE") plus their sort
            arrows to fit without spilling into the next column; horizontal
            scroll (overflow-x-auto) already covers anything narrower. */}
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="w-full pb-2">
              <Row
                gutter={[16, 16]}
                className="rounded-xl border border-neutral-100 bg-white p-4 text-xs font-bold uppercase tracking-wide text-neutral-500 shadow-sm heading-font"
              >
                <Col span={1}>
                  <Checkbox
                    className="custom-checkbox roboto-font"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={candidates.length === 0}
                  />
                </Col>
                <COL
                  sortable
                  sortKey="name"
                  currentSortKey={buildCurrentSortKey(sortBy, sortOrder)}
                  onSort={handleSort}
                  span={3}
                >
                  FIRST NAME
                </COL>
                <COL
                  sortable
                  sortKey="name"
                  currentSortKey={buildCurrentSortKey(sortBy, sortOrder)}
                  onSort={handleSort}
                  span={3}
                >
                  LAST NAME
                </COL>
                <COL
                  sortable
                  sortKey="resume_score"
                  currentSortKey={buildCurrentSortKey(sortBy, sortOrder)}
                  onSort={handleSort}
                  span={4}
                >
                  RESUME SCORE
                </COL>
                <COL
                  sortable
                  sortKey="applied_date"
                  currentSortKey={buildCurrentSortKey(sortBy, sortOrder)}
                  onSort={handleSort}
                  span={4}
                >
                  APPLIED DATE
                </COL>
                <COL span={6}>
                  <span>STATUS</span>
                </COL>
                <COL span={2}>
                  <span>ACTIONS</span>
                </COL>
              </Row>
            </div>

            <div className="w-full">
              {isLoading ? (
                <Loader />
              ) : error ? (
                <p>
                  {getCandidateErrorMessage(error, 'Failed to load candidates. Please try again.')}
                </p>
              ) : candidates.length > 0 ? (
                candidates.map((candidate) => (
                  <div key={candidate.id} className="mb-3">
                    <div
                      className={clsx(
                        selected[candidate.id] && 'selected-candidate-highlight',
                        'transition-shadow hover:shadow-md'
                      )}
                      style={{
                        border: selected[candidate.id]
                          ? '2px solid var(--primary)'
                          : '2px solid transparent',
                        borderRadius: 12,
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <CommonCard>
                        <Row gutter={[16, 16]} align="middle">
                          <Col span={1}>
                            <Checkbox
                              className="custom-checkbox roboto-font"
                              checked={!!selected[candidate.id]}
                              onChange={() => toggleSelect(candidate.id)}
                            />
                          </Col>
                          <Col span={3} className="min-w-0 overflow-hidden">
                            <div
                              className="flex items-center gap-2.5 min-w-0 max-w-full cursor-pointer roboto-font"
                              onClick={() =>
                                setExpandedId((prev) =>
                                  prev === candidate.id ? null : candidate.id
                                )
                              }
                            >
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${candidateStatusColor(candidate.status_code).dot}`}
                              >
                                {candidateInitials(candidate)}
                              </span>
                              <Link
                                to={buildDetailsPath(candidate.id)}
                                className="block min-w-0 flex-1 overflow-hidden text-[var(--primary)]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="block min-w-0 truncate whitespace-nowrap font-semibold underline text-[var(--primary)] leading-5">
                                  {candidate.first_name || 'N/A'}
                                </span>
                              </Link>
                            </div>
                          </Col>
                          <Col span={3} className="min-w-0 overflow-hidden">
                            <Link
                              to={buildDetailsPath(candidate.id)}
                              className="block min-w-0 truncate whitespace-nowrap text-sm text-neutral-700 roboto-font"
                            >
                              {candidate.last_name || 'N/A'}
                            </Link>
                          </Col>
                          <Col span={4}>
                            {candidate.resume_score === null ? (
                              <span className="text-sm text-neutral-400">—</span>
                            ) : (
                              <Badge
                                dot={false}
                                status={
                                  candidate.resume_score >= 70
                                    ? 'success'
                                    : candidate.resume_score >= 40
                                      ? 'warning'
                                      : 'danger'
                                }
                              >
                                {candidate.resume_score}
                              </Badge>
                            )}
                          </Col>
                          <Col span={4}>
                            <p className="text-sm text-neutral-600 roboto-font">
                              {dayjs(candidate.applied_date).isValid()
                                ? dayjs(candidate.applied_date).format('MMM DD, YYYY')
                                : 'N/A'}
                            </p>
                          </Col>
                          <Col span={6}>
                            <Tooltip title={candidateStatusTooltip(candidate.status_code)}>
                              <Link
                                to={buildDetailsPath(candidate.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-block"
                              >
                                {(() => {
                                  const color = candidateStatusColor(candidate.status_code);
                                  return (
                                    <span
                                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${color.bg} ${color.text}`}
                                    >
                                      <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
                                      {candidate.status_label ||
                                        statusLabelByCode.get(candidate.status_code ?? '') ||
                                        'Not yet screened'}
                                    </span>
                                  );
                                })()}
                              </Link>
                            </Tooltip>
                          </Col>
                          <Col span={2} className="flex items-center justify-center">
                            <div className={actionIconRowClass}>
                              <Tooltip title="View Assessment">
                                <MdOutlineRemoveRedEye
                                  className="block cursor-pointer"
                                  onClick={() => navigate(buildDetailsPath(candidate.id))}
                                />
                              </Tooltip>
                              <Tooltip title="Candidate Notes">
                                <LuSquarePen
                                  size={18}
                                  className="block cursor-pointer"
                                  onClick={() =>
                                    setNotesCandidate({
                                      id: candidate.id,
                                      name: candidateDisplayName(candidate),
                                    })
                                  }
                                />
                              </Tooltip>
                            </div>
                          </Col>
                        </Row>
                        {expandedId === candidate.id && (
                          <div className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-1.5 rounded-lg bg-neutral-50 p-3 text-xs sm:grid-cols-3 lg:grid-cols-5">
                            <p className="truncate">
                              <span className="font-semibold text-neutral-500">
                                Qualification:{' '}
                              </span>
                              <span className="text-neutral-700">
                                {candidate.qualification || 'N/A'}
                              </span>
                            </p>
                            <p className="truncate">
                              <span className="font-semibold text-neutral-500">Email: </span>
                              <span className="text-neutral-700">
                                {candidate.email_id || 'N/A'}
                              </span>
                            </p>
                            <p className="truncate">
                              <span className="font-semibold text-neutral-500">Phone: </span>
                              <span className="text-neutral-700">
                                {candidate.contact_no || 'N/A'}
                              </span>
                            </p>
                            <p className="truncate">
                              <span className="font-semibold text-neutral-500">Location: </span>
                              <span className="text-neutral-700">{candidate.address || 'N/A'}</span>
                            </p>
                            <p className="truncate">
                              <span className="font-semibold text-neutral-500">Source: </span>
                              <span className="text-neutral-700">{candidate.source || 'N/A'}</span>
                            </p>
                          </div>
                        )}
                      </CommonCard>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-200 bg-white py-14 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                    <LuUsers size={22} />
                  </span>
                  <p className="text-sm font-semibold text-neutral-600">
                    No candidates found for this job opening.
                  </p>
                  <p className="text-xs text-neutral-400">
                    Try adjusting your search or filters, or add a candidate above.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <MasterPagination
          current={page + 1}
          pageSize={PAGE_SIZE}
          total={data?.total ?? 0}
          itemLabel="Candidates"
          onPageChange={(p) => setPage(p - 1)}
        />
      </div>

      {selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-slideUp">
          <div className="flex justify-center w-full px-4 mb-4">
            <div className="inline-flex max-w-[90vw] xl:max-w-[56rem] items-center justify-between gap-3 bg-white border border-[var(--border)] shadow-lg rounded-2xl p-4 md:p-6">
              <div className="flex min-w-0 items-center gap-3 md:gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary">
                    <span className="text-white text-xs font-semibold">{selectedCount}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Candidate(s)</span>
                    <span className="text-sm font-semibold">Selected</span>
                  </div>
                </div>

                <div className="h-8 w-px bg-[var(--border)] hidden sm:block"></div>

                <div className="flex min-w-0 flex-wrap items-center gap-2 md:gap-3">
                  <Button
                    className="flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 cursor-pointer hover:bg-neutral-100 text-sm h-8"
                    onClick={() => openStatusModal('advance', selectedCandidates)}
                  >
                    <IoArrowRedoOutline size={16} /> Advance
                  </Button>
                  <Button
                    className="flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 cursor-pointer hover:bg-neutral-100 text-sm h-8"
                    onClick={() => openStatusModal('reject', selectedCandidates)}
                  >
                    <LuThumbsDown size={16} />
                    Reject
                  </Button>
                  <Button
                    className="flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 cursor-pointer hover:bg-neutral-100 text-sm h-8"
                    onClick={() => openStatusModal('select', selectedCandidates)}
                  >
                    <LuThumbsUp size={16} /> Select
                  </Button>
                  <Button
                    className="flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 cursor-pointer hover:bg-neutral-100 text-sm h-8 bg-white text-gray-900"
                    onClick={() => setIsBulkEmailOpen(true)}
                  >
                    <LuMail size={16} /> Email
                  </Button>
                  {canManageCandidates && (
                    <Button
                      className="flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 cursor-pointer hover:bg-neutral-100 text-sm h-8 bg-white text-gray-900"
                      onClick={() => setIsBulkScheduleOpen(true)}
                    >
                      <LuCalendarPlus size={16} /> Schedule
                    </Button>
                  )}
                </div>
              </div>
              <Button
                className="cursor-pointer hover:text-gray-800 text-sm h-8 shrink-0"
                onClick={clearSelection}
              >
                <MdClose size={22} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {statusModal && (
        <ChangeCandidateStatusModal
          open={!!statusModal}
          onClose={() => setStatusModal(null)}
          mode={statusModal.mode}
          candidates={statusModal.candidates}
          onSuccess={handleStatusSuccess}
        />
      )}

      <BulkEmailCandidatesModal
        open={isBulkEmailOpen}
        onClose={() => setIsBulkEmailOpen(false)}
        candidates={selectedCandidates}
      />
      <BulkScheduleInterviewsModal
        open={isBulkScheduleOpen}
        onClose={() => setIsBulkScheduleOpen(false)}
        candidates={selectedCandidates}
        jobId={parsedJobId}
        onScheduled={() => {
          clearSelection();
          refetch();
        }}
      />
      <JobListingNotesPanel
        open={isJobNotesPanelOpen}
        onClose={() => setIsJobNotesPanelOpen(false)}
        jobTitle={jobTitleName}
        jobOpeningId={parsedJobId}
        canWrite={canWriteJobNotes}
      />
      <CandidateRecruiterNotesPanel
        open={Boolean(notesCandidate)}
        onClose={() => setNotesCandidate(null)}
        title={`Candidate Notes - ${notesCandidate?.name || ''}`.trim()}
        candidateId={notesCandidate?.id}
      />
      <AddCandidateModal
        open={isAddCandidateModalOpen}
        onClose={() => setIsAddCandidateModalOpen(false)}
        onBulkImportCompleted={refetch}
      />
    </div>
  );
};

export default CandidatesListing;
