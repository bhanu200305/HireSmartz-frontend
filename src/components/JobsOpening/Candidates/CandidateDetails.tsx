import { Rate, Select, Tabs, Tooltip } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { FaLink, FaArrowDown } from 'react-icons/fa';
import { BsFullscreen } from 'react-icons/bs';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { Viewer } from '@react-pdf-viewer/core';
// import DocViewer, { DocViewerRenderers } from 'react-doc-viewer';
import '@react-pdf-viewer/core/lib/styles/index.css';
import { GlobalWorkerOptions } from 'pdfjs-dist';

import ResumeScore from './ResumeScore';
import {
  base64toBlob,
  // detectMimeTypeFromBase64,
  formatRoundLabel,
  formattedDate,
  formattedTime,
  getDisplayRoundNumber,
  getModalContent,
  makeFirstLetterUpperCase,
  resolveRoundSequenceByRound,
} from '../../../shared/utils/methods';
import InterviewSummary from './InterviewSummary/InterviewSummary';
import {
  CandidateByIdResponse,
  InterviewRoundResponseDTO,
  SidebarItem,
  SortDirection,
} from '../../../types';
import VideoInterviewDetails from './InterviewDetails/VideoInterview/VideoInterviewDetails';
import AIInterviewDetails from './InterviewDetails/AiInterviewDetails';
import useEventSource from '../../../hooks/useEventSource';
import { getLocalStorageItem } from '../../../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../../../constants/webAPI';
import { fullScreenPlugin } from '@react-pdf-viewer/full-screen';
import InPersonInterviewDetails from './InterviewDetails/InPersonInterviewDetails';
import { Loader } from '../../shared/ui/loader';
import { FiEdit2 } from 'react-icons/fi';
import EditCandidate from './EditCandidate';
import { Button, showToast } from '../../shared';
import { hasFeatureAccess } from '../../../shared/utils/auth/getAccess';
import useEffectivePermissions from '../../../hooks/useEffectivePermissions';
import { useSelector, shallowEqual } from 'react-redux';
import { useScheduleInterviewMutation } from '../../../api/candidate-service/Candidates/Candidates';
import { useGetJobOpeningByIdQuery } from '../../../api/job-service/JobOpening/GetJobOpeningById';
import { get } from 'lodash-es';

import { MdOutlineKeyboardArrowLeft, MdOutlineKeyboardArrowRight } from 'react-icons/md';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';
import CandidateStatus from './CandidateStatus';
import { InterviewEnum, StatusModalType } from '../../../shared/utils/enums';
import { LuMail, LuThumbsDown, LuThumbsUp } from 'react-icons/lu';
import { IoChatbubbleEllipses } from 'react-icons/io5';
import FinalFeedbackDetails from './InterviewDetails/FinalFeedbackDetails';
import SendEmailToCandidateModal from './Modal/SendEmailToCandidateModal';
import SendSmsToCandidateModal from './Modal/SendSmsToCandidateModal';
import { getSmsInfoForCandidate } from './Modal/smsHelpers';
import CandidateNotesPanel from './Notes/CandidateNotesPanel';
import { countNotesForRound } from '../Notes/notesTypes';
import { useGetCandidateNotesAllQuery } from '../../../api/job-service/JobOpening/JobOpeningNotes';
import { NotesPillTrigger } from '../Notes/NotesPillTrigger';
import ScheduleInterviewModal from './Modal/ScheduleInterviewModal';
import SmsCommunicationTab from './SmsCommunication/SmsCommunicationTab';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import AssignJobModal from './Modal/AssignJobModal';
import AssignedJobsModal from './Modal/AssignedJobsModal';

// const { Option } = Select;

const pdfjsVersion = '3.11.174';
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;

/**
 * Maps the Assessment "Resume Screening" tab to an interview round for round-scoped notes (same API as other rounds).
 * Prefers name match, then first round by sequence when the job uses a generic first stage.
 */
function findResumeScreeningInterviewRound(
  rounds: InterviewRoundResponseDTO[] | undefined
): InterviewRoundResponseDTO | null {
  if (!rounds?.length) return null;
  const sorted = [...rounds].sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
  const exact = sorted.find(
    (r) => (r.round?.name || '').trim().toLowerCase() === 'resume screening'
  );
  if (exact) return exact;
  const partial = sorted.find((r) => {
    const n = (r.round?.name || '').toLowerCase();
    return n.includes('resume') && n.includes('screen');
  });
  if (partial) return partial;
  return sorted[0] ?? null;
}

const candidateHeaderIconCircle =
  'inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--primary)] transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 disabled:opacity-40';
const candidateHeaderSmsMutedCircle =
  'inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-gray-50 text-gray-400 cursor-not-allowed';

const HIRING_MANAGER_ROLE_REGEX = /\bhiring\s*manager\b/gi;
const EMAIL_TOKEN_REGEX = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/i;

