import { useEffect, useState } from 'react';
import {
  useNavigate,
  useParams,
  // useLocation,
  Link,
  useSearchParams,
} from 'react-router-dom';
import { ELIGIBLE_FOR_ADVANCE_STATUS } from '../../../constants/candidateFilterStatus';
import { DownloadOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { Col, Row, Tooltip, Spin, Checkbox, Modal } from 'antd';
import { CommonCard } from '../../shared/ui/card';
import MasterPagination from '../../shared/ui/MasterPagination';
import {
  useGetAllCandidatesQuery,
  useFetchAllAtsCandidatesQuery,
  useRefreshResumeMutation,
  useLazyGetAllCandidatesQuery,
  useScheduleInterviewMutation,
  useLazyDownloadBatchErrorFileQuery,
  useBulkScheduleInterviewMutation,
} from '../../../api/candidate-service/Candidates/Candidates';
import { useGetJobOpeningNotesQuery } from '../../../api/job-service/JobOpening/JobOpeningNotes';
import { Search } from '../../shared/ui/search';
import { Loader } from '../../shared/ui/loader';
import { useGetJobOpeningByIdQuery } from '../../../api/job-service/JobOpening/GetJobOpeningById';
import { Button } from '../../shared/ui/button';
import FilterMenu from './FilterMenu';
import {
  LuMail,
  LuMessageSquare,
  LuRefreshCw,
  LuSquarePen,
  LuThumbsDown,
  LuThumbsUp,
  // LuUserRoundCheck
} from 'react-icons/lu';
import { useSelector, shallowEqual } from 'react-redux';
import {
  useGetJobBatchesQuery,
  useAcknowledgeBatchMutation,
  parseDuplicatesJson,
} from '../../../api/job-service/Batches/index';
// import { CandidateByIdResponse, SortDirection } from '../../../types';
import { COL } from '../../shared/ui/Columns';
import { showToast } from '../../shared';
import { get } from 'lodash-es';
import clsx from 'clsx';

import { hasFeatureAccess } from '../../../shared/utils/auth/getAccess';
import { MdClose, MdEdit, MdOutlineRemoveRedEye } from 'react-icons/md';
import { useCandidateFilters } from '../../../hooks/useCandidateFilter';
import useEventSource from '../../../hooks/useEventSource';
import dayjs from 'dayjs';
import { FaEnvelope } from 'react-icons/fa';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import renderHighlightedField from '../../shared/ui/RenderHighlightedField';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';
import CandidateStatus from './CandidateStatus';
import ScheduleInterviewModal from './Modal/ScheduleInterviewModal';
import { StatusModalType } from '../../../shared/utils/enums';
import {
  formatPhoneNumber,
  formatRoundLabel,
  getDisplayRoundNumber,
  getModalContent,
  resolveRoundSequenceByRound,
} from '../../../shared/utils/methods';
import { IoArrowRedoOutline } from 'react-icons/io5';
import DuplicateCandidateModal from './DuplicateCandidateModal';
import type {
  BulkScheduleInterviewResult,
  DuplicateCandidate,
  InterviewRoundResponseDTO,
} from '../../../types';
import JobListingNotesPanel from '../Notes/JobListingNotesPanel';
import CandidateNotesPanel from './Notes/CandidateNotesPanel';
import SendEmailToCandidateModal from './Modal/SendEmailToCandidateModal';
import BulkSendSmsModal from './Modal/BulkSendSmsModal';
import UploadCvModal from './Modal/UploadCvModal';

type SelectedCandidates = {
  [key: string]: boolean;
};

const CandidatesListing = () => {
  const navigate = useNavigate();
  const { role } = useSelector((state: any) => state.LoginSlice, shallowEqual);
  const { id } = useParams<{ id: string }>();
  // const pathname = useLocation().pathname;
  const [
    searchParams,
    // setSearchParams
  ] = useSearchParams();
  const parsedJobId = Number(id);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // sessionStorage key scoped to this job — persists active batchId across navigations
  const batchStorageKey = `cfp_batch_${parsedJobId}`;

  const [batchId, setBatchId] = useState<string | null>(() => {
    // Restore in-flight batchId so the SSE stream resumes if user navigated away mid-processing
    return sessionStorage.getItem(batchStorageKey) ?? null;
  });

  // API is the source of truth for unacknowledged duplicate batches.
  // Queried on mount (covers navigate-back) and refetched after BATCH_COMPLETED.
  const { data: batchesData, refetch: refetchBatches } = useGetJobBatchesQuery(
    { jobId: parsedJobId },
    { skip: !parsedJobId }
  );
  const [acknowledgeBatch, { isLoading: isAcknowledging }] = useAcknowledgeBatchMutation();
  const [isJobNotesPanelOpen, setIsJobNotesPanelOpen] = useState(false);

  // Unacknowledged duplicate batches — drives the modal
  const unacknowledgedBatches = (batchesData?.data ?? []).filter(
    (b) => b.status === 'DUPLICATE' && b.acknowledgement == null
  );
  const pendingDuplicates = unacknowledgedBatches.flatMap((b) =>
    parseDuplicatesJson(b.duplicatesJson)
  );

  const [collapsedUsers, setCollapsedUsers] = useState<string[]>([]);
  const [refreshResume, { isLoading: isResumeLoading }] = useRefreshResumeMutation();
  // const [dropdownVisible, setDropdownVisible] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [notesCandidate, setNotesCandidate] = useState<{ id: number; name: string } | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [selectedInviteRound, setSelectedInviteRound] = useState<InterviewRoundResponseDTO | null>(
    null
  );
  const [selectedCandidates, setSelectedCandidates] = useState<SelectedCandidates>({});
  const [selectAll, setSelectAll] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; subtitle: React.ReactNode }>({
    title: '',
    subtitle: '',
  });
  const [selectedModalStatus, setSelectedModalStatus] = useState<StatusModalType>(
    StatusModalType.SELECTED
  );
  const [selectedCandidatesForModal, setSelectedCandidatesForModal] = useState<any[]>([]);
  const [isBulkSendEmailOpen, setIsBulkSendEmailOpen] = useState(false);
  const [bulkEmailCandidate, setBulkEmailCandidate] = useState<any>(null);
  const [bulkEmailCandidates, setBulkEmailCandidates] = useState<any[]>([]);
  const [bulkEmailRecipientList, setBulkEmailRecipientList] = useState<string[]>([]);
  const [bulkEmailCandidateIds, setBulkEmailCandidateIds] = useState<number[]>([]);
  const [isBulkSendSmsOpen, setIsBulkSendSmsOpen] = useState(false);
  const [bulkSmsCandidates, setBulkSmsCandidates] = useState<any[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isScheduleFailureModalOpen, setIsScheduleFailureModalOpen] = useState(false);
  const [scheduleInviteFailures, setScheduleInviteFailures] = useState<
    BulkScheduleInterviewResult[]
  >([]);
  const [interviewRecordForSchedule, setInterviewRecordForSchedule] =
    useState<InterviewRoundResponseDTO | null>(null);
  const [interviewerData, setInterviewerData] = useState<{
    interviewerName: string[];
    interviewerIds?: string[];
    interviewSlotDuration?: number;
    interviewLocation?: string;
  }>({
    interviewerName: [],
    interviewerIds: [],
    interviewSlotDuration: 15,
    interviewLocation: '',
  });

  const { filters, updateFilters, handleSort, handlePageChange, handleSearch, currentSortKey } =
    useCandidateFilters({});
  // const handleCandidateFilterChange = () => {
  //   updateFilters({
  //     ...filters,
  //     statusId: candidateFilter.statusId,
  //     source: candidateFilter.source,
  //     page: 0
  //   })
  // }
  const generateSearchParams = (additionalParams?: Record<string, string>) => {
    const params: Record<string, string> = {
      page: (filters.page + 1).toString(),
      size: filters.size.toString(),
      ...(filters.searchQuery && { searchQuery: filters.searchQuery }),
      ...(filters.internalStatus && { internalStatus: filters.internalStatus }),
      ...(filters.externalStatus && !filters.isNew && { externalStatus: filters.externalStatus }),
      ...(filters.isNew !== undefined && { isNew: String(filters.isNew) }),
      ...(filters.roundType && { roundType: filters.roundType }),
      ...(filters.source && { source: filters.source }),
      ...(filters.sortBy && { sortBy: filters.sortBy }),
      ...(filters.sortDir && { sortDir: filters.sortDir }),
      ...additionalParams,
    };

    return new URLSearchParams(params);
  };
  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    updateFilters({
      ...filters,
      ...newFilters,
      page: 0,
    });
  };
  // const handleCandidateFilterClear = () => {
  //   updateFilters({
  //     ...filters,
  //     statusId: null,
  //     source: null,
  //     externalStatus: null,
  //     searchQuery: '',
  //     page: 0,
  //     sortBy: undefined,
  //     sortDir: undefined,
  //   })
  // }

  // Fetch job opening details to get atsJobOpeningId
  const {
    data: jobOpeningData,
    isLoading: isJobOpeningLoading,
    // error: jobOpeningError,
  } = useGetJobOpeningByIdQuery({ jobOpeningId: parsedJobId });

  const isDraft = jobOpeningData?.data?.isDraft || false;
  const isClosed = jobOpeningData?.data?.isClosed || false;
  const canViewJobNotes = hasFeatureAccess('job_opening', 'view', role);

  // Extract atsJobOpeningId from jobOpeningData
  const atsJobOpeningId =
    jobOpeningData?.data?.atsJobOpeningId && jobOpeningData.data.atsJobOpeningId !== 'null'
      ? jobOpeningData.data.atsJobOpeningId
      : '';

  // Use atsJobOpeningId for ATS candidates API
  const {
    data: atsCandidatesData,
    isLoading: isAtsLoading,
    error: atsError,
    refetch: refetchAts,
  } = useFetchAllAtsCandidatesQuery({ atsJobOpeningId }, { skip: !atsJobOpeningId });
  console.log('ATS Candidates Data:', atsCandidatesData, isAtsLoading, 'Error:', atsError);

  const { data: jobNotes = [] } = useGetJobOpeningNotesQuery(parsedJobId, {
    skip: !parsedJobId || !canViewJobNotes,
  });

  const { data, isLoading, error, refetch } = useGetAllCandidatesQuery(
    {
      jobOpeningId: parsedJobId,
      page: filters.page,
      size: filters.size,
      text: filters.searchQuery || undefined,
      sortBy: filters.sortBy,
      sortDir: filters.sortDir ?? undefined,
      source: filters.source || undefined,
      externalStatus:
        filters.isNew || filters.externalStatus === 'ALL'
          ? undefined
          : filters.externalStatus || undefined,
      ...(filters.internalStatus && { internalStatus: filters.internalStatus }),
      ...(filters.roundType && { roundType: filters.roundType }),
      ...(filters.isNew !== undefined && { isNew: filters.isNew }),
    },
    { refetchOnMountOrArgChange: true }
  );

  const [triggerGetAllCandidates] = useLazyGetAllCandidatesQuery();
  const [scheduleInterview, { isLoading: isScheduleLoading }] = useScheduleInterviewMutation();
  const [bulkScheduleInterview] = useBulkScheduleInterviewMutation();
  const [downloadBatchErrorFile, { isLoading: isErrorFileLoading }] =
    useLazyDownloadBatchErrorFileQuery();

  const { data: { jobProfileCode, jobTitle = [], department = [], jobType = [] } = {} } =
    jobOpeningData || {};

  const canInviteCandidate =
    hasFeatureAccess('job_opening', 'edit', role) ||
    hasFeatureAccess('job_opening', 'create', role);

  const jobTitleName = jobTitle[0]?.jobTypeName;
  const departmentName = department[0]?.departmentName;
  const jobTypeName = jobType[0]?.jobTypeName;

  const isCandidateDisabled = (candidate: any): boolean => {
    if (!candidate.isResumeExtracted) return true;
    if (candidate.resumeProcessFailed) return true;
    const status = candidate.status?.toUpperCase() || '';
    return status.includes('SELECTED') || status.includes('NOT_SELECTED');
  };

  const handleCandidateSelect = (candidateId: string) => {
    setSelectedCandidates((prev) => {
      const newSelected = {
        ...prev,
        [candidateId]: !prev[candidateId],
      };
      const allCandidateIds = data?.data?.map((c: any) => c.id.toString()) || [];
      const allSelected =
        allCandidateIds.length > 0 && allCandidateIds.every((id) => newSelected[id]);

      setSelectAll(allSelected);

      return newSelected;
    });
  };

  const handleBulkActionClick = (statusType: StatusModalType) => {
    const selectedCandidateIds = getSelectedCandidateIds();

    if (selectedCandidateIds.length === 0) {
      showToast({
        message: 'Please select at least one candidate',
        type: 'warning',
      });
      return;
    }

    const selectedCandidatesList =
      data?.data.filter((c: any) => selectedCandidateIds.includes(c.id.toString())) || [];

    // No longer blocking modal opening for advance status here.
    // CandidateStatus handles ineligible candidates.

    setSelectedCandidatesForModal(selectedCandidatesList);
    setSelectedModalStatus(statusType);

    const content = getModalContent(statusType, {
      candidateName:
        selectedCandidatesList.length === 1
          ? `${selectedCandidatesList[0].firstName || ''} ${selectedCandidatesList[0].lastName || ''}`.trim()
          : undefined,
      currentRound:
        selectedCandidatesList.length === 1
          ? isResumeReviewAwaited(selectedCandidatesList[0])
            ? 'Resume Screening'
            : getCurrentRoundName(selectedCandidatesList[0])
          : undefined,
      nextRound:
        selectedCandidatesList.length === 1
          ? getNextRoundName(selectedCandidatesList[0])
          : undefined,
      isBulkAction: selectedCandidateIds.length > 1,
      count: selectedCandidateIds.length,
    });

    setModalContent(content);
    setIsModalOpen(true);
  };
  const handleStatusUpdateSuccess = () => {
    setIsModalOpen(false);
    setSelectedCandidates({});
    setSelectAll(false);
    refetch();
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);

    if (newSelectAll && data?.data) {
      const allSelected: SelectedCandidates = {};
      data.data.forEach((candidate: any) => {
        if (!isCandidateDisabled(candidate)) {
          allSelected[candidate.id.toString()] = true;
        }
      });
      setSelectedCandidates(allSelected);
    } else {
      setSelectedCandidates({});
    }
  };

  const getSelectedCandidateIds = (): string[] => {
    return Object.keys(selectedCandidates).filter((id) => selectedCandidates[id]);
  };

  const normalizeStatus = (value?: string): string =>
    (value || '').trim().toUpperCase().replace(/[\s-]/g, '_');

  const isRoundMarkedSkipped = (round: any): boolean => {
    const status = normalizeStatus(round?.interviewStatus);
    return status === 'SKIPPED' || Boolean(String(round?.skipReason || '').trim());
  };

  const isRoundCompleted = (round: any): boolean => {
    const status = normalizeStatus(round?.interviewStatus);
    return status === 'COMPLETED';
  };

  const isCandidateTerminalForInvite = (candidate: any): boolean => {
    const terminalStates = new Set(['NOT_SELECTED', 'REJECTED', 'WITHDRAWN', 'SELECTED', 'HIRED']);
    return terminalStates.has(normalizeStatus(candidate?.status));
  };

  const resolveCurrentRoundFromDetails = (candidate: any): InterviewRoundResponseDTO | null => {
    const interviewRounds = candidate?.interviewRounds || [];
    const currentRoundId = Number(candidate?.nextRoundDetails?.currentRound?.id);

    if (Number.isFinite(currentRoundId) && currentRoundId > 0) {
      const currentRound = interviewRounds.find(
        (round: any) => Number(round?.id) === currentRoundId
      );
      if (currentRound) {
        return currentRound;
      }
    }

    return null;
  };

  const getNextPendingRound = (candidate: any): InterviewRoundResponseDTO | null => {
    const interviewRounds = candidate?.interviewRounds || [];
    const nextRoundDetails = candidate?.nextRoundDetails?.nextRound;
    const nextRoundId = Number(nextRoundDetails?.id);
    const nextRoundSequence = Number(nextRoundDetails?.sequence);
    const nextRoundName = String(nextRoundDetails?.round?.name || '').trim();

    const explicitNextRound = interviewRounds.find((round: any) => {
      const normalizedStatus = normalizeStatus(round?.interviewStatus);
      const isPending = !round?.interviewStatus || normalizedStatus === 'NOT_SCHEDULED';
      if (!isPending) return false;

      if (Number.isFinite(nextRoundId) && nextRoundId > 0) {
        return Number(round?.id) === nextRoundId;
      }

      if (Number.isFinite(nextRoundSequence) && nextRoundSequence > 0) {
        return Number(round?.sequence) === nextRoundSequence;
      }

      if (nextRoundName) {
        return String(round?.round?.name || '').trim() === nextRoundName;
      }

      return false;
    });

    if (explicitNextRound) {
      return explicitNextRound;
    }

    const pendingRound = interviewRounds.find((round: any) => {
      const normalizedStatus = normalizeStatus(round?.interviewStatus);
      return !round?.interviewStatus || normalizedStatus === 'NOT_SCHEDULED';
    });

    return pendingRound || null;
  };

  const isDecisionPendingState = (candidate: any): boolean => {
    const candidateStatus = (candidate?.status || '').toUpperCase();
    if (candidateStatus === 'DECISION_PENDING') {
      return true;
    }

    const nextRoundName = getNextRoundName(candidate);
    // Use includes() because formatRoundLabel may append " - Round N"
    return (nextRoundName || '').toUpperCase().includes('DECISION PENDING');
  };

  const getSingleAdvanceCandidate = () => {
    if (
      selectedModalStatus !== StatusModalType.ADVANCE ||
      selectedCandidatesForModal.length !== 1
    ) {
      return null;
    }
    return selectedCandidatesForModal[0];
  };

  const getAdvanceInviteCheckboxLabel = () => {
    // Bulk advance: derive next round name from first resume-screening candidate
    if (selectedCandidatesForModal.length > 1) {
      const firstCandidate = getResumeScreeningCandidatesInBulkAdvance()[0];
      const nextRoundName = firstCandidate
        ? getNextRoundName(firstCandidate) || 'AI Audio Screening'
        : 'AI Audio Screening';
      return (
        <>
          Send interview invite over email and SMS for <strong>{nextRoundName}</strong>
        </>
      );
    }
    // Single candidate advance
    const candidate = getSingleAdvanceCandidate();
    if (!candidate) return 'Send interview invite over email and SMS for next round';
    const nextRoundName = getNextRoundName(candidate) || 'next round';
    return (
      <>
        Send interview invite over email and SMS for <strong>{nextRoundName}</strong>
      </>
    );
  };

  const resetInterviewerData = () => {
    setInterviewerData({
      interviewerName: [],
      interviewerIds: [],
      interviewSlotDuration: 15,
      interviewLocation: '',
    });
  };

  const selectedCount = getSelectedCandidateIds().length;

  const handleFloatingBarEmailClick = () => {
    const selectedCandidateIds = getSelectedCandidateIds();
    const list =
      data?.data.filter((c: any) => selectedCandidateIds.includes(c.id.toString())) || [];
    const emails = list.map((c: any) => (c.email ?? '').trim()).filter(Boolean);
    if (emails.length === 0) {
      showToast({
        message: 'No email address on file for the selected candidate(s)',
        type: 'warning',
      });
      return;
    }
    setBulkEmailCandidate(list[0]);
    setBulkEmailCandidates(list);
    setBulkEmailRecipientList(emails);
    setBulkEmailCandidateIds(list.map((c: any) => Number(c.id)));
    setIsBulkSendEmailOpen(true);
  };

  const handleFloatingBarSmsClick = () => {
    const selectedCandidateIds = getSelectedCandidateIds();
    const list =
      data?.data.filter((c: any) => selectedCandidateIds.includes(c.id.toString())) || [];
    if (list.length === 0) return;
    setBulkSmsCandidates(list);
    setIsBulkSendSmsOpen(true);
  };

  const handleCloseBulkEmailModal = () => {
    setIsBulkSendEmailOpen(false);
    setBulkEmailCandidate(null);
    setBulkEmailCandidates([]);
    setBulkEmailRecipientList([]);
    setBulkEmailCandidateIds([]);
  };

  const handleCloseBulkSmsModal = () => {
    setIsBulkSendSmsOpen(false);
    setBulkSmsCandidates([]);
  };

  useEffect(() => {
    setSelectedCandidates({});
    setSelectAll(false);
  }, [
    filters.page,
    filters.internalStatus,
    filters.source,
    filters.externalStatus,
    filters.searchQuery,
  ]);

  const toggleCollapse = (key: string) => {
    setCollapsedUsers((prev) =>
      prev.includes(key) ? prev.filter((candidateId) => candidateId !== key) : [...prev, key]
    );
  };

  // helper: check whether any candidate field contains the search term (safe for nulls)
  const candidateContainsSearch = (candidate: any, searchTerm: string) => {
    if (!searchTerm) return false;
    const term = searchTerm.toLowerCase();
    const fieldsToCheck = [
      'firstName',
      'lastName',
      'currentJobTitle',
      'education',
      'linkedInProfile',
      'address',
      'email',
      'phoneNumber',
    ];
    return fieldsToCheck.some((key) => {
      const val = candidate?.[key];
      return val != null && String(val).toLowerCase().includes(term);
    });
  };

  const handleResumeRefresh = (candidateId: number) => {
    refreshResume({ candidateId })
      .unwrap()
      .then((res) => {
        showToast({
          message: get(res, 'message', 'Resume has been refreshed successfully.'),
          type: 'success',
        });
        refetch();
      })
      .catch((res) => {
        showToast({
          message: get(res, 'message', 'Resume extraction failed. Please try again.'),
          type: 'error',
        });
      });
  };

  const handleCloseInviteModal = () => {
    setIsInviteModalOpen(false);
    setSelectedInviteRound(null);
    setSelectedCandidate(null);
  };

  const getCurrentRoundName = (candidateRecord: any): string | undefined => {
    const candidateRounds = candidateRecord?.interviewRounds || [];
    const directRoundName = candidateRecord?.nextRoundDetails?.currentRound?.round?.name;
    const directRoundSequence = Number(candidateRecord?.nextRoundDetails?.currentRound?.sequence);
    if (directRoundName) {
      return formatRoundLabel(
        directRoundName,
        getDisplayRoundNumber(
          candidateRounds,
          Number.isFinite(directRoundSequence) && directRoundSequence > 0
            ? directRoundSequence
            : undefined
        )
      );
    }

    const currentRoundId = candidateRecord?.nextRoundDetails?.currentRound?.id;
    if (currentRoundId) {
      const mappedRound = candidateRecord?.interviewRounds?.find(
        (round: any) => round?.id === currentRoundId
      );
      const mappedRoundName = mappedRound?.round?.name;
      const mappedRoundSequence = Number(mappedRound?.sequence);
      if (mappedRoundName) {
        return formatRoundLabel(
          mappedRoundName,
          getDisplayRoundNumber(
            candidateRounds,
            Number.isFinite(mappedRoundSequence) && mappedRoundSequence > 0
              ? mappedRoundSequence
              : undefined
          )
        );
      }
    }

    const latestRound =
      candidateRecord?.interviewRounds?.[candidateRecord?.interviewRounds?.length - 1];
    const latestSequence = Number(latestRound?.sequence);
    return formatRoundLabel(
      latestRound?.round?.name,
      getDisplayRoundNumber(
        candidateRounds,
        Number.isFinite(latestSequence) && latestSequence > 0 ? latestSequence : undefined
      )
    );
  };

  const getNextRoundName = (candidateRecord: any): string | undefined => {
    const candidateRounds = candidateRecord?.interviewRounds || [];
    const nextRoundName = candidateRecord?.nextRoundDetails?.nextRound?.round?.name;
    if (!nextRoundName) return undefined;

    // Use the sequence from nextRoundDetails.nextRound first — it is the most
    // authoritative source and correctly identifies the specific next round even
    // when multiple rounds share the same round-type ID (e.g. multiple In-person rounds).
    const directNextSequence = Number(candidateRecord?.nextRoundDetails?.nextRound?.sequence);
    if (Number.isFinite(directNextSequence) && directNextSequence > 0) {
      return formatRoundLabel(
        nextRoundName,
        getDisplayRoundNumber(candidateRounds, directNextSequence)
      );
    }

    // Fallback: resolve by round-type ID (may be inaccurate when round types repeat)
    const nextRoundId = candidateRecord?.nextRoundDetails?.nextRound?.round?.id;
    const matchedNextSequence = resolveRoundSequenceByRound(
      candidateRounds,
      nextRoundId,
      nextRoundName
    );
    if (matchedNextSequence) {
      return formatRoundLabel(
        nextRoundName,
        getDisplayRoundNumber(candidateRounds, matchedNextSequence)
      );
    }

    const currentRoundId = candidateRecord?.nextRoundDetails?.currentRound?.id;
    if (currentRoundId) {
      const mappedCurrentRound = candidateRecord?.interviewRounds?.find(
        (round: any) => round?.id === currentRoundId
      );
      const mappedCurrentSequence = Number(mappedCurrentRound?.sequence);
      if (Number.isFinite(mappedCurrentSequence) && mappedCurrentSequence > 0) {
        const currentDisplayNumber = getDisplayRoundNumber(candidateRounds, mappedCurrentSequence);
        return formatRoundLabel(nextRoundName, currentDisplayNumber ? currentDisplayNumber + 1 : 1);
      }
    }

    const latestSequence = Number(
      candidateRecord?.interviewRounds?.[candidateRecord?.interviewRounds?.length - 1]?.sequence
    );
    const latestDisplayNumber = getDisplayRoundNumber(
      candidateRounds,
      Number.isFinite(latestSequence) && latestSequence > 0 ? latestSequence : undefined
    );
    return formatRoundLabel(nextRoundName, latestDisplayNumber ? latestDisplayNumber + 1 : 1);
  };

  const isResumeReviewAwaited = (candidateRecord: any): boolean => {
    const normalizeStatus = (status?: string): string =>
      (status || '').replace(/[-_]/g, ' ').trim().toUpperCase();

    return [
      normalizeStatus(candidateRecord?.interviewStatus),
      normalizeStatus(candidateRecord?.resumeStatus),
    ].includes('RESUME REVIEW AWAITED');
  };

  const handleCandidatesUpdateInModal = (remainingCount: number) => {
    const content = getModalContent(selectedModalStatus, {
      candidateName:
        remainingCount === 1
          ? `${selectedCandidatesForModal[0]?.firstName || ''} ${selectedCandidatesForModal[0]?.lastName || ''}`.trim()
          : undefined,
      currentRound:
        remainingCount === 1
          ? isResumeReviewAwaited(selectedCandidatesForModal[0])
            ? 'Resume Screening'
            : getCurrentRoundName(selectedCandidatesForModal[0])
          : undefined,
      nextRound: remainingCount === 1 ? getNextRoundName(selectedCandidatesForModal[0]) : undefined,
      isBulkAction: remainingCount > 1,
      count: remainingCount,
    });

    setModalContent(content);
  };

  const getInviteActionState = (candidate: any) => {
    const interviewRounds = (candidate?.interviewRounds || []) as InterviewRoundResponseDTO[];

    if (!parsedJobId || !Number.isFinite(parsedJobId)) {
      return {
        shouldShow: false,
        isDisabled: true,
        tooltip: 'Send Invite',
        inviteRound: null,
      };
    }

    if (!interviewRounds.length || isCandidateTerminalForInvite(candidate)) {
      return {
        shouldShow: false,
        isDisabled: true,
        tooltip: 'Send Invite',
        inviteRound: null,
      };
    }

    let inviteRound = resolveCurrentRoundFromDetails(candidate) || getNextPendingRound(candidate);

    if (!inviteRound) {
      return {
        shouldShow: false,
        isDisabled: true,
        tooltip: 'Send Invite',
        inviteRound: null,
      };
    }

    const findNextSchedulableRound = (rounds: any[], startIndex: number) => {
      for (let i = startIndex; i < rounds.length; i++) {
        const round = rounds[i];
        const roundStatus = normalizeStatus(round?.interviewStatus);
        if (
          roundStatus === 'INVITATION_SENT' ||
          roundStatus === 'BOOKING_CREATED' ||
          roundStatus === 'BOOKING_CONFIRMED' ||
          roundStatus === 'COMPLETED'
        ) {
          continue;
        }
        if (roundStatus === 'NOT_SCHEDULED' || !roundStatus) {
          return round;
        }
        if (roundStatus === 'SKIPPED') {
          continue;
        }
      }
      return null;
    };

    const sortedRounds = [...interviewRounds].sort(
      (a, b) => Number(a?.sequence || 0) - Number(b?.sequence || 0)
    );

    const currentRoundIndex = sortedRounds.findIndex(
      (round) => Number(round?.id) === Number(inviteRound?.id)
    );

    const currentRoundStatus = normalizeStatus(inviteRound?.interviewStatus);

    if (currentRoundStatus === 'SKIPPED') {
      const nextSchedulableRound = findNextSchedulableRound(sortedRounds, currentRoundIndex + 1);
      if (nextSchedulableRound) {
        inviteRound = nextSchedulableRound;
        console.log('Found next schedulable round after skipped round:', inviteRound);
      } else {
        return {
          shouldShow: false,
          isDisabled: true,
          tooltip: 'No more rounds to schedule',
          inviteRound: null,
        };
      }
    }

    if (inviteRound && inviteRound.roundType === 'AI' && currentRoundStatus === 'COMPLETED') {
      const nextSchedulableRound = findNextSchedulableRound(sortedRounds, currentRoundIndex + 1);
      if (nextSchedulableRound) {
        inviteRound = nextSchedulableRound;
        console.log('AI round completed, moving to next round:', inviteRound);
      }
    }

    const resolvedRoundStatus = normalizeStatus(inviteRound?.interviewStatus);
    const roundType = inviteRound?.roundType;

    // --- AI ROUND LOGIC ---
    if (roundType === 'AI') {
      // If resumeStatus is 'REVIEW_AWAITED' or 'PENDING', disable invite icon
      const resumeStatus = (candidate?.resumeStatus || '').toUpperCase();
      if (resumeStatus === 'REVIEW_AWAITED' || resumeStatus === 'PENDING') {
        return {
          shouldShow: true,
          isDisabled: true,
          tooltip: 'Resume review awaiting',
          inviteRound,
        };
      }

      // If invite already sent, show as disabled
      if (resolvedRoundStatus === 'INVITATION_SENT' || resolvedRoundStatus === 'BOOKING_CREATED') {
        return {
          shouldShow: true,
          isDisabled: true,
          tooltip: 'Invite Sent',
          inviteRound,
        };
      }

      // If booking was cancelled, allow resend
      if (resolvedRoundStatus === 'BOOKING_CANCELLED') {
        return {
          shouldShow: true,
          isDisabled: false,
          tooltip: 'Resend Invite',
          inviteRound,
        };
      }

      // If not scheduled, allow invite
      if (!resolvedRoundStatus || resolvedRoundStatus === 'NOT_SCHEDULED') {
        return {
          shouldShow: true,
          isDisabled: false,
          tooltip: 'Send Invite',
          inviteRound,
        };
      }

      // Otherwise, default to disabled
      return {
        shouldShow: true,
        isDisabled: true,
        tooltip: 'Invite not available',
        inviteRound,
      };
    }

    // --- VIDEO and IN_PERSON ROUNDS LOGIC ---
    // Check if previous rounds are completed or skipped
    const previousRounds = sortedRounds.slice(
      0,
      sortedRounds.findIndex((round) => Number(round?.id) === Number(inviteRound?.id))
    );

    // All previous rounds must be either COMPLETED or SKIPPED
    const allPreviousRoundsProcessed = previousRounds.every((round) => {
      const status = normalizeStatus(round?.interviewStatus);
      return (
        status === 'COMPLETED' ||
        status === 'SKIPPED' ||
        status === 'ADVANCED' ||
        status === 'SELECTED'
      );
    });

    if (!allPreviousRoundsProcessed) {
      return {
        shouldShow: false,
        isDisabled: true,
        tooltip: 'Previous rounds not completed/skipped/advanced',
        inviteRound,
      };
    }

    // Now check the current round status
    if (resolvedRoundStatus === 'INVITATION_SENT' || resolvedRoundStatus === 'BOOKING_CREATED') {
      return {
        shouldShow: true,
        isDisabled: true,
        tooltip: 'Invite Sent',
        inviteRound,
      };
    }

    if (resolvedRoundStatus === 'BOOKING_CANCELLED') {
      return {
        shouldShow: true,
        isDisabled: false,
        tooltip: 'Resend Invite',
        inviteRound,
      };
    }

    if (!resolvedRoundStatus || resolvedRoundStatus === 'NOT_SCHEDULED') {
      return {
        shouldShow: true,
        isDisabled: false,
        tooltip: 'Send Invite',
        inviteRound,
      };
    }

    return {
      shouldShow: false,
      isDisabled: true,
      tooltip: 'Invite not available',
      inviteRound,
    };
  };

  const tooltipTitleForInvite = (candidate: any) => {
    const inviteState = getInviteActionState(candidate);
    return inviteState.tooltip;
  };

  const handleOpenInviteAction = (candidate: any) => {
    const inviteState = getInviteActionState(candidate);
    if (!inviteState.shouldShow || inviteState.isDisabled || !inviteState.inviteRound) {
      return;
    }

    const roundType = inviteState.inviteRound.roundType;
    if (roundType === 'AI') {
      setSelectedCandidate(candidate);
      setSelectedInviteRound(inviteState.inviteRound);
      setIsInviteModalOpen(true);
      return;
    }

    if (roundType === 'VIDEO' || roundType === 'IN_PERSON') {
      setInterviewRecordForSchedule({
        ...inviteState.inviteRound,
        firstName: candidate?.firstName,
        lastName: candidate?.lastName,
        jobId: Number(inviteState.inviteRound?.jobId || parsedJobId),
        candidateId: Number(candidate?.id),
      });
      resetInterviewerData();
      setShowScheduleModal(true);
    }
  };

  const handleScheduleInvite = async () => {
    if (selectedInviteRound?.roundType === 'AI') {
      const payload = {
        candidateId: Number(selectedCandidate?.id),
        jobId: Number(parsedJobId),
        interviewRoundId: Number(selectedInviteRound?.id),
        videoInterviewScheduleRequestDto: {},
        lengthInMinutes: '',
      };

      scheduleInterview(payload)
        .unwrap()
        .then((res) => {
          if (res?.success) {
            showToast({
              message: get(res, 'message'),
              type: 'success',
            });
            setIsInviteModalOpen(false);
            setSelectedInviteRound(null);
            setSelectedCandidate(null);
            refetch();
          } else {
            showToast({
              message: get(res, 'message'),
              type: 'error',
            });
          }
        })
        .catch((error) => {
          showToast({
            message: get(error, 'data.message'),
            type: 'error',
          });
        });
    }
  };

  const handleAdvanceInviteRequested = async (): Promise<void> => {
    const candidate = getSingleAdvanceCandidate();
    if (!candidate || isDecisionPendingState(candidate)) {
      return;
    }

    const nextPendingRound = getNextPendingRound(candidate);
    if (!nextPendingRound) {
      showToast({
        message: 'Candidate advanced, but no schedulable next round was found.',
        type: 'warning',
      });
      return;
    }

    const roundType = nextPendingRound?.roundType;
    if (roundType === 'AI') {
      const payload = {
        candidateId: Number(candidate?.id),
        jobId: Number(parsedJobId),
        interviewRoundId: Number(nextPendingRound?.id),
        videoInterviewScheduleRequestDto: {},
        lengthInMinutes: '',
      };

      await scheduleInterview(payload)
        .unwrap()
        .then((res) => {
          if (res?.success) {
            showToast({
              message: get(res, 'message', 'Interview invite sent successfully'),
              type: 'success',
            });
            refetch();
          } else {
            showToast({
              message: get(res, 'message', 'Failed to send interview invite'),
              type: 'error',
            });
          }
        })
        .catch((err) => {
          showToast({
            message: get(
              err,
              'data.message',
              'Candidate advanced, but sending interview invite failed.'
            ),
            type: 'error',
          });
        });
      return;
    }

    if (roundType === 'VIDEO' || roundType === 'IN_PERSON') {
      setInterviewRecordForSchedule({
        ...nextPendingRound,
        firstName: candidate?.firstName,
        lastName: candidate?.lastName,
        jobId: Number(nextPendingRound?.jobId || parsedJobId),
        candidateId: Number(candidate?.id),
      });
      resetInterviewerData();
      setShowScheduleModal(true);
      return;
    }

    showToast({
      message: `Candidate advanced, but invite is not supported for ${roundType || 'this round type'}.`,
      type: 'warning',
    });
  };

  /**
   * Sends bulk AI interview invites for all resume-screening candidates in the bulk-advance list
   * whose next round is an AI round. Uses the v1/interview/bulk/schedule endpoint.
   *
   * @param eligibleCandidateIds - The IDs that `CandidateStatus` determined are still checked
   *   (i.e. not deselected by the recruiter). We intersect these against our own
   *   resume-screening filter so deselected candidates are never invited.
   */
  const handleBulkAdvanceInviteRequested = async (
    eligibleCandidateIds?: number[]
  ): Promise<void> => {
    const allResumeScreeningCandidates = getResumeScreeningCandidatesInBulkAdvance();

    // If the caller supplied the final checked-candidate list, honour it.
    const candidatesForInvite =
      eligibleCandidateIds && eligibleCandidateIds.length > 0
        ? allResumeScreeningCandidates.filter((c) => eligibleCandidateIds.includes(Number(c.id)))
        : allResumeScreeningCandidates;

    if (candidatesForInvite.length === 0) return;

    const payload = candidatesForInvite.map((candidate) => {
      const nextPendingRound = getNextPendingRound(candidate);
      return {
        candidateId: Number(candidate.id),
        jobId: Number(parsedJobId),
        interviewRoundId: Number(nextPendingRound?.id),
      };
    });

    await bulkScheduleInterview(payload)
      .unwrap()
      .then((res) => {
        openScheduleFailureModalIfNeeded(res);

        if (res?.success) {
          showToast({
            message: get(res, 'message', 'Interview invites sent successfully'),
            type: 'success',
          });
          refetch();
        } else {
          showToast({
            message: get(res, 'message', 'Failed to send interview invites'),
            type: 'error',
          });
          if ((res?.data?.successCount ?? 0) > 0) {
            refetch();
          }
        }
      })
      .catch((err) => {
        openScheduleFailureModalIfNeeded(err?.data);

        showToast({
          message: get(
            err,
            'data.message',
            'Candidates advanced, but sending interview invites failed.'
          ),
          type: 'error',
        });
      });
  };

  const getBulkSchedulePayload = (response: any) => {
    // Support both { data: { failureCount, results } } and flatter / double-wrapped shapes
    if (response?.data?.results || response?.data?.failureCount != null) {
      return response.data;
    }
    if (response?.data?.data?.results || response?.data?.data?.failureCount != null) {
      return response.data.data;
    }
    if (response?.results || response?.failureCount != null) {
      return response;
    }
    return response?.data ?? response;
  };

  const openScheduleFailureModalIfNeeded = (response: any) => {
    const scheduleData = getBulkSchedulePayload(response);
    const results: BulkScheduleInterviewResult[] = Array.isArray(scheduleData?.results)
      ? scheduleData.results
      : Array.isArray(scheduleData?.result)
        ? scheduleData.result
        : [];
    const failedResults = results.filter((result) => result?.success === false);
    const failureCount = Number(scheduleData?.failureCount ?? failedResults.length ?? 0);

    if (failureCount <= 0 && failedResults.length === 0) {
      return;
    }

    const failuresToShow =
      failedResults.length > 0
        ? failedResults
        : [
            {
              candidateId: 0,
              candidateName: 'Candidate',
              jobId: parsedJobId,
              roundId: 0,
              success: false,
              message:
                response?.message || 'Unable to schedule AI interview for one or more candidates.',
              errorCode: null,
            } as BulkScheduleInterviewResult,
          ];

    setScheduleInviteFailures(failuresToShow);
    // Defer open so this modal is not suppressed when the advance modal unmounts
    window.setTimeout(() => {
      setIsScheduleFailureModalOpen(true);
    }, 300);
  };

  const closeScheduleFailureModal = () => {
    setIsScheduleFailureModalOpen(false);
    setScheduleInviteFailures([]);
  };

  const handleAdvanceScheduleSubmit = async () => {
    if (!interviewRecordForSchedule) {
      return;
    }

    const roundType = interviewRecordForSchedule.roundType;
    let payload: Record<string, unknown> = {};

    if (roundType === 'VIDEO') {
      payload = {
        candidateId: Number(interviewRecordForSchedule?.candidateId),
        jobId: Number(interviewRecordForSchedule?.jobId || parsedJobId),
        interviewRoundId: Number(interviewRecordForSchedule?.id),
        videoInterviewScheduleRequestDto: {
          hostsId: interviewerData.interviewerIds || [],
          lengthInMinutes: Number(interviewerData?.interviewSlotDuration),
        },
      };
    }

    if (roundType === 'IN_PERSON') {
      payload = {
        candidateId: Number(interviewRecordForSchedule?.candidateId),
        jobId: Number(interviewRecordForSchedule?.jobId || parsedJobId),
        interviewRoundId: Number(interviewRecordForSchedule?.id),
        inPersonInterviewScheduleRequestDto: {
          hostsId: interviewerData.interviewerIds || [],
          lengthInMinutes: Number(interviewerData?.interviewSlotDuration),
          address: interviewerData?.interviewLocation,
        },
      };
    }

    await scheduleInterview(payload as any)
      .unwrap()
      .then((res) => {
        if (res?.success) {
          showToast({
            message: get(res, 'message', 'Interview scheduled successfully'),
            type: 'success',
          });
          setShowScheduleModal(false);
          setInterviewRecordForSchedule(null);
          resetInterviewerData();
          refetch();
        } else {
          showToast({
            message: get(res, 'message', 'Failed to schedule interview'),
            type: 'error',
          });
        }
      })
      .catch((err) => {
        showToast({
          message: get(
            err,
            'data.message',
            'Unable to send invite. Please try again or contact support.'
          ),
          type: 'error',
        });
      });
  };

  /** Normalize react-icons + @ant-design/icons to the same visual box (20×20). */
  const actionIconRowClass =
    'flex items-center gap-2 [&_svg]:!h-5 [&_svg]:!w-5 [&_svg]:!min-h-5 [&_svg]:!min-w-5 [&_svg]:!max-h-5 [&_svg]:!max-w-5 [&_.anticon]:!inline-flex [&_.anticon]:!h-5 [&_.anticon]:!w-5 [&_.anticon]:!items-center [&_.anticon]:!justify-center';
  const notesPillIconClass =
    '[&_svg]:!h-5 [&_svg]:!w-5 [&_.anticon]:!inline-flex [&_.anticon]:!h-5 [&_.anticon]:!w-5 [&_.anticon]:!items-center [&_.anticon]:!justify-center';

  const renderActions = (record: any) => {
    const candidateDisplayName = `${record?.firstName || ''} ${record?.lastName || ''}`.trim();
    const inviteState = getInviteActionState(record);
    const canTriggerInvite =
      !jobOpeningData?.data?.isClosed &&
      canInviteCandidate &&
      inviteState.shouldShow &&
      !inviteState.isDisabled;
    const inviteTooltip = jobOpeningData?.data?.isClosed
      ? 'Job is closed'
      : !canInviteCandidate
        ? 'Send Invite'
        : tooltipTitleForInvite(record);

    if (!record.isResumeExtracted) {
      return (
        <div className={`${actionIconRowClass} opacity-50 cursor-not-allowed`}>
          <Tooltip title="Resume extraction in progress - Actions disabled">
            <MdOutlineRemoveRedEye className="block" />
          </Tooltip>
          <Tooltip title="Resume extraction in progress - Actions disabled">
            <MdEdit className="block" />
          </Tooltip>
          <Tooltip title="Resume extraction in progress - Actions disabled">
            <LuSquarePen size={18} className="block" />
          </Tooltip>
          <Tooltip title="Resume extraction in progress - Actions disabled">
            <FaEnvelope className={clsx('block', 'opacity-50', 'cursor-not-allowed')} />
          </Tooltip>
        </div>
      );
    }

    return (
      <div className={actionIconRowClass}>
        <Tooltip title="View Assessment">
          <MdOutlineRemoveRedEye
            className="block cursor-pointer"
            onClick={() => {
              const params = generateSearchParams();

              navigate(
                `/jobs/view/${parsedJobId}/candidates/${record.id}/details?${params.toString()}`,
                {
                  state: {
                    atsScore: record?.atsScore,
                    filters: filters,
                  },
                }
              );
            }}
          />
        </Tooltip>

        <Tooltip title="Edit Candidate">
          <MdEdit
            className="block cursor-pointer"
            onClick={() => {
              const params = generateSearchParams({
                activeTab: '2',
                enableEdit: 'true',
              });

              navigate(
                `/jobs/view/${parsedJobId}/candidates/${record.id}/details?${params.toString()}`,
                {
                  state: {
                    atsScore: record?.atsScore,
                    activeTab: '2',
                    enableEdit: true,
                    filters: filters,
                  },
                }
              );
            }}
          />
        </Tooltip>

        <Tooltip title="Candidate Notes">
          <LuSquarePen
            size={18}
            className="block cursor-pointer"
            onClick={() =>
              setNotesCandidate({
                id: Number(record.id),
                name: candidateDisplayName || 'Candidate',
              })
            }
          />
        </Tooltip>
        <Tooltip title={inviteTooltip}>
          <FaEnvelope
            className={clsx('block', {
              'cursor-pointer opacity-100': canTriggerInvite,
              'cursor-not-allowed opacity-50': !canTriggerInvite,
            })}
            onClick={() => {
              if (canTriggerInvite) {
                handleOpenInviteAction(record);
              }
            }}
          />
        </Tooltip>
      </div>
    );
  };

  useEffect(() => {
    const handleResumeUploadSuccess = (event: CustomEvent) => {
      if (event.detail.jobOpeningId === id) {
        refetch();
        if (atsJobOpeningId) {
          refetchAts();
        }
        if (event.detail.batchId) {
          sessionStorage.setItem(batchStorageKey, event.detail.batchId);
          setBatchId(event.detail.batchId);
        }
      }
    };

    window.addEventListener('resumeUploadSuccess', handleResumeUploadSuccess as EventListener);

    return () => {
      window.removeEventListener('resumeUploadSuccess', handleResumeUploadSuccess as EventListener);
    };
  }, [id, atsJobOpeningId, refetch, refetchAts]);

  useEventSource({
    type: 'batch',
    restUrl: batchId ? `/candidate/extract/progress?batchId=${batchId}` : '',
    onMessage: () => {
      // Individual DUPLICATE events are aggregated by the backend into the
      // BATCH_COMPLETED payload. We read them in onAbort which receives that payload.
    },
    onAbort: async (_controller, eventData) => {
      // BATCH_COMPLETED — clear the persisted batchId and refetch batches to show modal
      if (eventData?.status === 'BATCH_COMPLETED') {
        sessionStorage.removeItem(batchStorageKey);
        refetchBatches();
      }
      setBatchId(null);
      if (atsJobOpeningId) await refetchAts();
      await triggerGetAllCandidates({
        jobOpeningId: parsedJobId,
        page: filters.page,
        size: filters.size,
        text: filters.searchQuery || undefined,
        sortBy: filters.sortBy,
        sortDir: filters.sortDir ?? undefined,
        source: filters.source || undefined,
        externalStatus:
          filters.isNew || filters.externalStatus === 'ALL'
            ? undefined
            : filters.externalStatus || undefined,
        ...(filters.internalStatus && { internalStatus: filters.internalStatus }),
        ...(filters.isNew !== undefined && { isNew: filters.isNew }),
      });
    },
  });

  useEffect(() => {
    if (filters.searchQuery?.trim() && data?.data) {
      const expandedIds = data?.data
        ?.filter((candidate: any) => {
          if (!candidate.isResumeExtracted) return false;

          const searchTerm = filters.searchQuery.toLowerCase();
          return candidateContainsSearch(candidate, searchTerm);
        })
        .map((candidate: any) => candidate.id.toString());

      setCollapsedUsers(() => {
        const updated = new Set<string>();
        const allCandidateIds = new Set(data.data.map((c: any) => c.id.toString()));

        // Expand matching candidates
        expandedIds?.forEach((id: string) => updated.add(id));

        // Collapse non-matching candidates
        allCandidateIds.forEach((id) => {
          if (!expandedIds?.includes(id)) {
            updated.delete(id);
          }
        });

        return Array.from(updated);
      });
    } else if (!filters.searchQuery?.trim()) {
      // Collapse all when search is cleared
      setCollapsedUsers([]);
    }
  }, [filters.searchQuery, data?.data]);

  const handleAcknowledgeDuplicate = async () => {
    try {
      await Promise.all(
        unacknowledgedBatches.map((b) =>
          acknowledgeBatch({ batchId: b.batchId, acknowledgement: true }).unwrap()
        )
      );
    } catch {
      showToast({ message: 'Failed to acknowledge duplicates. Please try again.', type: 'error' });
    }
  };

  const handleBackToList = () => {
    navigate('/jobs');
  };

  const handleDownloadBatchError = async () => {
    try {
      const { data } = await downloadBatchErrorFile({ jobId: Number(parsedJobId) });
      if (data) {
        const url = window.URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Batch-error-file-${parsedJobId}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast({
          message: 'Batch Error file downloaded successfully!',
          type: 'success',
        });
      } else {
        showToast({
          message: 'No error in the last batch upload',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error downloading batch error file:', error);
      showToast({
        message: 'No error in the last batch upload',
        type: 'error',
      });
    }
  };
  const formatStatus = (status: any) => {
    if (!status) return 'N/A';

    const statusMap: Record<string, string> = {
      FINAL_ROUND_SHORTLISTED: 'Final Round Shortlisted',
      IN_PROCESS: 'In Process',
      SELECTED: 'Selected',
      NOT_SELECTED: 'Not Selected',
    };

    const key = status.toUpperCase().replace(/ /g, '_');
    return (
      statusMap[key] ||
      status
        .split('_')
        .map((word: any) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    );
  };

  const singleAdvanceCandidate = getSingleAdvanceCandidate();

  /**
   * Returns the list of eligible candidates in a bulk advance who are currently
   * in the Resume Screening stage AND whose next pending round is an AI round.
   * These are the candidates that need a bulk interview invite to be sent.
   */
  const getResumeScreeningCandidatesInBulkAdvance = () => {
    if (
      selectedModalStatus !== StatusModalType.ADVANCE ||
      selectedCandidatesForModal.length === 0
    ) {
      return [];
    }
    return selectedCandidatesForModal.filter((candidate) => {
      // Must be in resume screening stage
      const resumeStatus = (candidate?.resumeStatus || '').toUpperCase();
      const isInResumeScreening =
        resumeStatus === 'REVIEW_AWAITED' ||
        resumeStatus === 'PENDING' ||
        isResumeReviewAwaited(candidate);
      if (!isInResumeScreening) return false;

      // Next round must be AI type
      const nextPending = getNextPendingRound(candidate);
      return nextPending?.roundType === 'AI';
    });
  };

  const resumeScreeningCandidatesForBulkInvite = getResumeScreeningCandidatesInBulkAdvance();

  const showSendInviteCheckbox =
    selectedModalStatus === StatusModalType.ADVANCE &&
    // Single candidate advance — original behaviour
    ((!!singleAdvanceCandidate &&
      !isDecisionPendingState(singleAdvanceCandidate) &&
      !!getNextRoundName(singleAdvanceCandidate)) ||
      // Bulk advance — show when at least one resume-screening → AI-round candidate exists
      (selectedCandidatesForModal.length > 1 && resumeScreeningCandidatesForBulkInvite.length > 0));

  return (
    <div className="relative">
      <DuplicateCandidateModal
        duplicates={pendingDuplicates}
        onAcknowledge={handleAcknowledgeDuplicate}
      />
      {(isJobOpeningLoading || isErrorFileLoading) && <Loader />}
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
          <div className="flex justify-between items-center gap-4">
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
              <div className="flex items-center text-sm gap-2">
                <p className="font-bold">Bilingual:</p>
                <span className="font-semibold text-gray-500">
                  {jobOpeningData?.data?.isMultilingual ? 'Yes' : 'No'}
                </span>
                {/* <Switch
                    checked={Boolean(jobOpeningData?.data?.isMultilingual)}
                    disabled
                    size="small"
                    style={{
                      backgroundColor: jobOpeningData?.data?.isMultilingual
                        ? 'var(--color-primary)'
                        : undefined,
                    }}
                  /> */}
              </div>
              <div className="flex items-center text-sm gap-2">
                <p className="font-bold">Company Culture Introduction:</p>
                <span className="font-semibold text-gray-500">
                  {jobOpeningData?.data?.useCultureIntro ? 'On' : 'Off'}
                </span>
                {/* <Switch
                    checked={Boolean(jobOpeningData?.data?.useCultureIntro)}
                    disabled
                    size="small"
                    style={{
                      backgroundColor: jobOpeningData?.data?.useCultureIntro
                        ? 'var(--color-primary)'
                        : undefined,
                    }}
                  /> */}
              </div>
            </div>

            <div className="flex justify-end">
              <div className="flex flex-col items-end gap-4">
                <div className="flex items-center gap-4">
                  <Search
                    appname="candidates listing"
                    placeholder="Search Candidate..."
                    onSearch={handleSearch}
                    allowClear
                    value={filters.searchQuery}
                    className="bg-white border-gray-300 rounded-full py-2"
                  />

                  {canViewJobNotes && (
                    <Button
                      className={`rounded-full border border-[#a9c5e6] bg-[#eaf3ff] px-6 py-2 text-[#2c69ad] font-semibold flex items-center gap-2 ${notesPillIconClass}`}
                      onClick={() => setIsJobNotesPanelOpen(true)}
                    >
                      <LuSquarePen size={18} />
                      <span>Notes</span>
                      <span className="min-w-8 h-8 px-2 rounded-xl bg-[#2c69ad] text-white flex items-center justify-center text-sm leading-none">
                        {jobNotes.length}
                      </span>
                    </Button>
                  )}

                  {hasFeatureAccess('job_opening', 'create', role) && (
                    <div className="flex items-center gap-3 justify-end">
                      {/* Upload Button */}
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
                      {/* Download Button */}
                      <Tooltip title="Download error file">
                        <span>
                          <Button
                            className="text-white bg-primary rounded-full p-2 flex items-center justify-center"
                            onClick={handleDownloadBatchError}
                            disabled={isErrorFileLoading}
                          >
                            <DownloadOutlined />
                          </Button>
                        </span>
                      </Tooltip>
                    </div>
                  )}
                </div>
                <div className="w-full">
                  <FilterMenu
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    // onClear={handleCandidateFilterClear}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Candidates List */}
      <div className="w-full">
        <div className="w-full p-2">
          <Row gutter={[16, 16]} className="font-bold p-4 bg-[#FFFFFF] shadow heading-font">
            <Col span={1}>
              <Checkbox
                className={clsx(
                  'custom-checkbox roboto-font',
                  data?.data?.every((c) => isCandidateDisabled(c)) && 'disabled-checkbox'
                )}
                checked={selectAll}
                onChange={handleSelectAll}
                disabled={
                  !data?.data ||
                  data.data.length === 0 ||
                  data?.data?.every((c) => isCandidateDisabled(c))
                }
              />
            </Col>
            <COL
              sortable
              sortKey="firstName"
              currentSortKey={currentSortKey}
              onSort={handleSort}
              span={5}
            >
              CANDIDATE DETAILS
            </COL>
            <COL
              sortable
              sortKey="atsScore"
              currentSortKey={currentSortKey}
              onSort={handleSort}
              span={4}
            >
              RESUME SCORE
            </COL>
            <COL
              sortable
              sortKey="atsCandidateCreatedTime"
              currentSortKey={currentSortKey}
              onSort={handleSort}
              span={4}
            >
              APPLIED DATE
            </COL>
            <COL
              sortable
              sortKey="interviewStatus"
              currentSortKey={currentSortKey}
              onSort={handleSort}
              span={4}
            >
              STATUS
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
            <p>Failed to load candidates. Please try again.</p>
          ) : Array.isArray(data?.data) && data.data.length > 0 ? (
            data.data.map((candidate: any) => (
              <div key={candidate.id} className="mb-1">
                <div
                  style={{
                    border: selectedCandidates[candidate.id]
                      ? `2px solid var(--primary)`
                      : '2px solid transparent',
                    borderLeft: candidate.isNew ? '4px solid #3b82f6' : '4px solid transparent',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease',
                    boxShadow: selectedCandidates[candidate.id]
                      ? '0 0 10px rgba(var(--primary-rgb, 24, 144, 255), 0.2)'
                      : 'none',
                  }}
                  className={clsx(
                    selectedCandidates[candidate.id] && 'selected-candidate-highlight',
                    'hover:shadow-md'
                  )}
                >
                  <CommonCard>
                    <Row gutter={[16, 16]} align="middle">
                      <Col span={1}>
                        <Checkbox
                          className={clsx(
                            'custom-checkbox roboto-font',
                            isCandidateDisabled(candidate) && 'disabled-checkbox'
                          )}
                          checked={!!selectedCandidates[candidate.id]}
                          onChange={() => handleCandidateSelect(candidate.id)}
                          disabled={!candidate.isResumeExtracted || isCandidateDisabled(candidate)}
                        />
                      </Col>
                      <Col span={5} className="min-w-0 overflow-hidden">
                        <div
                          className="flex items-center min-w-0 max-w-full cursor-pointer roboto-font"
                          onClick={() =>
                            candidate.isResumeExtracted && toggleCollapse(candidate.id.toString())
                          }
                        >
                          {candidate.isResumeExtracted ? (
                            <Link
                              to={{
                                pathname: `/jobs/view/${parsedJobId}/candidates/${candidate.id}/details`,
                                search: generateSearchParams().toString(),
                              }}
                              state={{
                                activeTab: '1',
                                atsScore: candidate?.atsScore,
                                filters: filters,
                              }}
                              className="block min-w-0 flex-1 overflow-hidden text-[var(--primary)]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {candidate.firstName && candidate.lastName ? (
                                <div className="flex items-center gap-2 leading-5 min-w-0 max-w-full">
                                  <span className="block min-w-0 truncate whitespace-nowrap font-semibold underline text-[var(--primary)] leading-5">
                                    {renderHighlightedField(
                                      candidate?.firstName + ' ' + candidate.lastName,
                                      'fullName',
                                      filters
                                    )}
                                  </span>
                                  {candidate.isNew && (
                                    <span
                                      className="inline-flex h-5 items-center shrink-0 rounded-full bg-blue-500 px-2 text-[11px] font-semibold leading-none text-white cursor-default"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }}
                                    >
                                      New
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 leading-5 min-w-0 max-w-full">
                                  <span className="block min-w-0 truncate whitespace-nowrap font-semibold underline text-[var(--primary)] leading-5">
                                    {renderHighlightedField(
                                      candidate?.firstName || 'N/A',
                                      'firstName',
                                      filters
                                    )}
                                  </span>
                                  {candidate.isNew && (
                                    <span
                                      className="inline-flex h-5 items-center shrink-0 rounded-full bg-blue-500 px-2 text-[11px] font-semibold leading-none text-white cursor-default"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }}
                                    >
                                      New
                                    </span>
                                  )}
                                </div>
                              )}
                            </Link>
                          ) : (
                            <Tooltip title="Resume extraction in progress">
                              <p className="min-w-0 truncate font-semibold text-gray-400 cursor-not-allowed">
                                {candidate.firstName || 'N/A'} {candidate.lastName || ''}
                              </p>
                            </Tooltip>
                          )}
                          {candidate.isResumeExtracted && (
                            <span className="ml-2 shrink-0">
                              {collapsedUsers.includes(candidate.id.toString()) ? (
                                <UpOutlined />
                              ) : (
                                <DownOutlined />
                              )}
                            </span>
                          )}
                        </div>
                        {collapsedUsers.includes(candidate.id.toString()) &&
                          candidate.isResumeExtracted && (
                            <div className="mt-1">
                              <p>
                                <span className="font-medium roboto-font">Job Title: </span>
                                <span className="roboto-font">
                                  {renderHighlightedField(
                                    candidate.currentJobTitle || 'N/A',
                                    'currentJobTitle',
                                    filters
                                  )}
                                </span>
                              </p>
                              <p>
                                <span className="font-medium roboto-font">Qualification: </span>
                                <span className="roboto-font">
                                  {renderHighlightedField(
                                    candidate.education || 'N/A',
                                    'education',
                                    filters
                                  )}
                                </span>
                              </p>
                              <p>
                                <span className="font-medium roboto-font">Email: </span>
                                <span className="roboto-font">
                                  {renderHighlightedField(
                                    candidate.email || 'N/A',
                                    'email',
                                    filters
                                  )}
                                </span>
                              </p>
                              <p>
                                <span className="font-medium roboto-font">Phone Number: </span>
                                <span className="roboto-font">
                                  {renderHighlightedField(
                                    candidate.phoneNumber
                                      ? `${candidate.countryCode || ''}${formatPhoneNumber(candidate.phoneNumber)}`
                                      : 'N/A',
                                    'phoneNumber',
                                    filters
                                  )}
                                </span>
                              </p>
                              <p>
                                <span className="font-medium roboto-font">Location: </span>
                                <span className="roboto-font">
                                  {renderHighlightedField(
                                    candidate.address || 'N/A',
                                    'address',
                                    filters
                                  )}
                                </span>
                              </p>
                              <p>
                                <span className="font-medium roboto-font">
                                  Candidate Communication Language:{' '}
                                </span>
                                <span className="roboto-font">
                                  {candidate?.candidateCommunicationLanguage === 'es'
                                    ? 'Español'
                                    : 'English'}
                                </span>
                              </p>
                            </div>
                          )}
                      </Col>
                      <Col span={4}>
                        <div className="flex gap-1">
                          <p className="roboto-font">
                            {candidate.atsScore === 0
                              ? 0
                              : candidate?.atsScore
                                ? renderHighlightedField(
                                    candidate.atsScore.toString(),
                                    'atsScore',
                                    filters
                                  )
                                : 'N/A'}
                          </p>
                          {candidate?.resumeProcessFailed ? (
                            <span>
                              {isResumeLoading ? (
                                <Loader />
                              ) : (
                                <LuRefreshCw
                                  className="cursor-pointer text-xl"
                                  onClick={() => handleResumeRefresh(candidate?.id)}
                                />
                              )}
                            </span>
                          ) : null}
                        </div>
                      </Col>
                      <Col span={4}>
                        <p className="roboto-font">
                          {candidate.applicationDate
                            ? dayjs(candidate.applicationDate).format('MMM DD, YYYY')
                            : 'N/A'}
                        </p>
                      </Col>
                      <Col span={4}>
                        {candidate.isResumeExtracted ? (
                          <>
                            <Link
                              to={{
                                pathname: `/jobs/view/${parsedJobId}/candidates/${candidate.id}/details`,
                                search: generateSearchParams().toString(),
                              }}
                              state={{ activeTab: '3', atsScore: candidate?.atsScore }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <p
                                className={
                                  !candidate.status ? 'cursor-pointer font-semibold' : undefined
                                }
                                style={{
                                  color: !candidate.status ? '#FFCC00' : undefined,
                                }}
                              >
                                {renderHighlightedField(
                                  formatStatus(candidate.status) || 'N/A',
                                  'interviewStatus',
                                  filters
                                )}
                              </p>
                            </Link>
                            {candidate.status &&
                              (!['FINAL_ROUND_SHORTLISTED', 'SELECTED', 'NOT_SELECTED'].includes(
                                candidate.status.toUpperCase()
                              ) ||
                                candidate.isClosed) && (
                                <p>
                                  {renderHighlightedField(
                                    candidate.interviewStatus === 'Reactivate'
                                      ? 'Reactivated'
                                      : candidate.interviewStatus?.replace(
                                          /Booking Created/gi,
                                          'Scheduled'
                                        ) || 'N/A',
                                    'interviewStatus',
                                    filters
                                  )}
                                </p>
                              )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Spin size="small" />
                            <span className="text-gray-600">Resume Extraction is in Progress</span>
                          </div>
                        )}
                      </Col>
                      <Col span={2} className="flex items-center justify-center">
                        {renderActions(candidate)}
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
        <MasterPagination
          current={filters.page + 1}
          pageSize={filters.size || 10}
          total={data?.totalElements ?? 0}
          itemLabel="Candidates"
          onPageChange={(page) => handlePageChange(page - 1)}
        />
      </div>
      {/* Floating Selection Panel */}
      {selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-slideUp">
          <div className="flex justify-center w-full px-4 mb-4">
            <div className="inline-flex max-w-[90vw] xl:max-w-[56rem] items-center justify-between gap-3 bg-white border border-[var(--border)] shadow-lg rounded-2xl p-4 md:p-6">
              <div className="flex min-w-0 items-center gap-3 md:gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary">
                      <span className="text-white text-xs font-semibold">{selectedCount}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">Candidate(s)</span>
                      <span className="text-sm font-semibold">Selected</span>
                    </div>
                  </div>
                </div>

                <div className="h-8 w-px bg-[var(--border)] hidden sm:block"></div>

                <div className="flex min-w-0 flex-wrap items-center gap-2 md:gap-3">
                  <Button
                    className="flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 cursor-pointer hover:bg-[#eeeeee] text-sm h-8"
                    onClick={() => handleBulkActionClick(StatusModalType.ADVANCE)}
                  >
                    <IoArrowRedoOutline size={16} /> Advance
                  </Button>
                  <Button
                    className="flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 cursor-pointer hover:bg-[#eeeeee] text-sm h-8"
                    onClick={() => handleBulkActionClick(StatusModalType.NOT_SELECTED)}
                  >
                    <LuThumbsDown size={16} />
                    Reject
                  </Button>
                  <Button
                    className="flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 cursor-pointer hover:bg-[#eeeeee] text-sm h-8"
                    onClick={() => handleBulkActionClick(StatusModalType.SELECTED)}
                  >
                    <LuThumbsUp size={16} /> Select
                  </Button>
                  <Button
                    className="flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 cursor-pointer hover:bg-[#eeeeee] text-sm h-8 bg-white text-[#1a1a1a]"
                    onClick={handleFloatingBarEmailClick}
                  >
                    <LuMail size={16} /> Email
                  </Button>

                  <Button
                    className="flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 cursor-pointer hover:bg-[#eeeeee] text-sm h-8 bg-white text-[#1a1a1a]"
                    onClick={handleFloatingBarSmsClick}
                  >
                    <LuMessageSquare size={16} /> SMS
                  </Button>
                </div>
              </div>
              <Button
                className="cursor-pointer hover:text-gray-800 text-sm h-8 shrink-0"
                onClick={() => {
                  setSelectedCandidates({});
                  setSelectAll(false);
                }}
              >
                <MdClose size={22} />
              </Button>
            </div>
          </div>
        </div>
      )}
      <AntdCommonModal
        open={isModalOpen}
        onClose={handleModalClose}
        title={modalContent.title}
        subtitle={modalContent.subtitle}
        modalProps={{
          width: 700,
        }}
      >
        <CandidateStatus
          isOpen={isModalOpen}
          onClose={handleModalClose}
          candidateIds={selectedCandidatesForModal.map((c) => c.id)}
          statusType={selectedModalStatus as StatusModalType}
          candidateNames={selectedCandidatesForModal.map((c) =>
            `${c.firstName || ''} ${c.lastName || ''}`.trim()
          )}
          onStatusUpdate={handleStatusUpdateSuccess}
          onCandidatesUpdate={handleCandidatesUpdateInModal}
          showSendInviteCheckbox={showSendInviteCheckbox}
          sendInviteCheckboxLabel={getAdvanceInviteCheckboxLabel()}
          onAdvanceInviteRequested={
            selectedCandidatesForModal.length > 1
              ? handleBulkAdvanceInviteRequested
              : handleAdvanceInviteRequested
          }
          candidateDetails={selectedCandidatesForModal.map((candidate) => {
            const isLastRound =
              !candidate?.nextRoundDetails?.nextRound &&
              (!!candidate?.nextRoundDetails?.currentRoundStatus ||
                !!candidate?.nextRoundDetails?.isCandidateInFinalRound);
            return {
              candidateId: candidate.id,
              jobOpeningId: parsedJobId,
              roundId:
                selectedModalStatus === StatusModalType.FINAL_ROUND_SHORTLIST
                  ? candidate?.interviewRounds?.[candidate.interviewRounds.length - 1]?.id || null
                  : selectedModalStatus === StatusModalType.ADVANCE && isLastRound
                    ? candidate?.interviewRounds?.[candidate.interviewRounds.length - 1]?.id || null
                    : candidate.nextRoundDetails?.currentRound?.id || null,
              candidateName: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim(),
              // isResumeStatusUpdated: candidate?.isResumeStatusUpdated || false,
              nextRound:
                candidate.nextRoundDetails?.nextRound?.round ||
                (isLastRound ? { name: 'Decision Pending' } : undefined),
              resumeStatus: candidate.resumeStatus || '',
              status: candidate.status || '',
              interviewStatus: candidate.interviewStatus || '',
              interviewRounds: candidate.interviewRounds || [],
            };
          })}
        />
      </AntdCommonModal>
      {isInviteModalOpen && (
        <ConfirmationModal
          onClose={handleCloseInviteModal}
          onConfirm={handleScheduleInvite}
          title={`Send AI Audio screening invitation to ${(selectedCandidate?.firstName || '').trim()} ${(selectedCandidate?.lastName || '').trim()}?`.trim()}
          confirmText="Send"
          cancelText="Cancel"
          isLoading={isScheduleLoading}
        />
      )}

      {interviewRecordForSchedule && (
        <ScheduleInterviewModal
          visible={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false);
            setInterviewRecordForSchedule(null);
            resetInterviewerData();
          }}
          title="Schedule Interview"
          interviewRecord={interviewRecordForSchedule}
          interviewerData={interviewerData}
          setInterviewerData={setInterviewerData}
          onDataChange={(data) => setInterviewerData(data)}
          footer={
            <div className="flex justify-center items-center space-x-2">
              <Button
                className="px-10 py-3 w-full bg-primary font-bold text-white border rounded-4xl cursor-pointer"
                onClick={handleAdvanceScheduleSubmit}
                disabled={
                  (interviewRecordForSchedule.roundType === 'VIDEO' &&
                    (!interviewerData?.interviewSlotDuration ||
                      interviewerData?.interviewerIds?.length === 0)) ||
                  (interviewRecordForSchedule.roundType === 'IN_PERSON' &&
                    (!interviewerData?.interviewSlotDuration ||
                      interviewerData?.interviewerIds?.length === 0 ||
                      !interviewerData?.interviewLocation)) ||
                  isScheduleLoading
                }
              >
                {isScheduleLoading ? <Loader /> : <span>SUBMIT</span>}
              </Button>
            </div>
          }
        />
      )}
      <SendEmailToCandidateModal
        open={isBulkSendEmailOpen}
        onClose={handleCloseBulkEmailModal}
        candidate={bulkEmailCandidate}
        jobOpeningId={parsedJobId}
        bulkRecipientEmails={bulkEmailRecipientList}
        bulkCandidateIds={bulkEmailCandidateIds}
        candidates={bulkEmailCandidates}
      />
      <BulkSendSmsModal
        open={isBulkSendSmsOpen}
        onClose={handleCloseBulkSmsModal}
        jobOpeningId={parsedJobId}
        candidates={bulkSmsCandidates}
      />
      <JobListingNotesPanel
        open={isJobNotesPanelOpen}
        onClose={() => setIsJobNotesPanelOpen(false)}
        jobTitle={jobTitleName}
        jobOpeningId={parsedJobId}
      />
      <CandidateNotesPanel
        open={Boolean(notesCandidate)}
        onClose={() => setNotesCandidate(null)}
        title={`Candidate Notes - ${notesCandidate?.name || ''}`.trim()}
        candidateId={notesCandidate?.id}
      />
      <UploadCvModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} />
      <Modal
        open={isScheduleFailureModalOpen}
        onCancel={closeScheduleFailureModal}
        footer={null}
        centered
        maskClosable={false}
        keyboard={false}
        width={640}
        zIndex={1100}
        className="ant-custom-modal"
        title={null}
      >
        <div className="mb-6 text-center">
          <h2 className="text-l font-semibold mb-2">
            Interview Invitation Not Sent – Missing Candidate Contact Details
          </h2>
          <p className="text-xs roboto-font">
            The following candidates could not be scheduled for AI Audio Screening.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="border border-gray-200 rounded-xl p-4 max-h-64 overflow-y-auto">
            <div className="flex flex-col gap-4">
              {scheduleInviteFailures.map((failure) => (
                <div
                  key={`${failure.candidateId}-${failure.message}`}
                  className="flex flex-col gap-1"
                >
                  <span className="text-sm font-semibold text-gray-800 roboto-font">
                    {failure.candidateName || '—'}
                  </span>
                  <span className="text-sm text-gray-600 roboto-font">{failure.message}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="max-w-[240px] mx-auto w-full">
            <Button
              className="w-full bg-primary text-white py-2 rounded-3xl"
              onClick={closeScheduleFailureModal}
            >
              OK
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CandidatesListing;
