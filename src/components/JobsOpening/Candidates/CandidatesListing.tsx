import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useSelector, shallowEqual } from 'react-redux';
import { Col, Row, Tooltip, Checkbox } from 'antd';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { LuMail, LuMessageSquare, LuSquarePen, LuThumbsDown, LuThumbsUp } from 'react-icons/lu';
import { IoArrowRedoOutline } from 'react-icons/io5';
import { MdClose, MdOutlineRemoveRedEye } from 'react-icons/md';
import { CommonCard, Button, showToast } from '../../shared';
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
import { hasFeatureAccess } from '../../../shared/utils/auth/getAccess';
import { asJobId } from '../../../api/job-service/jobId';
import {
  useListCandidatesQuery,
  type CandidateView,
  type ListCandidatesArgs,
} from '../../../api/candidate-service/Candidates/CandidateLifecycle';
import { useListCandidateStatusesQuery } from '../../../api/candidate-service/Master/master';
import { getCandidateErrorMessage } from '../../../shared/utils/auth/candidateError.helpers';
import FilterMenu, { type CandidateListFilterValues } from './FilterMenu';
import UploadCvModal from './Modal/UploadCvModal';
import AddCandidateModal from './Modal/AddCandidateModal';
import BulkSendSmsModal from './Modal/BulkSendSmsModal';
import BulkEmailCandidatesModal from './Modal/BulkEmailCandidatesModal';
import ChangeCandidateStatusModal, {
  type ChangeCandidateStatusMode,
} from './Modal/ChangeCandidateStatusModal';
import CandidateRecruiterNotesPanel from './Notes/CandidateRecruiterNotesPanel';
import JobListingNotesPanel from '../Notes/JobListingNotesPanel';
import CandidatesPipelineBoard from './CandidatesPipelineBoard';
import { candidateDisplayName } from './candidateDisplay';

// Rewritten against candidate-service's real `GET /candidates` (job-scoped,
// no cross-job list route exists — FRONTEND_INTEGRATION_DETAILS.md §4.3).
// Keeps the same page anatomy as the previous version of this screen (job
// summary header, search + filters + notes/upload actions, expandable
// candidate rows, checkbox multi-select with a floating bulk-action bar) —
// only the data layer and the business logic actually tied to it changed.
//
// Deliberately DROPPED, no real-backend equivalent (see
// api/candidate-service/Candidates/CandidateLifecycle.ts's / status.ts's /
// interviewRounds.ts's own module comments for the backend side of each):
// - Manual interview-invite scheduling (AI/VIDEO/IN_PERSON round types,
//   host/duration selection) — interview-service now books the next round
//   automatically once a candidate advances; there is nothing left for a
//   recruiter to configure from this screen.
// - Resume-extraction-in-progress / "resume extraction failed, retry" state
//   — real candidates are either present with whatever `resume_score` ai-
//   service has produced so far (`null` = "not scored yet", not an error)
//   or not present at all.
// - The "New" candidate badge — no per-recruiter "seen" tracking exists
//   (API_CONTRACT.md's "Known gaps").
// - ATS-candidates fetch and JD-upload duplicate-batch detection — separate,
//   job-service-owned features unrelated to candidate-service's contract;
//   left untouched elsewhere, just not part of this rewrite.

type SelectedMap = Record<string, boolean>;

const PAGE_SIZE = 20;

const buildCurrentSortKey = (sortBy: string, sortOrder: 'asc' | 'desc') =>
  sortOrder === 'desc' ? `-${sortBy}` : sortBy;

