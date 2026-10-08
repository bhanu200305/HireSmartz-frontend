import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { useSelector, shallowEqual } from 'react-redux';
import { Col, Row, Tooltip, Checkbox, Dropdown } from 'antd';
import dayjs from 'dayjs';
import clsx from 'clsx';
import './candidatesListing.css';
import {
  LuCalendarPlus,
  LuMail,
  LuSquarePen,
  LuThumbsDown,
  LuThumbsUp,
  LuTriangleAlert,
  LuUsers,
} from 'react-icons/lu';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { IoArrowRedoOutline, IoChatbubbleEllipses } from 'react-icons/io5';
import { MdArrowDropDown, MdClose, MdEdit, MdOutlineRemoveRedEye } from 'react-icons/md';
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
  type CandidateDisplayStatus,
  type CandidateView,
  type ListCandidatesArgs,
} from '../../../api/candidate-service/Candidates/CandidateLifecycle';
import { useListApplicationSourcesQuery } from '../../../api/candidate-service/Master/master';
import FilterMenu, { type CandidateListFilterValues } from './FilterMenu';
import AddCandidateModal from './Modal/AddCandidateModal';
import { phoneNumberIssueMessage } from './phoneNumberIssue';
import CandidateRecruiterNotesPanel from './Notes/CandidateRecruiterNotesPanel';
import BulkEmailCandidatesModal from './Modal/BulkEmailCandidatesModal';
import BulkSendSmsModal from './Modal/BulkSendSmsModal';
import BulkScheduleInterviewsModal from './Modal/BulkScheduleInterviewsModal';
import BulkAdvanceModal from './Modal/BulkAdvanceModal';
import ChangeCandidateStatusModal, {
  type ChangeCandidateStatusMode,
} from './Modal/ChangeCandidateStatusModal';
import JobListingNotesPanel from '../Notes/JobListingNotesPanel';
import { useGetInterviewRoundsByJobIdQuery } from '../../../api/job-service/JobOpening/GetInterviewRound';
import {
  candidateDisplayName,
  candidateDisplayStatusColor,
  candidateDisplayStatusLabel,
  candidateDisplayStatusTooltip,
  resolveDisplayStatus,
} from './candidateDisplay';
import { normaliseRoundStatus } from './roundProgress';
import type { CandidateNavState } from './useCandidateNavigation';
import { formatRoundStatus, roundStatusLabel } from './roundDisplay';
import { AI_SCORE_MAX, scoreBadgeStatus } from './roundPipeline';
import NameMissingFlag from './NameMissingFlag';

// Candidate list is job-scoped; there is no cross-job list route.
// `resume_score` of null means "not scored yet", not an error.

type SelectedMap = Record<string, boolean>;

const buildCurrentSortKey = (sortBy: string, sortOrder: 'asc' | 'desc') =>
  sortOrder === 'desc' ? `-${sortBy}` : sortBy;

// The Avg. Score column shows the server's `average_score` (resume score plus
// every interview score, recruiter's where one exists, one decimal; null when
// the candidate has no scores yet).
const CandidateAverageScoreCell = ({ average }: { average: number | null | undefined }) => {
  if (average === null || average === undefined) return null;
  return (
    <Badge dot={false} status={scoreBadgeStatus(average)}>
      {average} / {AI_SCORE_MAX}
    </Badge>
  );
};

// With the Round filter or a browser-side sort (last name, status) on, the list
// loads up to 200 candidates (the API maximum) and is filtered, sorted and
// paged here.
/** Short warning under a candidate's name when there's no way to reach them;
 * null when both a phone number and an email are on file. */
const missingContactLabel = (
  candidate: Pick<CandidateView, 'contact_no' | 'email_id'>
): string | null => {
  const noPhone = !candidate.contact_no?.trim();
  const noEmail = !candidate.email_id?.trim();
  if (noPhone && noEmail) return 'No phone or email';
  if (noPhone) return 'No phone';
  if (noEmail) return 'No email';
  return null;
};

const CLIENT_PAGED_FETCH_LIMIT = 200;
// Value of the Round filter's "Resume Review" option (no round id exists).
const RESUME_ROUND_FILTER = '__resume__';
// What candidate-service names the resume stage in `current_round_name`
// (`RESUME_STAGE_NAME`), the same text the list's status column shows.
const RESUME_STAGE_LABEL = 'Resume Review';

