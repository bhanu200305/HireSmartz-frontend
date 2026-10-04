import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { useSelector, shallowEqual } from 'react-redux';
import { Col, Row, Tooltip, Checkbox } from 'antd';
import dayjs from 'dayjs';
import clsx from 'clsx';
import './candidatesListing.css';
import {
  LuCalendarPlus,
  LuMail,
  LuSquarePen,
  LuThumbsDown,
  LuThumbsUp,
  LuUsers,
} from 'react-icons/lu';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { IoArrowRedoOutline } from 'react-icons/io5';
import { MdClose, MdEdit, MdOutlineRemoveRedEye } from 'react-icons/md';
import { FaEnvelope } from 'react-icons/fa';
import { CommonCard, Button, Badge, showToast } from '../../shared';
import MasterPagination from '../../shared/ui/MasterPagination';
import { RowsPerPageSelect } from '../../shared/ui/RowsPerPageSelect';
import { usePersistedPageSize } from '../../../hooks/usePersistedPageSize';
import { PAGE_SIZE_OPTIONS } from '../../../constants/app.constants';
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
import { useListCandidateInterviewScoresQuery } from '../../../api/candidate-service/Candidates/scoring';
import {
  useListCandidateStatusesQuery,
  useListApplicationSourcesQuery,
} from '../../../api/candidate-service/Master/master';
import FilterMenu, { type CandidateListFilterValues } from './FilterMenu';
import AddCandidateModal from './Modal/AddCandidateModal';
import EditCandidateModal from './Modal/EditCandidateModal';
import CandidateRecruiterNotesPanel from './Notes/CandidateRecruiterNotesPanel';
import BulkEmailCandidatesModal from './Modal/BulkEmailCandidatesModal';
import BulkScheduleInterviewsModal from './Modal/BulkScheduleInterviewsModal';
import ChangeCandidateStatusModal, {
  type ChangeCandidateStatusMode,
} from './Modal/ChangeCandidateStatusModal';
import JobListingNotesPanel from '../Notes/JobListingNotesPanel';
import {
  candidateDisplayName,
  candidateStatusColor,
  candidateStatusTooltip,
} from './candidateDisplay';
import { normaliseRoundStatus } from './roundProgress';
import type { CandidateNavState } from './useCandidateNavigation';
import { formatRoundStatus } from './roundDisplay';
import { AI_SCORE_MAX, scoreBadgeStatus } from './roundPipeline';

// Candidate list is job-scoped; there is no cross-job list route.
// `resume_score` of null means "not scored yet", not an error.

type SelectedMap = Record<string, boolean>;

const buildCurrentSortKey = (sortBy: string, sortOrder: 'asc' | 'desc') =>
  sortOrder === 'desc' ? `-${sortBy}` : sortBy;

// How long a just-applied candidate keeps its "New" badge. 48h (2 days),
// not 24h: a recruiter who doesn't open this job's candidate list every
// single day (weekends, a busy stretch) shouldn't come back to find
// yesterday's applicants already blending into the rest of the list. Not a
// full week either - by then "new" has stopped meaning anything useful,
// it's just noise competing with genuinely fresh applicants.
const NEW_CANDIDATE_WINDOW_HOURS = 48;

const isNewCandidate = (appliedDate: string): boolean => {
  const applied = dayjs(appliedDate);
  return applied.isValid() && dayjs().diff(applied, 'hour') < NEW_CANDIDATE_WINDOW_HOURS;
};

// Same "Avg. score so far" figure as roundPipeline.ts's candidate
// drill-down - the resume score plus every interview round's own score
// (recruiter's if one was recorded, else the AI's), averaged together. Its
// own component (not inlined in the row .map() below) because it needs a
// per-candidate scores query - can't call a hook from inside a loop body.
// No backend list endpoint returns this pre-aggregated, so it's one query
// per visible row rather than a single bulk fetch; frontend-only change,
// same tradeoff roundPipeline.ts already accepts per round.
const CandidateAverageScoreCell = ({
  candidateId,
  resumeScore,
}: {
  candidateId: string;
  resumeScore: number | null;
}) => {
  const { data: scores = [] } = useListCandidateInterviewScoresQuery(candidateId);
  // recruiter_score and the AI scores are all 0-5 (same as roundPipeline.ts).
  const scoreValues = [
    resumeScore,
    ...scores.map((s) => (s.recruiter_score != null ? s.recruiter_score : s.score)),
  ].filter((v): v is number => v !== null && v !== undefined);
  const avgScore =
    scoreValues.length > 0
      ? Number((scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length).toFixed(1))
      : null;

  if (avgScore === null) {
    return <span className="text-sm text-neutral-400">—</span>;
  }
  return (
    <Badge dot={false} status={scoreBadgeStatus(avgScore)}>
      {avgScore} / {AI_SCORE_MAX}
    </Badge>
  );
};