const formatHiringManagerList = (rawHiringManager: unknown): string[] => {
  if (typeof rawHiringManager !== 'string') return ['N/A'];

  const cleaned = rawHiringManager.replace(HIRING_MANAGER_ROLE_REGEX, ' ').trim();
  if (!cleaned) return ['N/A'];

  const tokens = cleaned
    .split(',')
    .map((token) => token.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const managers: string[] = [];

  tokens.forEach((token) => {
    if (EMAIL_TOKEN_REGEX.test(token)) {
      if (managers.length > 0 && !managers[managers.length - 1].includes('(')) {
        managers[managers.length - 1] = `${managers[managers.length - 1]} (${token})`;
      } else {
        managers.push(token);
      }
      return;
    }

    managers.push(token);
  });

  const uniqueManagers = Array.from(new Set(managers.map((manager) => manager.trim()))).filter(
    Boolean
  );

  return uniqueManagers.length > 0 ? uniqueManagers : ['N/A'];
};

const ViewCandidateDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useSelector((state: any) => state.LoginSlice, shallowEqual);
  const effectivePermissions = useEffectivePermissions();
  const { candidateId, id: jobIdFromParams } = useParams();
  const [candidate, setCandidate] = useState<CandidateByIdResponse>();
  const [isCandidateLoading, setIsCandidateLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
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
  const [selectedModalStatus, setSelectedModalStatus] = useState<StatusModalType>(
    StatusModalType.SELECTED
  );
  const [, setCandidateStatus] = useState<string>('');
  const [scheduleInterview, { isLoading: isScheduleLoading }] = useScheduleInterviewMutation();
  const { data: jobOpeningData } = useGetJobOpeningByIdQuery(
    { jobOpeningId: Number(jobIdFromParams) || 0 },
    { skip: !jobIdFromParams }
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const page = searchParams.get('page');
  const size = searchParams.get('size');
  const searchQuery = searchParams.get('searchQuery');
  const internalStatus = searchParams.get('internalStatus');
  const externalStatus = searchParams.get('externalStatus');
  const roundType = searchParams.get('roundType');
  const source = searchParams.get('source');
  const sortBy = searchParams.get('sortBy');
  const sortDir = searchParams.get('sortDir');
  const tabFromQuery = searchParams.get('tab');
  const roundFromQuery = searchParams.get('round');

  const formattedHiringManagers = useMemo(
    () => formatHiringManagerList(candidate?.hiringManager),
    [candidate?.hiringManager]
  );

  const locationState = location.state || {};
  const filtersFromState = locationState.filters;

  const currentFilters = {
    page: page ? parseInt(page) : filtersFromState?.page || 0,
    size: size ? parseInt(size) : filtersFromState?.size || 10,
    searchQuery: searchQuery || filtersFromState?.searchQuery || '',
    internalStatus: internalStatus ? internalStatus : filtersFromState?.internalStatus || null,
    externalStatus: externalStatus ? externalStatus : filtersFromState?.externalStatus || null,
    roundType: roundType ? roundType : filtersFromState?.roundType || null,
    source: source || filtersFromState?.source || null,
    sortBy: sortBy || filtersFromState?.sortBy || undefined,
    sortDir: (sortDir as SortDirection) || filtersFromState?.sortDir || undefined,
  };

  // const [isEditing, setIsEditing] = useState(false)
  // const [isEditing, setIsEditing] = useState(false);

  // In ViewCandidateDetails component

  const handleNavigateToCandidate = (navigateCandidateId: number) => {
    const params = new URLSearchParams({
      // page: currentFilters.page.toString(),
      // size: currentFilters.size.toString(),
      ...(currentFilters.searchQuery && { searchQuery: currentFilters.searchQuery }),
      ...(currentFilters.internalStatus && {
        internalStatus: currentFilters.internalStatus.toString(),
      }),
      ...(currentFilters.externalStatus && {
        externalStatus: currentFilters.externalStatus.toString(),
      }),
      ...(currentFilters.roundType && {
        roundType: currentFilters.roundType.toString(),
      }),
      ...(currentFilters.source && { source: currentFilters.source }),
      ...(currentFilters.sortBy && { sortBy: currentFilters.sortBy }),
      ...(currentFilters.sortDir && { sortDir: currentFilters.sortDir }),
      ...(activeTab !== '1' && { tab: activeTab }),
      ...(activeSidebarTab !== 'Resume Screening' && { round: activeSidebarTab }),
    });

    navigate(
      `/jobs/view/${jobIdFromParams}/candidates/${navigateCandidateId}/details?${params.toString()}`,
      {
        state: {
          filters: currentFilters,
          activeTab,
          activeSidebarTab,
          enableEdit: isEditing,
        },
      }
    );
  };

  const handlePreviousCandidate = () => {
    if (candidate?.previousCandidateId) {
      handleNavigateToCandidate(candidate?.previousCandidateId);
    }
  };

  const handleNextCandidate = () => {
    if (candidate?.nextCandidateId) {
      handleNavigateToCandidate(candidate?.nextCandidateId);
    }
  };
  const handleStatusChange = (value: string) => {
    if (value === StatusModalType.SELECTED || StatusModalType.NOT_SELECTED) {
      setSelectedModalStatus(value as StatusModalType);
      setIsModalOpen(true);
      setCandidateStatus(value);
    } else {
      setCandidateStatus('');
    }
  };

  const handleAdvanceClick = () => {
    setSelectedModalStatus(StatusModalType.ADVANCE);
    setIsModalOpen(true);
  };

  const handleRejectClick = () => {
    setSelectedModalStatus(StatusModalType.NOT_SELECTED);
    setIsModalOpen(true);
  };
  const isResumeProcessingFailed = () => {
    return !!candidate?.resumeProcessFailed;
  };

  const areCandidateActionsDisabled = () => {
    if (isResumeProcessingFailed()) return true;

    return (
      candidate?.status?.toUpperCase() === 'SELECTED' ||
      candidate?.status?.toUpperCase() === 'NOT_SELECTED'
    );
  };
  const isOnLastRound = () => {
    if (!candidate?.interviewRounds?.length) return false;

    const rounds = candidate.interviewRounds;
    const lastRound = rounds[rounds.length - 1];
    return !candidate?.nextRoundDetails?.nextRound && !!lastRound;
  };

  const isFinalRoundShortlistDisabled = () => {
    if (
      candidate?.status?.toUpperCase() === 'SELECTED' ||
      candidate?.status?.toUpperCase() === 'NOT_SELECTED' ||
      candidate?.status?.toUpperCase() === 'DECISION_PENDING'
    ) {
      return true;
    }
    if (!candidate?.interviewRounds?.length) return true;

    const lastRound = candidate.interviewRounds[candidate.interviewRounds.length - 1];
    return lastRound?.interviewStatus !== InterviewEnum.INTERVIEW_COMPLETED;
  };
  // TODO: not currently wired to any UI control — kept (not deleted) since
  // it's real reactivate-candidate logic; flagged rather than silently
  // deleted during the lint cleanup pass.
  // eslint-disable-next-line unused-imports/no-unused-vars
  const handleReactivateClick = () => {
    setSelectedModalStatus('REACTIVATE' as any);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setCandidateStatus('');
  };

  const resetInterviewerData = () => {
    setInterviewerData({
      interviewerName: [],
      interviewerIds: [],
      interviewSlotDuration: 15,
      interviewLocation: '',
    });
  };

  const handleStatusUpdateSuccess = () => {
    setIsModalOpen(false);
    if (activeSidebarTab === 'Final Feedback') {
      const newParams = new URLSearchParams(searchParams);

      newParams.delete('round');
      newParams.set('tab', '1');

      setSearchParams(newParams, { replace: true });
      setActiveSidebarTab('Resume Screening');
    }
  };

  const candidateRounds = candidate?.interviewRounds || [];

  const getCurrentRoundSequence = (): number | undefined => {
    const currentRoundId = candidate?.nextRoundDetails?.currentRound?.id;
    if (currentRoundId) {
      const mappedRound = candidate?.interviewRounds?.find((r: any) => r.id === currentRoundId);
      const mappedSequence = Number((mappedRound as any)?.sequence);
      if (Number.isFinite(mappedSequence) && mappedSequence > 0) return mappedSequence;
    }

    const latestSequence = Number(
      candidate?.interviewRounds?.[candidate.interviewRounds.length - 1]?.sequence
    );
    return Number.isFinite(latestSequence) && latestSequence > 0 ? latestSequence : undefined;
  };

  const getNextRoundName = () => {
    const nextRoundName = candidate?.nextRoundDetails?.nextRound?.round?.name;
    if (!nextRoundName) return undefined;

    // Use the sequence from nextRoundDetails.nextRound first — it is the most
    // authoritative source and correctly identifies the specific next round even
    // when multiple rounds share the same round-type ID (e.g. multiple In-person rounds).
    const directNextSequence = Number((candidate as any)?.nextRoundDetails?.nextRound?.sequence);
    if (Number.isFinite(directNextSequence) && directNextSequence > 0) {
      return formatRoundLabel(
        nextRoundName,
        getDisplayRoundNumber(candidateRounds, directNextSequence)
      );
    }

    // Fallback: resolve by round-type ID (may be inaccurate when round types repeat)
    const nextRoundId = (candidate as any)?.nextRoundDetails?.nextRound?.round?.id;
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

    const currentSequence = getCurrentRoundSequence();
    const inferredNextDisplayNumber = getDisplayRoundNumber(candidateRounds, currentSequence);
    return formatRoundLabel(
      nextRoundName,
      inferredNextDisplayNumber ? inferredNextDisplayNumber + 1 : 1
    );
  };
  const getCurrentRoundName = () => {
    const currentRoundId = candidate?.nextRoundDetails?.currentRound?.id;
    if (currentRoundId) {
      const mappedRound = candidate?.interviewRounds?.find((r: any) => r.id === currentRoundId);
      const mappedRoundName = (mappedRound as any)?.round?.name;
      const mappedRoundSequence = Number((mappedRound as any)?.sequence);
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

    const latestRound = candidate?.interviewRounds?.[candidate.interviewRounds.length - 1];
    const latestSequence = Number((latestRound as any)?.sequence);
    return formatRoundLabel(
      latestRound?.round?.name,
      getDisplayRoundNumber(
        candidateRounds,
        Number.isFinite(latestSequence) && latestSequence > 0 ? latestSequence : undefined
      )
    );
  };

  const getNextPendingRound = (): InterviewRoundResponseDTO | null => {
    const normalizeValue = (value?: string): string =>
      (value || '').trim().toUpperCase().replace(/[\s-]/g, '_');

    const rounds = candidate?.interviewRounds || [];
    const nextRoundDetails = (candidate as any)?.nextRoundDetails?.nextRound;
    const nextRoundId = Number(nextRoundDetails?.id);
    const nextRoundSequence = Number(nextRoundDetails?.sequence);
    const nextRoundName = nextRoundDetails?.round?.name;

    const explicitNextRound = rounds.find((round: any) => {
      const normalizedStatus = normalizeValue(round?.interviewStatus);
      const isPending = !round?.interviewStatus || normalizedStatus === 'NOT_SCHEDULED';
      if (!isPending) return false;

      if (Number.isFinite(nextRoundId) && nextRoundId > 0) {
        return Number(round?.id) === nextRoundId;
      }

      if (Number.isFinite(nextRoundSequence) && nextRoundSequence > 0) {
        return Number(round?.sequence) === nextRoundSequence;
      }

      if (nextRoundName) {
        return (round?.round?.name || '').trim() === String(nextRoundName).trim();
      }

      return false;
    });

    if (explicitNextRound) {
      return explicitNextRound;
    }

    const pendingRound = rounds.find((round: any) => {
      const normalizedStatus = normalizeValue(round?.interviewStatus);
      return !round?.interviewStatus || normalizedStatus === 'NOT_SCHEDULED';
    });
    return pendingRound || null;
  };

  const isDecisionPendingState = (): boolean => {
    if (candidate?.status?.toUpperCase() === 'DECISION_PENDING') {
      return true;
    }

    const nextRoundName = getNextRoundName();
    return (nextRoundName || '').toUpperCase().includes('DECISION PENDING');
  };

  const handleAdvanceInviteRequested = async (): Promise<void> => {
    const normalizeRoundType = (roundType?: string): string =>
      (roundType || '').trim().toUpperCase().replace(/[\s-]/g, '_');

    const isVideoRoundType = (roundType?: string): boolean => {
      const normalizedRoundType = normalizeRoundType(roundType);
      return normalizedRoundType.includes('VIDEO');
    };

    const isInPersonRoundType = (roundType?: string): boolean => {
      const normalizedRoundType = normalizeRoundType(roundType);
      return normalizedRoundType.includes('IN_PERSON');
    };

    if (selectedModalStatus !== StatusModalType.ADVANCE || isDecisionPendingState()) {
      return;
    }

    const nextPendingRound = getNextPendingRound();
    if (!nextPendingRound) {
      const nextRoundDetails = (candidate as any)?.nextRoundDetails?.nextRound;
      const fallbackRoundType =
        nextRoundDetails?.roundType || nextRoundDetails?.round?.roundType || undefined;
      const normalizedFallbackRoundType = normalizeRoundType(fallbackRoundType);
      const fallbackInterviewRoundId = Number(nextRoundDetails?.id);

      if (
        Number.isFinite(fallbackInterviewRoundId) &&
        fallbackInterviewRoundId > 0 &&
        (normalizedFallbackRoundType.includes('VIDEO') ||
          normalizedFallbackRoundType.includes('IN_PERSON'))
      ) {
        setInterviewRecordForSchedule({
          id: fallbackInterviewRoundId,
          jobId: Number(jobIdFromParams),
          candidateId: Number(candidateId),
          roundType: normalizedFallbackRoundType.includes('IN_PERSON') ? 'IN_PERSON' : 'VIDEO',
          firstName: candidate?.firstName || '',
          lastName: candidate?.lastName || '',
          round: {
            id: Number(nextRoundDetails?.round?.id || 0),
            name: String(nextRoundDetails?.round?.name || ''),
            companyId: 0,
            createdAt: '',
            status: true,
            updatedAt: '',
          },
          description: '',
          isCompleted: false,
          externalBookingId: '',
          interviewRoundId: fallbackInterviewRoundId,
          interviewStatus: 'NOT_SCHEDULED',
          interviewStatusLabel: 'NOT SCHEDULED',
          interviewerList: [],
          score: '',
          sequence: Number(nextRoundDetails?.sequence || 0),
          startTime: '',
          videoInterviewFeedback: '',
          skipReason: '',
          cancellationReason: '',
          bookingSentAt: null,
          interviewLocation: '',
          interviewDurationInMinutes: 0,
        } as InterviewRoundResponseDTO);
        resetInterviewerData();
        setShowScheduleModal(true);
        return;
      }

      showToast({
        message: 'Candidate advanced, but no schedulable next round was found.',
        type: 'warning',
      });
      return;
    }

    const nextRoundType =
      nextPendingRound?.roundType ||
      (nextPendingRound as any)?.round?.roundType ||
      (candidate as any)?.nextRoundDetails?.nextRound?.roundType ||
      (candidate as any)?.nextRoundDetails?.nextRound?.round?.roundType;

    if (normalizeRoundType(nextRoundType) === 'AI') {
      const payload = {
        candidateId: Number(candidateId),
        jobId: Number(nextPendingRound?.jobId || jobIdFromParams),
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

    if (isVideoRoundType(nextRoundType) || isInPersonRoundType(nextRoundType)) {
      const normalizedRecordRoundType = isInPersonRoundType(nextRoundType)
        ? 'IN_PERSON'
        : isVideoRoundType(nextRoundType)
          ? 'VIDEO'
          : nextPendingRound.roundType;

      setInterviewRecordForSchedule({
        ...nextPendingRound,
        roundType: normalizedRecordRoundType,
        firstName: candidate?.firstName || '',
        lastName: candidate?.lastName || '',
        candidateId: Number(candidateId),
        jobId: Number(nextPendingRound?.jobId || jobIdFromParams),
      });
      resetInterviewerData();
      setShowScheduleModal(true);
      return;
    }

    showToast({
      message: `Candidate advanced, but invite is not supported for ${nextPendingRound.roundType || 'this round type'}.`,
      type: 'warning',
    });
  };

  const handleAdvanceScheduleSubmit = async () => {
    if (!interviewRecordForSchedule) {
      return;
    }

    const normalizeRoundType = (value?: string): string =>
      (value || '').trim().toUpperCase().replace(/[\s-]/g, '_');
    const roundType = normalizeRoundType(interviewRecordForSchedule.roundType);
    let payload: Record<string, unknown> = {};

    if (roundType.includes('VIDEO')) {
      payload = {
        candidateId: Number(interviewRecordForSchedule?.candidateId),
        jobId: Number(interviewRecordForSchedule?.jobId || jobIdFromParams),
        interviewRoundId: Number(interviewRecordForSchedule?.id),
        videoInterviewScheduleRequestDto: {
          hostsId: interviewerData.interviewerIds || [],
          lengthInMinutes: Number(interviewerData?.interviewSlotDuration),
        },
      };
    }

    if (roundType.includes('IN_PERSON')) {
      payload = {
        candidateId: Number(interviewRecordForSchedule?.candidateId),
        jobId: Number(interviewRecordForSchedule?.jobId || jobIdFromParams),
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
        } else {
          showToast({
            message: get(res, 'message', 'Failed to schedule interview'),
            type: 'error',
          });
        }
      })
      .catch((err) => {
        showToast({
          message: get(err, 'data.message', 'Something went wrong while scheduling interview.'),
          type: 'error',
        });
      });
  };
  const isAdvanceButtonDisabled = () => {
    if (
      candidate?.status?.toUpperCase() === 'SELECTED' ||
      candidate?.status?.toUpperCase() === 'NOT_SELECTED'
    ) {
      return true;
    }
    if (candidate?.resumeStatus?.toUpperCase() === 'REVIEW_AWAITED') {
      return false;
    }
    if (!candidate?.interviewRounds?.length) {
      return false;
    }

    const rounds = candidate.interviewRounds;

    const currentRoundIndex = rounds.findIndex((round) => {
      const status = round?.interviewStatus;
      return ![
        InterviewEnum.INTERVIEW_COMPLETED,
        InterviewEnum.SHORTLISTED,
        InterviewEnum.CANDIDATE_REJECTED,
        InterviewEnum.INTERVIEW_SKIPPED,
        InterviewEnum.BOOKING_CANCELLED,
        InterviewEnum.NO_SHOW,
        InterviewEnum.AI_CALL_NOT_COMPLETED,
      ].includes(status as InterviewEnum);
    });
    if (currentRoundIndex === -1) {
      return true;
    }

    const currentRound = rounds[currentRoundIndex];
    const currentRoundStatus = currentRound?.interviewStatus;

    if (currentRoundStatus) {
      return true;
    }

    if (currentRoundIndex === 0) {
      return true;
    }

    const previousRound = rounds[currentRoundIndex - 1];
    const isPreviousRoundCompleted =
      previousRound?.interviewStatus === InterviewEnum.INTERVIEW_COMPLETED;

    return !isPreviousRoundCompleted;
  };

  // const isCandidateShortlisted = () => {
  //   return candidate?.resumeStatus === 'SHORTLISTED' || candidate?.resumeStatus === 'Shortlisted';
  // };

  const normalizeStatus = (status?: string): string =>
    (status || '').replace(/[-_]/g, ' ').trim().toUpperCase();

  const isResumeReviewAwaited = [
    normalizeStatus(candidate?.interviewStatus),
    normalizeStatus(candidate?.resumeStatus),
  ].includes('RESUME REVIEW AWAITED');

  const modalContent = getModalContent(selectedModalStatus as any, {
    candidateName: `${candidate?.firstName} ${candidate?.lastName}`,
    currentRound: isResumeReviewAwaited ? 'Resume Screening' : getCurrentRoundName(),
    nextRound: getNextRoundName(),
    isBulkAction: false,
  });

  const showSendInviteCheckbox = (): boolean => {
    if (selectedModalStatus !== StatusModalType.ADVANCE) {
      return false;
    }

    if (isDecisionPendingState()) {
      return false;
    }

    // Check if there's a next round by looking at nextRoundDetails
    const hasNextRound = !!candidate?.nextRoundDetails?.nextRound?.round?.name;
    return hasNextRound;
  };

  const getAdvanceInviteCheckboxLabel = () => {
    const nextRoundName = getNextRoundName() || 'next round';
    return (
      <>
        Send interview invite over email and SMS for <strong>{nextRoundName}</strong>
      </>
    );
  };

  useEventSource({
    type: 'candidate',
    // candidateId: Number(candidateId),
    restUrl: `/candidate/stream?candidateId=${Number(candidateId)}&jobOpeningId=${Number(jobIdFromParams)}`,
    token: getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) ?? '',
    queryParams: {
      ...(currentFilters.sortBy && { sortBy: currentFilters.sortBy }),
      ...(currentFilters.sortDir && { sortDir: currentFilters.sortDir }),
      text: currentFilters.searchQuery,
      ...(currentFilters.internalStatus && { internalStatus: currentFilters.internalStatus }),
      ...(currentFilters.externalStatus &&
        currentFilters.externalStatus !== 'ALL' && {
          externalStatus: currentFilters.externalStatus,
        }),
      ...(currentFilters.roundType && { roundType: currentFilters.roundType }),
      ...(currentFilters.source && { source: currentFilters.source }),
      // page: currentFilters.page,
      // size: currentFilters.size,
    },
    // requestBody: {},
    onMessage: (eventData) => {
      // eventData is null when the SSE connection fails (e.g. network error, token expiry)
      // Ignore null payloads to avoid clearing candidate data and causing render errors
      if (eventData !== null) {
        setCandidate(eventData);
      }
      setIsCandidateLoading(false);
    },
  });
  const initialEnableEdit = locationState.enableEdit || false;
  const [isEditing, setIsEditing] = useState(initialEnableEdit);
  const initialActiveTab = tabFromQuery || locationState.activeTab || '1';
  const initialActiveSidebarTab =
    roundFromQuery || locationState.activeSidebarTab || 'Resume Screening';
  const atsScoreFromState = locationState.atsScore;
  const fullScreenPluginInstance = fullScreenPlugin();
  const atsScore =
    candidate && candidate.id === Number(candidateId)
      ? candidate.atsScore
      : atsScoreFromState || candidate?.atsScore;
  const [activeTab, setActiveTab] = useState<string>(initialActiveTab);
  const [activeSidebarTab, setActiveSidebarTab] = useState<string>(initialActiveSidebarTab);
  const [fileUrl, setFileUrl] = useState<string | undefined>();

  useEffect(() => {
    setIsCandidateLoading(true);
    setCandidate(undefined);
    setFileUrl(undefined);
  }, [candidateId, jobIdFromParams]);
  const [isNotesPanelOpen, setIsNotesPanelOpen] = useState(false);
  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);
  const [isSendSmsModalOpen, setIsSendSmsModalOpen] = useState(false);
  const [isAssignJobModalOpen, setIsAssignJobModalOpen] = useState(false);
  const [isAssignedJobsModalOpen, setIsAssignedJobsModalOpen] = useState(false);
  const [showSmsOptOutWarning, setShowSmsOptOutWarning] = useState(false);
  const smsOptOut = !!(
    candidate?.smsOptOut === true ||
    (candidate?.smsOptOut &&
      typeof candidate.smsOptOut === 'object' &&
      candidate.smsOptOut.isOptedOut === true)
  );
  const [selectedNotesRoundId, setSelectedNotesRoundId] = useState<number | null>(null);
  const [selectedRoundBookingId, setSelectedRoundBookingId] = useState<number | null>(null);
  const [selectedRoundNameForNotes, setSelectedRoundNameForNotes] = useState<string | null>(null);
  const [notesPanelTitle, setNotesPanelTitle] = useState('Candidate Notes');
  // const mimeType = detectMimeTypeFromBase64(candidate?.resumeFilePath || '', 'docx');
  // const fileType = mimeType.includes('word') ? 'docx' : mimeType.includes('pdf') ? 'pdf' : 'doc';
  // const docs = [
  //   {
  //     uri: fileUrl || '',
  //     fileType,
  //   },
  // ];
  const handleBackToList = () => {
    const params = new URLSearchParams({
      page: currentFilters.page.toString(),
      size: currentFilters.size.toString(),
      ...(currentFilters.searchQuery && { searchQuery: currentFilters.searchQuery }),
      ...(currentFilters.internalStatus && {
        internalStatus: currentFilters.internalStatus.toString(),
      }),
      ...(currentFilters.externalStatus && {
        externalStatus: currentFilters.externalStatus.toString(),
      }),
      ...(currentFilters.roundType && {
        roundType: currentFilters.roundType.toString(),
      }),
      ...(currentFilters.source && { source: currentFilters.source }),
      ...(currentFilters.sortBy && { sortBy: currentFilters.sortBy }),
      ...(currentFilters.sortDir && { sortDir: currentFilters.sortDir }),
    });

    navigate(`/jobs/view/${jobIdFromParams}/candidates?${params.toString()}`);
  };

  const { data: allApiCandidateNotes = [] } = useGetCandidateNotesAllQuery(Number(candidateId), {
    skip: !candidate?.id,
  });

  const openCandidateNotes = () => {
    setSelectedNotesRoundId(null);
    setSelectedRoundBookingId(null);
    setSelectedRoundNameForNotes(null);
    setNotesPanelTitle('Candidate Notes');
    setIsNotesPanelOpen(true);
  };

  const openRoundNotes = (interviewRoundId: number, roundName?: string) => {
    const label = roundName?.trim() || 'Round';
    const interview = candidate?.interviewRounds?.find(
      (r: { id?: number }) => Number(r.id) === interviewRoundId
    );
    const booking =
      Number(
        (interview as { interviewBookingId?: number; id?: number } | undefined)
          ?.interviewBookingId ??
          (interview as { id?: number } | undefined)?.id ??
          interviewRoundId
      ) || null;
    setSelectedNotesRoundId(interviewRoundId);
    setSelectedRoundBookingId(booking);
    setSelectedRoundNameForNotes(label);
    setNotesPanelTitle(`Candidate Notes - ${label}`);
    setIsNotesPanelOpen(true);
  };

  const resumeScreeningInterviewRound = useMemo(
    () => findResumeScreeningInterviewRound(candidate?.interviewRounds),
    [candidate?.interviewRounds]
  );

  const openResumeScreeningNotes = () => {
    if (resumeScreeningInterviewRound) {
      // Match Assessment sidebar label ("Resume Screening"), not the job round name from the API.
      openRoundNotes(Number(resumeScreeningInterviewRound.id), 'Resume Screening');
    } else {
      openCandidateNotes();
    }
  };

  const resumeScreeningNotesCount = useMemo(() => {
    if (!resumeScreeningInterviewRound) {
      return allApiCandidateNotes.length;
    }
    return countNotesForRound(
      Number(resumeScreeningInterviewRound.id),
      resumeScreeningInterviewRound.interviewBookingId,
      allApiCandidateNotes
    );
  }, [resumeScreeningInterviewRound, allApiCandidateNotes]);

  const candidateEmail = (candidate?.email ?? '').trim();

  const { canSms, smsPhoneTarget, smsPhoneDisplay } = useMemo(() => {
    if (!candidate) {
      return { canSms: false, smsPhoneTarget: '', smsPhoneDisplay: '' };
    }
    const info = getSmsInfoForCandidate(candidate);
    return {
      canSms: info.canSms,
      smsPhoneTarget: info.smsPhoneTarget,
      smsPhoneDisplay: info.smsPhoneDisplay,
    };
  }, [candidate]);

  // Download CV
  const handleDownload = () => {
    const resumeUrl = fileUrl; // Use the generated file URL
    if (!resumeUrl) {
      console.error('Resume URL is not available.');
      return;
    }
    const link = document.createElement('a');
    link.href = resumeUrl;
    const fileName = `${candidate?.firstName || 'FirstName'}-${candidate?.lastName || 'LastName'}.pdf`;
    link.download = fileName;
    link.click();
  };
  const shouldBlockResumeScore = () => {
    if (!candidate?.interviewRounds || candidate.interviewRounds.length === 0) {
      return false;
    }

    const lastRound = candidate.interviewRounds[candidate.interviewRounds.length - 1];
    const lastRoundStatus = lastRound?.interviewStatusLabel?.toUpperCase();
    return lastRoundStatus === 'SELECTED' || lastRoundStatus === 'NOT_SELECTED';
  };

  const isResumeScoreBlocked = shouldBlockResumeScore();

  const handleTabChange = (key: string) => {
    setActiveTab(key);

    const newParams = new URLSearchParams(searchParams);

    if (key !== '1') {
      newParams.set('tab', key);
      if (newParams.has('round')) {
        newParams.delete('round');
      }
    } else {
      newParams.set('tab', '1');
    }

    setSearchParams(newParams, { replace: true });
  };

  const handleSidebarTabChange = (key: string) => {
    setActiveSidebarTab(key);

    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', '1');
    newParams.set('round', key);

    setSearchParams(newParams, { replace: true });
  };
  const formatStatus = (status: string | undefined): string => {
    if (!status) return 'NOT SCHEDULED';

    const upperStatus = status.toUpperCase();
    const underScoreToSpace = upperStatus.replace(/_/g, ' ');
    if (underScoreToSpace === 'BOOKING CREATED') return 'SCHEDULED';

    return underScoreToSpace;
  };
  // const getRoundContext = (rounds: any[]) => {
  //   const currentRoundIndex = rounds.findIndex(
  //     (round) =>
  //       ![
  //         InterviewEnum.INTERVIEW_COMPLETED,
  //         InterviewEnum.SHORTLISTED,
  //         InterviewEnum.CANDIDATE_REJECTED,
  //         InterviewEnum.INTERVIEW_SKIPPED,
  //       ].includes(round.interviewStatus as InterviewEnum)
  //   );

  //   const currentRound = currentRoundIndex !== -1 ? rounds[currentRoundIndex] : null;

  //   const previousRound = currentRoundIndex > 0 ? rounds[currentRoundIndex - 1] : null;

  //   return {
  //     currentRoundIndex,
  //     currentRound,
  //     previousRound,
  //   };
  // };
  // const getNextActionLabel = (candidate?: CandidateByIdResponse): string => {
  //   if (!candidate) return 'N/A';

  //   if (candidate.resumeStatus?.toUpperCase() === 'PENDING') {
  //     return 'Review Resume Score & Take Decision';
  //   }

  //   const rounds = candidate.interviewRounds || [];
  //   const { currentRoundIndex, currentRound, previousRound } = getRoundContext(rounds);

  //   if (
  //     previousRound?.interviewStatus === InterviewEnum.INTERVIEW_COMPLETED ||
  //     (currentRoundIndex === -1 &&
  //       rounds.length &&
  //       rounds[rounds.length - 1]?.interviewStatus === InterviewEnum.INTERVIEW_COMPLETED)
  //   ) {
  //     const reviewRound = previousRound ?? rounds[rounds.length - 1];

  //     return `Review ${reviewRound.round?.name} Feedback & Take Decision`;
  //   }

  //   if (currentRoundIndex === -1) {
  //     return 'Make Selection Decision';
  //   }

  //   const roundName = currentRound.round?.name || 'Interview';
  //   const status = currentRound.interviewStatus;

  //   if (!currentRound.interviewStatusLabel) {
  //     return `Send ${roundName} Invitation`;
  //   }
  //   if (status === InterviewEnum.INVITATION_SENT && currentRound?.invitationLinkExpired) {
  //     return `Re-send ${roundName} Invitation`;
  //   }
  //   if (status === InterviewEnum.INVITATION_SENT) {
  //     return `Await ${roundName} Scheduling`;
  //   }

  //   if (status === InterviewEnum.BOOKING_CREATED) {
  //     return `Await ${roundName} Completion`;
  //   }
  //   if (
  //     status === InterviewEnum.AI_CALL_IN_PROGRESS ||
  //     status === InterviewEnum.AI_CALLBACK_STARTED
  //   ) {
  //     return `Await ${roundName} Completion`;
  //   }
  //   if (status === InterviewEnum.BOOKING_CANCELLED) {
  //     return `Re-send ${roundName} Invitation`;
  //   }
  //   if (status === InterviewEnum.IN_REVIEW) {
  //     return `Await ${roundName} Completion`;
  //   }
  //   if (
  //     [InterviewEnum.NO_SHOW, InterviewEnum.AI_CALL_NOT_COMPLETED].includes(status as InterviewEnum)
  //   ) {
  //     return `Re-send ${roundName} Invitation`;
  //   }

  //   return 'Unable to determine next step – please review candidate details';
  // };
  const shouldShowFinalFeedback = ['SELECTED', 'NOT_SELECTED'].includes(
    candidate?.status?.toUpperCase() || ''
  );
  const candidateFinalFeedback = candidate?.candidateFinalFeedbackDTO;
  const selectedRejectedFeedbackList = candidateFinalFeedback?.selectedRejectedFeedbackList ?? [];
  const finalDecisionFeedback = selectedRejectedFeedbackList[0];

  const handleAssignedJobChange = (selectedJobId: number): void => {
    if (selectedJobId === Number(jobIdFromParams)) return; // No change needed

    // Find the selected job in assignedJobs to extract candidateId and jobOpeningId
    const selectedJob = Array.isArray(candidate?.assignedJobs)
      ? candidate.assignedJobs.find((job) => Number(job.jobOpeningId) === selectedJobId)
      : null;

    if (!selectedJob) return; // Safety check if job not found

    const selectedCandidateId = Number(selectedJob.candidateId);
    const selectedJobOpeningId = Number(selectedJob.jobOpeningId);

    const params = new URLSearchParams({
      page: currentFilters.page.toString(),
      size: currentFilters.size.toString(),
      ...(currentFilters.searchQuery && { searchQuery: currentFilters.searchQuery }),
      ...(currentFilters.internalStatus && {
        internalStatus: currentFilters.internalStatus.toString(),
      }),
      ...(currentFilters.externalStatus && {
        externalStatus: currentFilters.externalStatus.toString(),
      }),
      ...(currentFilters.roundType && {
        roundType: currentFilters.roundType.toString(),
      }),
      ...(currentFilters.source && { source: currentFilters.source }),
      ...(currentFilters.sortBy && { sortBy: currentFilters.sortBy }),
      ...(currentFilters.sortDir && { sortDir: currentFilters.sortDir }),
    });

    navigate(
      `/jobs/view/${selectedJobOpeningId}/candidates/${selectedCandidateId}/details?${params.toString()}`
    );
  };

  const sidebarItems: SidebarItem[] = [
    {
      key: 'Resume Screening',
      label: 'Resume Screening',
      score: atsScore,
      status: candidate?.resumeStatus ?? '',
      static: true,
      isBlocked: isResumeScoreBlocked,
    },
    ...(candidate?.interviewRounds?.map((interview: any) => {
      const hasScheduledTime =
        interview?.interviewStatusLabel === 'Booking Created' && interview?.startTime;
      const hasInvitationSentTime =
        interview?.interviewStatusLabel === 'Invitation Sent' && interview?.bookingSentAt;
      const videoEvaluation = candidate?.videoInterviewEvaluationDto?.find(
        (item: any) => item?.interviewRoundId === interview.id
      );
      const isVideoRound = interview?.roundType === 'VIDEO';
      const isInPersonRound = interview?.roundType === 'IN_PERSON';
      const aiScore =
        isVideoRound && videoEvaluation?.final_score
          ? Number(videoEvaluation.final_score).toFixed(2)
          : undefined;
      const interviewerScore =
        isVideoRound && videoEvaluation?.averageScore
          ? Number(videoEvaluation.averageScore).toFixed(2)
          : isInPersonRound && candidate?.avgInpersonScoreRaw
            ? Number(candidate.avgInpersonScoreRaw).toFixed(2)
            : undefined;
      return {
        key: interview?.id?.toString(),
        label: interview?.round?.name,
        roundType: interview?.roundType,
        score: Number(interview?.score),
        aiScore: aiScore,
        interviewerScore: interviewerScore,
        status: interview?.interviewStatusLabel,
        bookingCreatedAt: interview?.startTime,
        bookingSentAt: interview?.bookingSentAt,
        displayDate: hasScheduledTime
          ? formattedDate(interview.startTime)
          : hasInvitationSentTime
            ? formattedDate(interview.bookingSentAt)
            : null,
        displayTime: hasScheduledTime
          ? formattedTime(interview.startTime)
          : hasInvitationSentTime
            ? formattedTime(interview.bookingSentAt)
            : null,
        timeType: hasScheduledTime ? 'scheduled' : hasInvitationSentTime ? 'invitation' : null,
      };
    }) || []),
    ...(shouldShowFinalFeedback
      ? [
          {
            key: 'Final Feedback',
            label: 'Final Feedback',
            // roundType: 'FINAL',
            status: candidate?.status || 'N/A',
            finalRating: finalDecisionFeedback?.rating || null,
            static: true,
            // isFinalFeedback: true
          },
        ]
      : []),
  ];
  const renderMainContent = (key: string) => {
    if (key === 'Resume Screening') {
      return (
        <div>
          <ResumeScore
            atsScore={atsScore}
            candidate={candidate}
            isBlocked={isResumeScoreBlocked}
            onOpenNotes={openResumeScreeningNotes}
            notesCount={resumeScreeningNotesCount}
          />
        </div>
      );
    }
    if (key === 'Final Feedback') {
      return (
        <FinalFeedbackDetails
          candidate={candidate}
          onOpenNotes={openCandidateNotes}
          notesCount={allApiCandidateNotes.length}
        />
      );
    }

    const dynamicItem = sidebarItems.find((item) => item.key === key);
    const roundIdForNotes = dynamicItem?.key != null ? Number(dynamicItem.key) : NaN;
    const interviewForNotes = candidate?.interviewRounds?.find(
      (r: InterviewRoundResponseDTO) => Number(r.id) === roundIdForNotes
    );
    const roundNotesCount = Number.isFinite(roundIdForNotes)
      ? countNotesForRound(
          roundIdForNotes,
          interviewForNotes?.interviewBookingId,
          allApiCandidateNotes
        )
      : 0;
    const openThisRoundNotes = () => {
      if (Number.isFinite(roundIdForNotes)) {
        openRoundNotes(roundIdForNotes, dynamicItem?.label);
      }
    };

    switch (dynamicItem?.roundType) {
      case 'AI':
        return (
          <div>
            <AIInterviewDetails
              candidate={candidate}
              roundType={dynamicItem?.roundType}
              interviewRoundId={roundIdForNotes}
              useCultureIntro={Boolean(jobOpeningData?.data?.useCultureIntro)}
              showAIGeneratedFeedback
              showFinalFeedback
              onOpenNotes={openThisRoundNotes}
              notesCount={roundNotesCount}
            />
          </div>
        );
      case 'VIDEO':
        return (
          <div>
            <VideoInterviewDetails
              candidate={candidate}
              roundType={dynamicItem?.roundType}
              interviewRoundId={Number(dynamicItem?.key)}
              showInterviewerFeedback
              showAIGeneratedFeedback
              showFinalFeedback
              key={dynamicItem?.key}
              onOpenNotes={openThisRoundNotes}
              notesCount={roundNotesCount}
            />
          </div>
        );
      case 'IN_PERSON':
        return (
          <div>
            <InPersonInterviewDetails
              candidate={candidate}
              roundType={dynamicItem?.roundType}
              interviewRoundId={Number(dynamicItem?.key)}
              showInterviewerFeedback
              showFinalFeedback
              key={dynamicItem?.key}
              onOpenNotes={openThisRoundNotes}
              notesCount={roundNotesCount}
            />
          </div>
        );
    }
  };

  useEffect(() => {
    if (!candidate?.resumeFilePath) return;
    try {
      const blob = base64toBlob(candidate?.resumeFilePath);
      const url = URL.createObjectURL(blob);
      setFileUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (err) {
      console.error('Error converting base64 to Blob:', err);
    }
  }, [candidate?.resumeFilePath]);
  useEffect(() => {
    if (tabFromQuery) {
      setActiveTab(tabFromQuery);
    }
    if (roundFromQuery) {
      setActiveSidebarTab(roundFromQuery);
    } else {
      setActiveSidebarTab('Resume Screening');
    }
  }, [tabFromQuery, roundFromQuery]);

  return (
    <>
      {isCandidateLoading && <Loader />}
      <div className="flex flex-col mb-6 gap-2">
        <div className="flex justify-end space-x-2">
          <Button
            className="p-2 cursor-pointer flex items-center justify-center hover:underline text-primary"
            onClick={handleBackToList}
            title="Back to Candidate List"
          >
            <span className="text-sm">Back to Candidate List</span>
          </Button>
          <Tooltip
            title={candidate?.previousCandidateId ? 'Previous Candidate' : 'No previous candidate'}
          >
            <span>
              <Button
                className={`p-2 cursor-pointer font-medium flex items-center justify-center ${
                  candidate?.previousCandidateId ? 'hover:bg-gray-50' : 'text-gray-400'
                }`}
                onClick={handlePreviousCandidate}
                disabled={!candidate?.previousCandidateId}
              >
                <MdOutlineKeyboardArrowLeft size={20} />
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={candidate?.nextCandidateId ? 'Next Candidate' : 'No next candidate'}>
            <span>
              <Button
                className={`p-2 cursor-pointer font-medium flex items-center justify-center ${
                  candidate?.nextCandidateId ? 'hover:bg-gray-50' : 'text-gray-400'
                }`}
                onClick={handleNextCandidate}
                disabled={!candidate?.nextCandidateId}
              >
                <MdOutlineKeyboardArrowRight size={20} />
              </Button>
            </span>
          </Tooltip>
        </div>

        <div className="flex-1 bg-white px-6 py-4 shadow-sm rounded-xl">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">
                {makeFirstLetterUpperCase(candidate?.firstName)}{' '}
                {makeFirstLetterUpperCase(candidate?.lastName)}
              </h2>
              {Array.isArray(candidate?.assignedJobs) && candidate.assignedJobs.length > 0 && (
                <button
                  onClick={() => setIsAssignedJobsModalOpen(true)}
                  className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-semibold text-brand-900 bg-brand-300 rounded-full cursor-pointer transition-colors"
                  title="View assigned jobs"
                >
                  {candidate.assignedJobs.length} jobs assigned
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {Array.isArray(candidate?.assignedJobs) && candidate.assignedJobs.length > 0 && (
                  <div className="border border-[var(--border)] py-1 pr-1 pl-3 rounded-3xl w-40 sm:w-50 gap-1 flex items-center">
                    <Select
                      value={Number(jobIdFromParams)}
                      onChange={(value) => {
                        handleAssignedJobChange(value);
                      }}
                      className="w-full custom-select my-select-with-divider"
                      options={candidate.assignedJobs.map((job) => ({
                        label: `${job.jobTitle}${Number(job.jobOpeningId) === Number(jobIdFromParams) ? ' ' : ''}`,
                        value: job.jobOpeningId,
                      }))}
                      placeholder="Select a job"
                      notFoundContent="No assigned jobs available"
                    />
                  </div>
                )}
                <Tooltip
                  title={candidateEmail ? `Email ${candidateEmail}` : 'No email address on file'}
                >
                  <span className="inline-flex">
                    <button
                      type="button"
                      className={candidateHeaderIconCircle}
                      disabled={!candidateEmail}
                      aria-label="Email candidate"
                      onClick={() => {
                        if (candidateEmail) setIsSendEmailModalOpen(true);
                      }}
                    >
                      <LuMail size={18} strokeWidth={2} aria-hidden />
                    </button>
                  </span>
                </Tooltip>
                <Tooltip title={canSms ? 'Send SMS' : 'No Phone Number'}>
                  <span className="inline-flex">
                    <button
                      type="button"
                      className={canSms ? candidateHeaderIconCircle : candidateHeaderSmsMutedCircle}
                      disabled={!canSms}
                      aria-label={canSms ? 'Send SMS' : 'No phone number'}
                      onClick={() => {
                        if (canSms) {
                          if (smsOptOut) {
                            setShowSmsOptOutWarning(true);
                          } else {
                            setIsSendSmsModalOpen(true);
                          }
                        }
                      }}
                    >
                      <IoChatbubbleEllipses size={18} aria-hidden />
                    </button>
                  </span>
                </Tooltip>
              </div>
              <NotesPillTrigger
                count={allApiCandidateNotes.length}
                onClick={openCandidateNotes}
                tooltip="Candidate notes"
              />
              <span
                className={`text-sm font-medium px-4 py-1.5 rounded-4x1 flex items-center gap-2 ${
                  candidate?.status?.toUpperCase() === 'SELECTED'
                    ? 'text-green-700'
                    : candidate?.status?.toUpperCase() === 'NOT_SELECTED'
                      ? 'text-red-700'
                      : candidate?.status?.toUpperCase() === 'DECISION_PENDING'
                        ? 'text-purple-700'
                        : 'text-brand-700'
                }`}
              >
                {candidate?.status?.toUpperCase() === 'SELECTED' ? (
                  <LuThumbsUp size={16} />
                ) : candidate?.status?.toUpperCase() === 'NOT_SELECTED' ? (
                  <LuThumbsDown size={16} />
                ) : (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      candidate?.status?.toUpperCase() === 'DECISION_PENDING'
                        ? 'bg-purple-500 shadow-lg shadow-purple-400'
                        : 'bg-brand-500 shadow-lg shadow-brand-400'
                    }`}
                  />
                )}
                {candidate?.status?.toUpperCase() === 'SELECTED'
                  ? 'SELECTED'
                  : candidate?.status?.toUpperCase() === 'NOT_SELECTED'
                    ? 'NOT SELECTED'
                    : candidate?.status?.toUpperCase() === 'DECISION_PENDING'
                      ? 'DECISION PENDING'
                      : 'IN PROCESS'}
              </span>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 pr-6 max-w-[28%]">
              <div className="gap-y-1 space-y-1">
                <div className="flex items-center text-sm gap-2">
                  <p className="font-bold">Job ID:</p>
                  <span className="text-gray-500">{candidate?.profileCode}</span>
                </div>

                <div className="flex items-center text-sm gap-2">
                  <p className="font-bold">Job Title:</p>
                  <span className="text-gray-500">{candidate?.jobTitle}</span>
                </div>

                <div className="flex items-start text-sm gap-2">
                  <p className="font-bold">Hiring Manager:</p>
                  <div className="text-gray-500 leading-6">
                    {formattedHiringManagers.map((manager, index) => (
                      <div key={manager}>
                        {manager}
                        {index < formattedHiringManagers.length - 1 ? ',' : ''}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center text-sm gap-2">
                  <p className="font-bold">Application Date:</p>
                  <span className="text-gray-500">{formattedDate(candidate?.applicationDate)}</span>
                </div>
                {/* <div className="flex items-center text-sm gap-2">
                  <p className="font-bold">Bilingual:</p>
                  <span className="font-semibold text-gray-500">
                    {jobOpeningData?.data?.isMultilingual ? 'Yes' : 'No'}
                  </span>
                  <Switch
                    checked={Boolean(jobOpeningData?.data?.isMultilingual)}
                    disabled
                    size="small"
                    style={{
                      backgroundColor: jobOpeningData?.data?.isMultilingual
                        ? 'var(--color-primary)'
                        : undefined,
                    }}
                  />
                </div> */}
                {/* <div className="flex items-center text-sm gap-2">
                  <p className="font-bold">Company Culture Introduction:</p>
                  <span className="font-semibold text-gray-500">
                    {jobOpeningData?.data?.useCultureIntro ? 'On' : 'Off'}
                  </span>
                  <Switch
                    checked={Boolean(jobOpeningData?.data?.useCultureIntro)}
                    disabled
                    size="small"
                    style={{
                      backgroundColor: jobOpeningData?.data?.useCultureIntro
                        ? 'var(--color-primary)'
                        : undefined,
                    }}
                  />
                </div> */}
              </div>
            </div>
            <div className="flex justify-left items-center flex-1 border-l border-gray-300 pl-6 pr-2 max-w-[36%]">
              <div className="space-y-2 text-sm w-full">
                <div className="grid grid-cols-[45%_25%_30%] mb-2 border-b border-gray-300">
                  <div className="font-bold text-[16px]">Scored</div>
                  <div className="font-bold text-[16px] text-primary text-right">AI</div>
                  <div className="font-bold text-[16px] text-[green] text-right">Human</div>
                </div>
                <div className="grid grid-cols-[45%_25%_30%] items-center">
                  <div>Overall</div>
                  <div className="text-right text-primary">
                    {['SELECTED', 'NOT_SELECTED', 'DECISION_PENDING'].includes(
                      candidate?.status?.toUpperCase() || ''
                    ) && candidate?.overallAiScoreOutOf5
                      ? `${candidate?.overallAiScoreOutOf5}/5`
                      : 'N/A'}
                  </div>
                  <div className="text-right text-[green]">
                    {['SELECTED', 'NOT_SELECTED', 'DECISION_PENDING'].includes(
                      candidate?.status?.toUpperCase() || ''
                    ) && finalDecisionFeedback
                      ? `${finalDecisionFeedback.rating}/5`
                      : 'N/A'}
                  </div>
                </div>
                <div className="grid grid-cols-[45%_25%_30%] items-center">
                  <div>Resume</div>
                  <div className="text-right text-primary">
                    {candidate?.atsScore ? `${candidate.atsScore}/5` : 'N/A'}
                  </div>
                  <div className="text-right text-[green]">
                    {candidate?.resumeRating ? `${candidate.resumeRating}/5` : 'N/A'}
                  </div>
                </div>
                <div className="grid grid-cols-[45%_25%_30%] items-center">
                  <div>AI Audio</div>
                  <div className="text-right text-primary">
                    {' '}
                    {candidate?.aiAudioScoreRaw ? `${candidate.aiAudioScoreRaw}/5` : 'N/A'}
                  </div>
                  <div className="text-right text-[green]">-</div>
                </div>
                <div className="grid grid-cols-[45%_25%_30%] items-center">
                  <div>Video Interview</div>
                  <div className="text-right text-primary">
                    {candidate?.avgAiVideoScoreRaw ? `${candidate.avgAiVideoScoreRaw}/5` : 'N/A'}
                  </div>
                  <div className="text-right text-[green]">
                    {candidate?.avgVideoFeedbackScoreRaw
                      ? `${candidate.avgVideoFeedbackScoreRaw}/5`
                      : 'N/A'}
                  </div>
                </div>
                <div className="grid grid-cols-[45%_25%_30%] items-center">
                  <div>In-person Interview</div>
                  <div className="text-right text-primary">-</div>
                  <div className="text-right text-[green]">
                    {candidate?.avgInpersonScoreRaw ? `${candidate.avgInpersonScoreRaw}/5` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-1 border-l border-gray-300 pl-6 flex-col gap-4 min-w-[36%]">
              <div className="flex items-center gap-3">
                {(() => {
                  const advanceDisabled = isAdvanceButtonDisabled();
                  const finalRoundDisabled = isFinalRoundShortlistDisabled();
                  const actionsDisabled = areCandidateActionsDisabled();
                  const isLastRound = isOnLastRound();

                  const shouldHideAdvance =
                    actionsDisabled || (isLastRound ? finalRoundDisabled : advanceDisabled);

                  return (
                    !shouldHideAdvance && (
                      <Button
                        className="flex items-center justify-center text-sm p-1 h-[34px] w-[50%] gap-2 border rounded-4xl border-[var(--border)] bg-primary"
                        onClick={handleAdvanceClick}
                      >
                        <span className="text-white">ADVANCE</span>
                      </Button>
                    )
                  );
                })()}
                {!areCandidateActionsDisabled() &&
                  candidate?.status?.toUpperCase() !== 'NOT_SELECTED' && (
                    <Button
                      className="flex items-center justify-center text-sm p-1 h-[34px] w-[50%] gap-2 border-2 rounded-4xl border-red-600 bg-red-50 text-red-600 font-semibold hover:bg-red-100"
                      onClick={handleRejectClick}
                      disabled={areCandidateActionsDisabled()}
                    >
                      <span>REJECT</span>
                    </Button>
                  )}
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-3 w-full">
                  {candidate?.status?.toUpperCase() === 'SELECTED' ||
                  candidate?.status?.toUpperCase() === 'NOT_SELECTED' ? (
                    ''
                  ) : (
                    <Button
                      className="flex items-center justify-center text-sm p-1 h-[34px] w-[50%] gap-2 border-2 rounded-4xl border-green-500 bg-green-50"
                      onClick={() => handleStatusChange('SELECTED')}
                      disabled={isResumeProcessingFailed()}
                    >
                      <span className="text-green-700 font-semibold">MARK AS SELECTED</span>
                    </Button>
                  )}
                  <Button
                    className="flex items-center justify-center text-sm p-1 h-[34px] w-[50%] gap-2 border-2 rounded-4xl border-brand-500 bg-brand-50"
                    onClick={() => setIsAssignJobModalOpen(true)}
                  >
                    <span className="text-brand-500 font-semibold">ASSIGN NEW JOB</span>
                  </Button>
                </div>
              </div>
              {/* {!['NOT_SELECTED', 'SELECTED'].includes(candidate?.status?.toUpperCase()) && (
                <p className="text-sm font-semibold">
                  Next Action:{' '}
                  <span className="text-gray-500">
                    {isResumeProcessingFailed() ? 'N/A' : getNextActionLabel(candidate)}
                  </span>
                </p>
              )} */}
            </div>
          </div>
          {isResumeProcessingFailed() && (
            <div className="mt-4">
              <p className="text-sm text-red-500">
                The candidate actions are disabled as the resume processing got failed!
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col bg-[#FAFAFA] rounded-2xl overflow-hidden">
        <div className="px-6">
          <Tabs
            defaultActiveKey="1"
            activeKey={activeTab}
            onChange={handleTabChange}
            className="view-candidate-tabs"
            tabBarExtraContent={
              activeTab === '2' ? (
                <div className="flex items-center gap-1 ">
                  {hasFeatureAccess('job_opening', 'create', role, effectivePermissions) && (
                    <Button
                      className={
                        isEditing
                          ? 'box-border inline-flex h-8 w-30 items-center justify-center whitespace-nowrap rounded-full border border-gray-300 px-4 text-xs font-medium leading-none cursor-pointer'
                          : 'box-border inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-gray-300 px-3 text-xs font-medium leading-none cursor-pointer'
                      }
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {!isEditing ? <FiEdit2 size={14} className="shrink-0" /> : null}
                      <span>{isEditing ? 'CANCEL' : 'EDIT DETAILS'}</span>
                    </Button>
                  )}

                  {candidate?.linkedInProfile ? (
                    <a
                      href={candidate?.linkedInProfile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="box-border inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border)] px-3 text-xs font-medium leading-none cursor-pointer"
                    >
                      <FaLink size={12} className="shrink-0" />
                      <span>LINKEDIN PROFILE</span>
                    </a>
                  ) : null}

                  {candidate && candidate?.resumeFilePath && (
                    <Button
                      className="box-border inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-transparent bg-primary px-3 text-xs font-medium leading-none text-white cursor-pointer"
                      onClick={handleDownload}
                    >
                      <FaArrowDown size={12} className="shrink-0" />
                      <span>DOWNLOAD RESUME</span>
                    </Button>
                  )}
                </div>
              ) : null
            }
          >
            <Tabs.TabPane
              tab={
                <span className="text-[15px] heading-font whitespace-nowrap">
                  Candidate Details
                </span>
              }
              key="2"
            />
            <Tabs.TabPane
              tab={<span className="text-[15px] heading-font whitespace-nowrap">Assessment</span>}
              key="1"
            />
            <Tabs.TabPane
              tab={
                <span className="text-[15px] heading-font whitespace-nowrap">
                  Interview Scheduling
                </span>
              }
              key="3"
            />
            <Tabs.TabPane
              tab={
                <span className="text-[15px] heading-font whitespace-nowrap">
                  SMS Communication
                </span>
              }
              key="4"
            />
          </Tabs>
        </div>

        {/* Tab Content */}
        <div className="flex flex-col">
          {activeTab === '2' && (
            <div className="flex gap-6">
              <EditCandidate
                key={candidate?.id}
                candidate={candidate}
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                isCandidateLoading={isCandidateLoading}
                isMultilingualJob={jobOpeningData?.data?.isMultilingual || false}
                smsOptOut={smsOptOut}
              />
              <div>
                {fileUrl ? (
                  <>
                    <div
                      className="relative w-[300px] h-[380px] rounded-lg overflow-auto cursor-pointer"
                      onClick={() => {
                        window.open(fileUrl, '_target');
                      }}
                    >
                      <BsFullscreen
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-black cursor-pointer z-50"
                        size={24}
                      />
                      <div className="pdf-fullscreen-viewer w-full h-full overflow-auto">
                        <Viewer
                          fileUrl={fileUrl}
                          plugins={[fullScreenPluginInstance]}
                          defaultScale={0.47}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-gray-500 mt-4">No resume available</p>
                )}
              </div>
            </div>
          )}
          {activeTab === '3' && (
            <InterviewSummary
              candidateId={Number(candidateId)}
              // refetch={refetch}
              candidate={candidate}
              onOpenRoundNotes={openRoundNotes}
              allNotesForCounts={allApiCandidateNotes}
            />
          )}

          {activeTab === '4' && (
            <div className="p-4">
              <SmsCommunicationTab
                candidateId={Number(candidateId)}
                jobOpeningId={Number(jobIdFromParams)}
                smsPhoneTarget={smsPhoneTarget}
                smsOptOut={smsOptOut}
              />
            </div>
          )}

          {activeTab === '1' && (
            <div className="flex h-full min-h-[633px] gap-4">
              <div className="w-1/5 bg-white rounded-lg border border-gray-200 overflow-y-auto">
                <ul className="text-sm font-medium text-gray-800 text-center">
                  {sidebarItems?.map((item: any, index: number) => (
                    <li key={index} className="relative">
                      <div
                        className="py-5 px-2 cursor-pointer"
                        onClick={() => handleSidebarTabChange(item.key)}
                      >
                        <Button
                          className={`cursor - pointer ${
                            activeSidebarTab === item?.key ? 'text-primary font-bold' : ''
                          }`}
                        >
                          <h3 className="font-bold">{item?.label}</h3>
                        </Button>
                        <p>Status: {formatStatus(item?.status)}</p>
                        {item.key === 'Final Feedback' && (
                          <div>
                            <span>Final Rating: </span>
                            <div className="flex items-center justify-center gap-2">
                              <Rate
                                disabled
                                value={item.finalRating ? Number(item.finalRating) : 0}
                                // style={{ fontSize: '16px' }}
                              />
                            </div>
                          </div>
                        )}
                        {item.roundType === 'VIDEO' && (item.aiScore || item.interviewerScore) ? (
                          <div>
                            {item.aiScore && (
                              <p>
                                <span>AI Score: </span>
                                {item.aiScore}/5
                              </p>
                            )}
                            {item.interviewerScore && (
                              <p>
                                <span>Interviewer(s) Score: </span>
                                {item.interviewerScore}/5
                              </p>
                            )}
                          </div>
                        ) : null}
                        {item.roundType === 'IN_PERSON' && item.interviewerScore ? (
                          <div>
                            <p>
                              <span>Interviewer(s) Score: </span>
                              {item.interviewerScore}/5
                            </p>
                          </div>
                        ) : null}
                        {item?.displayDate && item?.displayTime && (
                          <div className="mt-2 text-xs text-black">
                            <div className="flex items-center justify-center gap-1">
                              <span>
                                {item.timeType === 'scheduled' ? 'Scheduled on: ' : 'Sent: '}
                                {item.displayDate}
                              </span>
                            </div>
                            <div className="flex items-center justify-center gap-1">
                              <span>At: {item.displayTime}</span>
                            </div>
                          </div>
                        )}
                        {item?.score ? (
                          <p>
                            <span>
                              Score:{' '}
                              {item?.key === 'Resume Screening'
                                ? `${item?.score}/5`
                                : `${item?.score}/5`}
                            </span>
                          </p>
                        ) : null}
                      </div>
                      {activeSidebarTab === item.key && (
                        <div className="absolute left-0 top-0 h-full w-1 bg-primary"></div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6">
                {renderMainContent(activeSidebarTab)}
              </div>
            </div>
          )}
        </div>
      </div>
      <CandidateNotesPanel
        open={isNotesPanelOpen}
        onClose={() => {
          setIsNotesPanelOpen(false);
          setSelectedNotesRoundId(null);
          setSelectedRoundBookingId(null);
          setSelectedRoundNameForNotes(null);
        }}
        title={notesPanelTitle}
        candidateId={Number(candidateId)}
        roundBookingId={selectedRoundBookingId}
        roundContext={
          selectedNotesRoundId != null
            ? {
                roundId: selectedNotesRoundId,
                roundName: selectedRoundNameForNotes || 'Round',
              }
            : null
        }
        layout={selectedNotesRoundId != null ? 'compact' : 'default'}
      />
      <SendEmailToCandidateModal
        open={isSendEmailModalOpen}
        onClose={() => setIsSendEmailModalOpen(false)}
        candidate={candidate ?? null}
        jobOpeningId={Number(jobIdFromParams)}
      />
      <SendSmsToCandidateModal
        open={isSendSmsModalOpen}
        onClose={() => setIsSendSmsModalOpen(false)}
        candidate={candidate ?? null}
        jobOpeningId={Number(jobIdFromParams)}
        smsPhoneTarget={smsPhoneTarget}
        phoneDisplay={smsPhoneDisplay}
      />
      {showSmsOptOutWarning && (
        <ConfirmationModal
          title="This candidate has opted out of SMS communication. Do you still want to continue sending SMS to this candidate?"
          confirmText="CONTINUE SENDING"
          cancelText="CANCEL"
          onClose={() => setShowSmsOptOutWarning(false)}
          onConfirm={() => {
            setShowSmsOptOutWarning(false);
            setIsSendSmsModalOpen(true);
          }}
        />
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
          candidateIds={[Number(candidateId)]}
          statusType={selectedModalStatus}
          candidateNames={[`${candidate?.firstName} ${candidate?.lastName}`]}
          onStatusUpdate={handleStatusUpdateSuccess}
          showSendInviteCheckbox={showSendInviteCheckbox()}
          sendInviteCheckboxLabel={getAdvanceInviteCheckboxLabel()}
          onAdvanceInviteRequested={handleAdvanceInviteRequested}
          currentRoundId={
            selectedModalStatus === StatusModalType.FINAL_ROUND_SHORTLIST
              ? candidate?.interviewRounds?.[candidate.interviewRounds.length - 1]?.id || null
              : candidate?.nextRoundDetails?.currentRound?.id || null
          }
          candidateDetails={[
            {
              candidateId: Number(candidateId),
              jobOpeningId: Number(jobIdFromParams),
              roundId:
                selectedModalStatus === StatusModalType.FINAL_ROUND_SHORTLIST
                  ? candidate?.interviewRounds?.[candidate.interviewRounds.length - 1]?.id || null
                  : selectedModalStatus === StatusModalType.ADVANCE && isOnLastRound()
                    ? candidate?.interviewRounds?.[candidate.interviewRounds.length - 1]?.id || null
                    : candidate?.nextRoundDetails?.currentRound?.id || null,
              candidateName: `${candidate?.firstName} ${candidate?.lastName}`,
              // isResumeStatusUpdated: candidate?.isResumeStatusUpdated || false,
              interviewRounds: candidate?.interviewRounds || [],
              resumeStatus: candidate?.resumeStatus || '',
              status: candidate?.status || '',
              interviewStatus: candidate?.interviewStatus || '',
              nextRound:
                candidate?.nextRoundDetails?.nextRound?.round ||
                (isOnLastRound() ? { name: 'Decision Pending' } : undefined),
            },
          ]}
        />
      </AntdCommonModal>

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
                  ((interviewRecordForSchedule.roundType || '')
                    .trim()
                    .toUpperCase()
                    .replace(/[\s-]/g, '_')
                    .includes('VIDEO') &&
                    (!interviewerData?.interviewSlotDuration ||
                      interviewerData?.interviewerIds?.length === 0)) ||
                  ((interviewRecordForSchedule.roundType || '')
                    .trim()
                    .toUpperCase()
                    .replace(/[\s-]/g, '_')
                    .includes('IN_PERSON') &&
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
      <AssignJobModal
        open={isAssignJobModalOpen}
        onClose={() => setIsAssignJobModalOpen(false)}
        candidateId={Number(candidateId)}
        candidateName={`${candidate?.firstName ?? ''} ${candidate?.lastName ?? ''}`.trim()}
        assignedJobs={Array.isArray(candidate?.assignedJobs) ? candidate.assignedJobs : []}
        onAssignSuccess={() => {
          setIsAssignJobModalOpen(false);
        }}
      />
      <AssignedJobsModal
        open={isAssignedJobsModalOpen}
        onClose={() => setIsAssignedJobsModalOpen(false)}
        assignedJobs={Array.isArray(candidate?.assignedJobs) ? candidate.assignedJobs : []}
        selectedJobId={Number(jobIdFromParams)}
        onJobSelect={(jobId) => {
          handleAssignedJobChange(jobId);
          setIsAssignedJobsModalOpen(false);
        }}
      />
    </>
  );
};

export default ViewCandidateDetails;