const CandidatesListing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, callerKind, userId } = useSelector((state: any) => state.LoginSlice, shallowEqual);
  const tenantId = useSessionTenantId();
  const effectivePermissions = useEffectivePermissions();
  const { id } = useParams<{ id: string }>();
  const parsedJobId = asJobId(id);

  const [search, setSearch] = useState('');
  const [displayStatus, setDisplayStatus] = useState<CandidateDisplayStatus | undefined>();
  const [source, setSource] = useState<string | undefined>();
  const [roundId, setRoundId] = useState<string | undefined>();
  // Sorts the backend has no field for (last name, status) are applied here,
  // over the same up-to-200 window as the Round filter.
  const [clientSort, setClientSort] = useState<{
    key: 'last_name' | 'status';
    order: 'asc' | 'desc';
  } | null>(null);
  // What the Candidate Name header sorts by.
  const [nameSortMode, setNameSortMode] = useState<'first' | 'last' | 'upload'>('first');
  const isClientPaged = Boolean(roundId) || Boolean(clientSort);
  const [sortBy, setSortBy] = useState<NonNullable<ListCandidatesArgs['sortBy']>>('applied_date');
  const [sortOrder, setSortOrder] = useState<NonNullable<ListCandidatesArgs['sortOrder']>>('desc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('job_candidates_listing', 20);

  const [selected, setSelected] = useState<SelectedMap>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAddCandidateModalOpen, setIsAddCandidateModalOpen] = useState(false);
  const [isJobNotesPanelOpen, setIsJobNotesPanelOpen] = useState(false);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);
  const [isBulkSmsOpen, setIsBulkSmsOpen] = useState(false);
  const [isBulkScheduleOpen, setIsBulkScheduleOpen] = useState(false);
  const [isBulkAdvanceOpen, setIsBulkAdvanceOpen] = useState(false);
  // Per-row Actions column targets (view and edit are plain navigations).
  const [notesCandidate, setNotesCandidate] = useState<CandidateView | null>(null);
  const [emailCandidate, setEmailCandidate] = useState<CandidateView | null>(null);
  const [smsCandidate, setSmsCandidate] = useState<CandidateView | null>(null);
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
  // Same rule as the list's Edit action; here only a draft can be edited.
  const canEditDraft = isDraft && !!jobOpeningData && canWriteJobNotes;

  // Opened via "Upload Resume" from the job openings list actions menu -
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
      displayStatus,
      source,
      // The Resume Review option has no job-service round behind it, so
      // it narrows nothing on the server (see `scopedItems` below).
      roundId: roundId && roundId !== RESUME_ROUND_FILTER ? roundId : undefined,
      sortBy,
      sortOrder,
      limit: isClientPaged ? CLIENT_PAGED_FETCH_LIMIT : pageSize,
      offset: isClientPaged ? 0 : page * pageSize,
    },
    { skip: !parsedJobId, refetchOnMountOrArgChange: true }
  );

  // `candidate.source` is the raw master-data code (e.g. "qr_self_apply") —
  // resolved to its label through the
  // same master endpoint FilterMenu.tsx's Source dropdown already uses,
  // rather than showing the snake_case code as-is.
  const { data: applicationSources = [] } = useListApplicationSourcesQuery();
  const sourceLabelByCode = useMemo(
    () => new Map(applicationSources.map((s) => [s.code, s.label])),
    [applicationSources]
  );
  const fetchedItems = useMemo(() => data?.items ?? [], [data]);

  // The job's interview rounds, for the Round filter.
  const { data: jobRoundPlan } = useGetInterviewRoundsByJobIdQuery(parsedJobId ?? '', {
    skip: !parsedJobId,
  });
  const roundOptions = useMemo(
    () =>
      ((jobRoundPlan ?? []) as Array<{ roundId?: string; roundName?: string | null }>)
        .filter((r) => r.roundId)
        .map((r) =>
          // The plan's "Resume Review" round is the resume stage, which candidates
          // are never "sitting at" through a round id.
          ['resume review', 'resume screening', 'resume round'].includes(
            (r.roundName ?? '').trim().toLowerCase()
          )
            ? { label: RESUME_STAGE_LABEL, value: RESUME_ROUND_FILTER }
            : { label: r.roundName || 'Round', value: r.roundId as string }
        ),
    [jobRoundPlan]
  );

  // Round filter: the server's `round_id` match is "has a round row for it
  // that isn't completed", which includes every round the candidate hasn't
  // reached yet, so it over-matches. The list rows carry the round each
  // candidate is really on now (`current_round_name`), so the exact match is
  // made here, over the (up to 200) candidates the server returned.
  const scopedItems = useMemo(() => {
    if (!roundId) return fetchedItems;
    const wanted = roundOptions.find((o) => o.value === roundId);
    if (!wanted) return fetchedItems;
    return fetchedItems.filter((c) => {
      if (resolveDisplayStatus(c) !== 'in_process') return false;
      return roundId === RESUME_ROUND_FILTER
        ? !c.current_round_name || c.current_round_name === RESUME_STAGE_LABEL
        : c.current_round_name === wanted.label;
    });
  }, [fetchedItems, roundId, roundOptions]);

  const sortedItems = useMemo(() => {
    if (clientSort) {
      const dir = clientSort.order === 'asc' ? 1 : -1;
      const roundIndex = (c: CandidateView) => {
        const at = roundOptions.findIndex((o) => o.label === c.current_round_name);
        return c.current_round_name ? (at >= 0 ? at + 1 : roundOptions.length + 1) : 0;
      };
      const keyOf = (c: CandidateView) =>
        clientSort.key === 'last_name'
          ? (c.last_name ?? '').trim().toLowerCase()
          : candidateDisplayStatusLabel(resolveDisplayStatus(c)).toLowerCase();
      return [...scopedItems].sort((a, b) => {
        const x = keyOf(a);
        const y = keyOf(b);
        // Blank last names go last either way.
        if (clientSort.key === 'last_name' && (!x || !y) && x !== y) return x ? -1 : 1;
        const byKey = x.localeCompare(y) * dir;
        if (byKey !== 0 || clientSort.key === 'last_name') return byKey;
        return (roundIndex(a) - roundIndex(b)) * dir;
      });
    }
    return scopedItems;
  }, [scopedItems, clientSort, roundOptions]);
  const candidates = useMemo(() => {
    if (!isClientPaged) return fetchedItems;
    return sortedItems.slice(page * pageSize, (page + 1) * pageSize);
  }, [isClientPaged, fetchedItems, sortedItems, page, pageSize]);
  const totalCandidates = isClientPaged ? sortedItems.length : (data?.total ?? 0);
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

  const applyNameSort = (mode: 'first' | 'last' | 'upload', direction: 'asc' | 'desc') => {
    if (mode === 'last') {
      setClientSort({ key: 'last_name', order: direction });
    } else {
      setClientSort(null);
      // "Last upload" is newest-added first: the applied date is the only
      // timestamp the list can sort by.
      setSortBy(mode === 'first' ? 'name' : 'applied_date');
      setSortOrder(direction);
    }
    setPage(0);
  };

  const handleSort = (key: string, direction: SortDirection) => {
    if (key === 'name') {
      applyNameSort(nameSortMode, direction ?? 'asc');
      return;
    }
    if (key === 'status') {
      setClientSort({ key: 'status', order: direction ?? 'asc' });
      setPage(0);
      return;
    }
    setClientSort(null);
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
    if ('displayStatus' in next) setDisplayStatus(next.displayStatus);
    if ('source' in next) setSource(next.source);
    if ('roundId' in next) setRoundId(next.roundId);
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
        displayStatus,
        source,
        roundId,
        sortBy,
        sortOrder,
      },
      index: isClientPaged ? sortedItems.indexOf(candidates[rowIndex]) : page * pageSize + rowIndex,
      // Browser-side sorts/filters: Previous / Next follow the exact order
      // shown here, since the server can't reproduce it.
      ...(isClientPaged ? { orderedIds: sortedItems.map((c) => c.id) } : {}),
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

              {canEditDraft && (
                <Button
                  className="box-border flex h-11 min-w-[170px] items-center justify-center gap-2 rounded-full border border-primary bg-white px-5 font-semibold text-primary"
                  onClick={() => navigate(`/jobs/edit/${parsedJobId}/details`)}
                >
                  <MdEdit size={18} />
                  <span>Edit</span>
                </Button>
              )}

              {canManageCandidates && (
                <Tooltip
                  title={
                    isDraft
                      ? 'Cannot upload resumes to draft job openings'
                      : isClosed
                        ? 'Cannot upload resumes to closed job openings'
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
                      Upload Resume
                    </Button>
                  </span>
                </Tooltip>
              )}
            </div>
            <div className="w-full lg:w-auto">
              <FilterMenu
                filters={{ displayStatus, source, roundId }}
                onFilterChange={handleFilterChange}
                roundOptions={roundOptions}
              />
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
                  currentSortKey={
                    clientSort
                      ? clientSort.key === 'last_name'
                        ? buildCurrentSortKey('name', clientSort.order)
                        : ''
                      : sortBy === 'name'
                        ? buildCurrentSortKey('name', sortOrder)
                        : ''
                  }
                  onSort={handleSort}
                  span={6}
                >
                  <span className="inline-flex items-center">
                    Candidate Name
                    <Dropdown
                      trigger={['click']}
                      menu={{
                        selectedKeys: [nameSortMode],
                        items: [
                          { key: 'first', label: 'First Name' },
                          { key: 'last', label: 'Last Name' },
                          { key: 'upload', label: 'Last Upload' },
                        ],
                        onClick: ({ key, domEvent }) => {
                          domEvent.stopPropagation();
                          const mode = key as 'first' | 'last' | 'upload';
                          setNameSortMode(mode);
                          applyNameSort(mode, mode === 'upload' ? 'desc' : 'asc');
                        },
                      }}
                    >
                      <button
                        type="button"
                        aria-label="Choose what the name column sorts by"
                        className="ml-1 flex cursor-pointer items-center rounded text-neutral-500 hover:text-black"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MdArrowDropDown size={18} />
                      </button>
                    </Dropdown>
                  </span>
                </COL>
                {/* Sorted by the server (`sort_by=avg_score`), across every
                    page; candidates with no average go last either way. */}
                <COL
                  sortable
                  sortKey="avg_score"
                  currentSortKey={
                    !clientSort && sortBy === 'avg_score'
                      ? buildCurrentSortKey('avg_score', sortOrder)
                      : ''
                  }
                  onSort={handleSort}
                  span={4}
                >
                  Avg. Score
                </COL>
                <COL
                  sortable
                  sortKey="applied_date"
                  currentSortKey={
                    clientSort || sortBy !== 'applied_date'
                      ? ''
                      : buildCurrentSortKey(sortBy, sortOrder)
                  }
                  onSort={handleSort}
                  span={4}
                >
                  Applied Date
                </COL>
                <COL
                  sortable
                  sortKey="status"
                  currentSortKey={
                    clientSort?.key === 'status'
                      ? buildCurrentSortKey('status', clientSort.order)
                      : ''
                  }
                  onSort={handleSort}
                  span={6}
                >
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
                              {candidate.resume_name_missing && <NameMissingFlag />}
                              {candidate.is_new_for_me && (
                                <Badge status="info" dot={false} className="shrink-0">
                                  New
                                </Badge>
                              )}
                              <span className="shrink-0 text-neutral-700">
                                {expandedId === candidate.id ? <UpOutlined /> : <DownOutlined />}
                              </span>
                            </div>
                            {missingContactLabel(candidate) && (
                              <p className="m-0 mt-0.5 flex items-center gap-1 text-xs font-medium text-amber-700">
                                <LuTriangleAlert size={12} className="shrink-0" aria-hidden />
                                {missingContactLabel(candidate)}
                              </p>
                            )}
                          </Col>
                          <Col span={4}>
                            <CandidateAverageScoreCell average={candidate.average_score} />
                          </Col>
                          <Col span={4}>
                            <p className="text-sm text-neutral-900 roboto-font">
                              {dayjs(candidate.applied_date).isValid()
                                ? dayjs(candidate.applied_date).format('MMM D, YYYY')
                                : 'N/A'}
                            </p>
                          </Col>
                          <Col span={6}>
                            {(() => {
                              // candidate-service's `display_status`; round
                              // details only mean something while In Process.
                              const displayStatus = resolveDisplayStatus(candidate);
                              const roundStatus = candidate.current_round_status;
                              return (
                                <div className="flex min-w-0 flex-col items-start gap-0.5 roboto-font">
                                  <Tooltip title={candidateDisplayStatusTooltip(displayStatus)}>
                                    <Link
                                      to={buildDetailsPath(candidate.id)}
                                      state={detailsNavState(rowIndex)}
                                      onClick={(e) => e.stopPropagation()}
                                      className={`inline-block text-sm font-medium hover:underline ${candidateDisplayStatusColor(displayStatus).text}`}
                                    >
                                      {candidateDisplayStatusLabel(displayStatus)}
                                    </Link>
                                  </Tooltip>
                                  {displayStatus === 'in_process' && (
                                    <Link
                                      to={buildDetailsPath(candidate.id)}
                                      state={detailsNavState(rowIndex)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-block max-w-full text-sm text-neutral-900 hover:underline"
                                    >
                                      {/* No round name yet = still at the resume stage. */}
                                      <span className="font-medium">
                                        {candidate.current_round_name || 'Resume Review'}
                                      </span>
                                      {roundStatus && (
                                        <span className="text-neutral-600">
                                          {' · '}
                                          {/* in_progress = candidate is on the live call
                                              right now; candidate-service flips it back to
                                              the round's normal status when they leave.
                                              Shows on the list's next refresh, not live. */}
                                          {normaliseRoundStatus(roundStatus) ===
                                          'awaiting_resume_upload'
                                            ? 'Awaiting Resume Upload'
                                            : normaliseRoundStatus(roundStatus) ===
                                                'resume_upload_expired'
                                              ? 'Resume Upload Link Expired'
                                              : // Same wording as the Interview Scheduling
                                                // cards: Ongoing, Invitation sent, ...
                                                (roundStatusLabel(roundStatus) ??
                                                formatRoundStatus(roundStatus))}
                                        </span>
                                      )}
                                    </Link>
                                  )}
                                </div>
                              );
                            })()}
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
                                  // Opens the details page's Candidate Details
                                  // tab already in edit mode, as the legacy app did.
                                  onClick={() =>
                                    navigate(
                                      {
                                        pathname: buildDetailsPath(candidate.id),
                                        search: '?tab=details&edit=true',
                                      },
                                      { state: detailsNavState(rowIndex) }
                                    )
                                  }
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
                              <Tooltip
                                title={
                                  !candidate.contact_no
                                    ? 'No phone number on file'
                                    : candidate.sms_consent_at === null
                                      ? 'Candidate has not given SMS consent'
                                      : `SMS ${candidate.contact_no}`
                                }
                              >
                                <span className="inline-flex">
                                  <button
                                    type="button"
                                    aria-label="Send SMS"
                                    className="flex cursor-pointer hover:text-[var(--primary)] transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-neutral-900"
                                    disabled={
                                      !candidate.contact_no || candidate.sms_consent_at === null
                                    }
                                    onClick={() => setSmsCandidate(candidate)}
                                  >
                                    <IoChatbubbleEllipses size={17} />
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
                              {phoneNumberIssueMessage(candidate.phone_number_issue) && (
                                <Tooltip
                                  title={phoneNumberIssueMessage(candidate.phone_number_issue)}
                                >
                                  <LuTriangleAlert
                                    size={13}
                                    className="ml-1 inline align-[-2px] text-amber-600"
                                    aria-label={
                                      phoneNumberIssueMessage(candidate.phone_number_issue) ??
                                      undefined
                                    }
                                  />
                                </Tooltip>
                              )}
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
          total={totalCandidates}
          itemLabel="candidates"
          onPageChange={(p) => setPage(p - 1)}
        />
      </div>

      {/* Rendered on <body> so no scrolling/transformed parent can clip or
          hide it when the page is scrolled to the bottom. */}
      {selectedCount > 0 &&
        createPortal(
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
                      onClick={() => setIsBulkAdvanceOpen(true)}
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
                    <Button
                      className="flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 cursor-pointer hover:bg-neutral-100 text-sm h-8 bg-white text-gray-900"
                      onClick={() => setIsBulkSmsOpen(true)}
                    >
                      <IoChatbubbleEllipses size={16} /> SMS
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
          </div>,
          document.body
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
      <BulkAdvanceModal
        open={isBulkAdvanceOpen}
        onClose={() => setIsBulkAdvanceOpen(false)}
        candidates={selectedCandidates}
        onDone={() => {
          clearSelection();
          refetch();
        }}
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
      <BulkSendSmsModal
        open={isBulkSmsOpen}
        onClose={() => setIsBulkSmsOpen(false)}
        candidates={selectedCandidates}
      />
      <BulkSendSmsModal
        open={!!smsCandidate}
        onClose={() => setSmsCandidate(null)}
        candidates={smsCandidate ? [smsCandidate] : []}
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