const CandidatesListing = () => {
  const navigate = useNavigate();
  const { role, callerKind } = useSelector((state: any) => state.LoginSlice, shallowEqual);
  const tenantId = useSessionTenantId();
  const effectivePermissions = useEffectivePermissions();
  const { id } = useParams<{ id: string }>();
  const parsedJobId = asJobId(id);

  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');
  const [search, setSearch] = useState('');
  const [statusCode, setStatusCode] = useState<string | undefined>();
  const [source, setSource] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<NonNullable<ListCandidatesArgs['sortBy']>>('applied_date');
  const [sortOrder, setSortOrder] = useState<NonNullable<ListCandidatesArgs['sortOrder']>>('desc');
  const [page, setPage] = useState(0);

  const [selected, setSelected] = useState<SelectedMap>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddCandidateModalOpen, setIsAddCandidateModalOpen] = useState(false);
  const [isJobNotesPanelOpen, setIsJobNotesPanelOpen] = useState(false);
  const [notesCandidate, setNotesCandidate] = useState<{ id: string; name: string } | null>(null);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);
  const [isBulkSmsOpen, setIsBulkSmsOpen] = useState(false);
  const [statusModal, setStatusModal] = useState<{
    mode: ChangeCandidateStatusMode;
    candidates: CandidateView[];
  } | null>(null);

  const { data: jobOpeningData, isLoading: isJobOpeningLoading } = useGetJobOpeningByIdQuery(
    { jobOpeningId: parsedJobId },
    { skip: !parsedJobId }
  );

  const canViewJobNotes = hasFeatureAccess('job_opening', 'view', role, effectivePermissions);
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
  const jobTypeName = candidateListJobTypes.find((t) => String(t.id) === String(jobTypeId))?.name;

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
          title="Back to Job Openings"
        >
          <span className="text-sm">Back to Job Openings</span>
        </Button>
      </div>

      <div className="flex justify-end items-center mb-2">
        <div className="flex-1 bg-white px-6 py-4 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex items-center gap-2">
                <Link to={`/jobs/view/${parsedJobId}/details`}>
                  <span className="font-bold text-xl heading-font text-primary underline cursor-pointer hover:opacity-80 transition-opacity capitalize">
                    {jobTitleName}
                  </span>
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-bold">Job ID:</p>
                <span className="text-gray-500">{jobProfileCode || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-bold">Department:</p>
                <span className="text-gray-500">{departmentName}</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-bold">Job Type:</p>
                <span className="text-gray-500">{jobTypeName}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="flex flex-col items-end gap-4 w-full lg:w-auto">
                <div className="flex flex-wrap items-center justify-end gap-4 w-full lg:w-auto">
                  <div className="inline-flex shrink-0 gap-1 rounded-lg bg-neutral-100 p-1">
                    <button
                      type="button"
                      className={clsx(
                        'rounded-md px-3 py-1.5 text-xs font-semibold transition',
                        viewMode === 'table'
                          ? 'bg-white text-primary-700 shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-700'
                      )}
                      onClick={() => setViewMode('table')}
                    >
                      Table
                    </button>
                    <button
                      type="button"
                      className={clsx(
                        'rounded-md px-3 py-1.5 text-xs font-semibold transition',
                        viewMode === 'board'
                          ? 'bg-white text-primary-700 shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-700'
                      )}
                      onClick={() => setViewMode('board')}
                    >
                      Board
                    </button>
                  </div>
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
                          ? 'Cannot upload resumes to draft job openings'
                          : isClosed
                            ? 'Cannot upload resumes to closed job openings'
                            : ''
                      }
                    >
                      <span>
                        <Button
                          className="text-white bg-primary rounded-full px-4 py-2"
                          onClick={() =>
                            !isDraft && !isClosed ? setIsUploadModalOpen(true) : null
                          }
                          disabled={isDraft || isClosed}
                        >
                          UPLOAD RESUME
                        </Button>
                      </span>
                    </Tooltip>
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
                          className="rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-primary-700 font-semibold"
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

      {viewMode === 'board' ? (
        <CandidatesPipelineBoard
          jobOpeningId={parsedJobId}
          statuses={statuses}
          search={search}
          source={source}
          sortBy={sortBy}
          sortOrder={sortOrder}
          buildDetailsPath={buildDetailsPath}
        />
      ) : (
        <div className="w-full">
          {/* Row/Col grid with fixed spans (not antd <Table>, which already
              gets scroll={{x:'max-content'}} via CustomTable elsewhere in
              the app) — overflow-x-auto + min-w keeps every column readable
              on a narrow viewport by scrolling instead of squashing them,
              same pattern used for MasterTable. */}
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="w-full p-2">
                <Row gutter={[16, 16]} className="font-bold p-4 bg-[#FFFFFF] shadow heading-font">
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
                span={5}
              >
                CANDIDATE DETAILS
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
              <COL span={4}>
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
                <div key={candidate.id} className="mb-1">
                  <div
                    className={clsx(
                      selected[candidate.id] && 'selected-candidate-highlight',
                      'hover:shadow-md'
                    )}
                    style={{
                      border: selected[candidate.id]
                        ? '2px solid var(--primary)'
                        : '2px solid transparent',
                      borderRadius: 8,
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
                        <Col span={5} className="min-w-0 overflow-hidden">
                          <div
                            className="flex items-center min-w-0 max-w-full cursor-pointer roboto-font"
                            onClick={() =>
                              setExpandedId((prev) => (prev === candidate.id ? null : candidate.id))
                            }
                          >
                            <Link
                              to={buildDetailsPath(candidate.id)}
                              className="block min-w-0 flex-1 overflow-hidden text-[var(--primary)]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="block min-w-0 truncate whitespace-nowrap font-semibold underline text-[var(--primary)] leading-5">
                                {candidateDisplayName(candidate)}
                              </span>
                            </Link>
                          </div>
                          {expandedId === candidate.id && (
                            <div className="mt-1">
                              <p>
                                <span className="font-medium roboto-font">Qualification: </span>
                                <span className="roboto-font">
                                  {candidate.qualification || 'N/A'}
                                </span>
                              </p>
                              <p>
                                <span className="font-medium roboto-font">Email: </span>
                                <span className="roboto-font">{candidate.email_id || 'N/A'}</span>
                              </p>
                              <p>
                                <span className="font-medium roboto-font">Phone Number: </span>
                                <span className="roboto-font">{candidate.contact_no || 'N/A'}</span>
                              </p>
                              <p>
                                <span className="font-medium roboto-font">Location: </span>
                                <span className="roboto-font">{candidate.address || 'N/A'}</span>
                              </p>
                              <p>
                                <span className="font-medium roboto-font">Source: </span>
                                <span className="roboto-font">{candidate.source || 'N/A'}</span>
                              </p>
                            </div>
                          )}
                        </Col>
                        <Col span={4}>
                          <p className="roboto-font">
                            {candidate.resume_score === null ? '—' : candidate.resume_score}
                          </p>
                        </Col>
                        <Col span={4}>
                          <p className="roboto-font">
                            {dayjs(candidate.applied_date).isValid()
                              ? dayjs(candidate.applied_date).format('MMM DD, YYYY')
                              : 'N/A'}
                          </p>
                        </Col>
                        <Col span={4}>
                          <Link
                            to={buildDetailsPath(candidate.id)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <p
                              className={
                                !candidate.status_code ? 'cursor-pointer font-semibold' : undefined
                              }
                              style={{
                                color: !candidate.status_code ? 'var(--warning-solid)' : undefined,
                              }}
                            >
                              {candidate.status_label ||
                                statusLabelByCode.get(candidate.status_code ?? '') ||
                                'Not yet screened'}
                            </p>
                          </Link>
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
                    </CommonCard>
                  </div>
                </div>
              ))
            ) : (
              <p>No candidates found for this job opening.</p>
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
      )}

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
                  <Button
                    className="flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 cursor-pointer hover:bg-neutral-100 text-sm h-8 bg-white text-gray-900"
                    onClick={() => setIsBulkSmsOpen(true)}
                  >
                    <LuMessageSquare size={16} /> SMS
                  </Button>
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
      <BulkSendSmsModal
        open={isBulkSmsOpen}
        onClose={() => setIsBulkSmsOpen(false)}
        candidates={selectedCandidates}
      />
      <JobListingNotesPanel
        open={isJobNotesPanelOpen}
        onClose={() => setIsJobNotesPanelOpen(false)}
        jobTitle={jobTitleName}
        jobOpeningId={parsedJobId}
      />
      <CandidateRecruiterNotesPanel
        open={Boolean(notesCandidate)}
        onClose={() => setNotesCandidate(null)}
        title={`Candidate Notes - ${notesCandidate?.name || ''}`.trim()}
        candidateId={notesCandidate?.id}
      />
      <UploadCvModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} />
      <AddCandidateModal
        open={isAddCandidateModalOpen}
        onClose={() => setIsAddCandidateModalOpen(false)}
      />
    </div>
  );
};

export default CandidatesListing;