const CandidatesListing = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [pageSize, setPageSize] = usePersistedPageSize('job_candidates_listing', 20);

  const [selected, setSelected] = useState<SelectedMap>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAddCandidateModalOpen, setIsAddCandidateModalOpen] = useState(false);
  const [isJobNotesPanelOpen, setIsJobNotesPanelOpen] = useState(false);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);
  const [isBulkScheduleOpen, setIsBulkScheduleOpen] = useState(false);
  // Per-row Actions column targets (view is a plain navigation).
  const [editCandidate, setEditCandidate] = useState<CandidateView | null>(null);
  const [notesCandidate, setNotesCandidate] = useState<CandidateView | null>(null);
  const [emailCandidate, setEmailCandidate] = useState<CandidateView | null>(null);
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

  // Opened via "Add Candidate" from the job openings list actions menu -
  // consume the flag once so it doesn't reopen on a later back/forward nav.
  useEffect(() => {
    if (location.state?.openAddCandidate) {
      setIsAddCandidateModalOpen(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, location.pathname, navigate]);

  const { data, isLoading, refetch } = useListCandidatesQuery(
    {
      jobOpeningId: parsedJobId,
      search: search || undefined,
      statusCode,
      source,
      sortBy,
      sortOrder,
      limit: pageSize,
      offset: page * pageSize,
    },
    { skip: !parsedJobId, refetchOnMountOrArgChange: true }
  );

  const { data: statuses = [] } = useListCandidateStatusesQuery();
  const statusLabelByCode = useMemo(
    () => new Map(statuses.map((s) => [s.code, s.label])),
    [statuses]
  );
  // `candidate.source` is the raw master-data code (e.g. "qr_self_apply") —
  // same code/label split as candidate statuses above, resolved through the
  // same master endpoint FilterMenu.tsx's Source dropdown already uses,
  // rather than showing the snake_case code as-is.
  const { data: applicationSources = [] } = useListApplicationSourcesQuery();
  const sourceLabelByCode = useMemo(
    () => new Map(applicationSources.map((s) => [s.code, s.label])),
    [applicationSources]
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

  const buildDetailsPath = (candidateId: string) =>
    `/jobs/view/${parsedJobId}/candidates/${candidateId}/details`;
  // Hands the current filters/sort + absolute row position to the details
  // page so its Previous / Next buttons follow this list's order.
  const detailsNavState = (rowIndex: number): CandidateNavState => ({
    candidateNav: {
      args: {
        jobOpeningId: parsedJobId,
        search: search || undefined,
        statusCode,
        source,
        sortBy,
        sortOrder,
      },
      index: page * pageSize + rowIndex,
    },
  });

  const notesPillIconClass =
    '[&_svg]:!h-5 [&_svg]:!w-5 [&_.anticon]:!inline-flex [&_.anticon]:!h-5 [&_.anticon]:!w-5 [&_.anticon]:!items-center [&_.anticon]:!justify-center';

  return (
    // Layout/typography follow the legacy careerforcepro-web candidate list:
    // job facts stacked on the left, search/notes/add + filters on the right.
    <div className="candidates-list-page relative">
      {isJobOpeningLoading && <Loader />}

      <div className="mb-3 rounded-lg bg-white px-4 py-4 shadow-sm sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-1 text-sm">
            {/* Same 44px height as the buttons, to share their line. */}
            <Link
              to={`/jobs/view/${parsedJobId}/details`}
              className="flex min-h-11 w-fit max-w-full items-center"
            >
              <span className="block truncate font-bold text-xl heading-font text-primary underline cursor-pointer hover:opacity-80 transition-opacity capitalize">
                {jobTitleName}
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-bold">Job ID:</span>
              <span className="text-gray-500">{jobProfileCode || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">Department:</span>
              <span className="text-gray-500">{departmentName || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">Job Type:</span>
              <span className="text-gray-500">{jobTypeName || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">Candidates:</span>
              <span className="font-semibold text-gray-500">{data?.total ?? 0}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <Search
                appname="candidates listing"
                placeholder="Search Candidate..."
                onSearch={handleSearch}
                allowClear
                value={search}
                className="bg-white border-gray-300 rounded-full py-2 w-full sm:w-64"
              />

              {canViewJobNotes && (
                <Button
                  className={`box-border flex h-11 min-w-[170px] items-center justify-center gap-2 rounded-full border border-[#a9c5e6] bg-[#eaf3ff] px-5 text-[#2c69ad] font-semibold ${notesPillIconClass}`}
                  onClick={() => setIsJobNotesPanelOpen(true)}
                >
                  <LuSquarePen size={18} />
                  <span>Notes</span>
                  <span className="min-w-6 h-6 px-1.5 rounded-lg bg-[#2c69ad] text-white flex items-center justify-center text-xs leading-none">
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
                      className="box-border flex h-11 min-w-[170px] items-center justify-center rounded-full border border-transparent bg-primary px-5 font-semibold text-white"
                      onClick={() =>
                        !isDraft && !isClosed ? setIsAddCandidateModalOpen(true) : null
                      }
                      disabled={isDraft || isClosed}
                    >
                      Add Candidate
                    </Button>
                  </span>
                </Tooltip>
              )}
            </div>
            <div className="w-full lg:w-auto">
              <FilterMenu filters={{ statusCode, source }} onFilterChange={handleFilterChange} />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full">
        <RowsPerPageSelect
          pageSize={pageSize}
          options={PAGE_SIZE_OPTIONS}
          onChange={(size) => {
            setPageSize(size);
            setPage(0);
          }}
        />
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
                className="rounded-lg border border-neutral-200 bg-white px-4 py-6 text-[11px] font-bold text-black shadow heading-font"
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
                  span={6}
                >
                  Candidate Name
                </COL>
                {/* Not sortable - "average score" is computed client-side
                    per row (see CandidateAverageScoreCell), so there's no
                    single backend field to sort by. */}
                <COL span={4}>
                  <span>Avg. Score</span>
                </COL>
                <COL
                  sortable
                  sortKey="applied_date"
                  currentSortKey={buildCurrentSortKey(sortBy, sortOrder)}
                  onSort={handleSort}
                  span={4}
                >
                  Applied Date
                </COL>
                <COL span={6}>
                  <span>Status</span>
                </COL>
                <COL span={3}>
                  <span>Actions</span>
                </COL>
              </Row>
            </div>

            <div className="w-full">
              {isLoading ? (
                <Loader />
              ) : candidates.length > 0 ? (
                candidates.map((candidate, rowIndex) => (
                  <div key={candidate.id} className="mb-2">
                    <div
                      className={clsx(
                        selected[candidate.id] && 'selected-candidate-highlight',
                        'transition-shadow hover:shadow-md'
                      )}
                      style={{
                        border: selected[candidate.id]
                          ? '2px solid var(--primary)'
                          : '2px solid transparent',
                        borderRadius: 16,
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <CommonCard className="!rounded-2xl !border-neutral-100 !shadow-md">
                        <Row gutter={[16, 16]} align="middle">
                          <Col span={1}>
                            <Checkbox
                              className="custom-checkbox roboto-font"
                              checked={!!selected[candidate.id]}
                              onChange={() => toggleSelect(candidate.id)}
                            />
                          </Col>
                          <Col span={6} className="min-w-0 overflow-hidden">
                            <div
                              className="flex items-center gap-2 min-w-0 max-w-full cursor-pointer roboto-font"
                              onClick={() =>
                                setExpandedId((prev) =>
                                  prev === candidate.id ? null : candidate.id
                                )
                              }
                            >
                              <Link
                                to={buildDetailsPath(candidate.id)}
                                state={detailsNavState(rowIndex)}
                                className="group block min-w-0 overflow-hidden text-[var(--primary)]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="block min-w-0 truncate whitespace-nowrap font-semibold text-[var(--primary)] leading-5 transition-colors group-hover:text-black">
                                  {[candidate.first_name, candidate.last_name]
                                    .map((part) => part?.trim())
                                    .filter(Boolean)
                                    .join(' ') || 'N/A'}
                                </span>
                              </Link>
                              {isNewCandidate(candidate.applied_date) && (
                                <Badge status="info" dot={false} className="shrink-0">
                                  New
                                </Badge>
                              )}
                              <span className="shrink-0 text-neutral-700">
                                {expandedId === candidate.id ? <UpOutlined /> : <DownOutlined />}
                              </span>
                            </div>
                          </Col>
                          <Col span={4}>
                            <CandidateAverageScoreCell
                              candidateId={candidate.id}
                              resumeScore={candidate.resume_score}
                            />
                          </Col>
                          <Col span={4}>
                            <p className="text-sm text-neutral-900 roboto-font">
                              {dayjs(candidate.applied_date).isValid()
                                ? dayjs(candidate.applied_date).format('MMMM D, YYYY')
                                : 'N/A'}
                            </p>
                          </Col>
                          <Col span={6}>
                            <div className="flex flex-col items-start gap-0.5 roboto-font">
                              <Tooltip title={candidateStatusTooltip(candidate.status_code)}>
                                <Link
                                  to={buildDetailsPath(candidate.id)}
                                  state={detailsNavState(rowIndex)}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`inline-block text-sm hover:underline ${candidateStatusColor(candidate.status_code).text}`}
                                >
                                  {candidate.status_label ||
                                    statusLabelByCode.get(candidate.status_code ?? '') ||
                                    'Not yet screened'}
                                </Link>
                              </Tooltip>
                              {candidate.current_round_status && (
                                <Link
                                  to={buildDetailsPath(candidate.id)}
                                  state={detailsNavState(rowIndex)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-block text-sm text-neutral-900 hover:underline"
                                >
                                  {normaliseRoundStatus(candidate.current_round_status) ===
                                  'booking_created'
                                    ? 'Booking created — waiting to be scheduled'
                                    : normaliseRoundStatus(candidate.current_round_status) ===
                                        'awaiting_resume_upload'
                                      ? 'Awaiting Resume Upload'
                                      : formatRoundStatus(candidate.current_round_status)}
                                </Link>
                              )}
                            </div>
                          </Col>
                          <Col span={3}>
                            {/* Same four actions as the legacy list: view, edit, notes, email. */}
                            <div className="flex items-center gap-3 text-lg text-neutral-900">
                              <Tooltip title="View Assessment">
                                <button
                                  type="button"
                                  aria-label="View assessment"
                                  className="flex cursor-pointer hover:text-[var(--primary)] transition-colors"
                                  onClick={() =>
                                    navigate(buildDetailsPath(candidate.id), {
                                      state: detailsNavState(rowIndex),
                                    })
                                  }
                                >
                                  <MdOutlineRemoveRedEye />
                                </button>
                              </Tooltip>
                              <Tooltip title="Edit Candidate">
                                <button
                                  type="button"
                                  aria-label="Edit candidate"
                                  className="flex cursor-pointer hover:text-[var(--primary)] transition-colors"
                                  onClick={() => setEditCandidate(candidate)}
                                >
                                  <MdEdit />
                                </button>
                              </Tooltip>
                              <Tooltip title="Candidate Notes">
                                <button
                                  type="button"
                                  aria-label="Candidate notes"
                                  className="flex cursor-pointer hover:text-[var(--primary)] transition-colors"
                                  onClick={() => setNotesCandidate(candidate)}
                                >
                                  <LuSquarePen size={17} />
                                </button>
                              </Tooltip>
                              <Tooltip
                                title={
                                  candidate.email_id
                                    ? `Email ${candidate.email_id}`
                                    : 'No email on file'
                                }
                              >
                                <span className="inline-flex">
                                  <button
                                    type="button"
                                    aria-label="Email candidate"
                                    className="flex cursor-pointer hover:text-[var(--primary)] transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-neutral-900"
                                    disabled={!candidate.email_id}
                                    onClick={() => setEmailCandidate(candidate)}
                                  >
                                    <FaEnvelope size={16} />
                                  </button>
                                </span>
                              </Tooltip>
                            </div>
                          </Col>
                        </Row>
                        {expandedId === candidate.id && (
                          <div className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-1.5 rounded-lg bg-neutral-50 p-3 text-xs sm:grid-cols-3">
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
                              <span className="font-semibold text-neutral-500">Source: </span>
                              <span className="text-neutral-700">
                                {(candidate.source && sourceLabelByCode.get(candidate.source)) ||
                                  candidate.source ||
                                  'N/A'}
                              </span>
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
          pageSize={pageSize}
          total={data?.total ?? 0}
          itemLabel="candidates"
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
      {editCandidate && (
        <EditCandidateModal
          open={!!editCandidate}
          onClose={() => setEditCandidate(null)}
          candidate={editCandidate}
        />
      )}
      <CandidateRecruiterNotesPanel
        open={!!notesCandidate}
        onClose={() => setNotesCandidate(null)}
        title={`Candidate Notes - ${notesCandidate ? candidateDisplayName(notesCandidate) : ''}`}
        candidateId={notesCandidate?.id}
      />
      <BulkEmailCandidatesModal
        open={!!emailCandidate}
        onClose={() => setEmailCandidate(null)}
        candidates={emailCandidate ? [emailCandidate] : []}
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
