import { LuCalendarDays, LuCalendarOff, LuPencil, LuSquarePen } from 'react-icons/lu';
import { RxClock } from 'react-icons/rx';
import { FaInfoCircle, FaEnvelope } from 'react-icons/fa';
import { Button, showToast } from '../../../shared';
import {
  CancelBookingRequest,
  CandidateByIdResponse,
  InterviewRoundResponseDTO,
  SkipInterviewRoundRequest,
  SubstituteInterviewerRequest,
  UpdateInterviewStatusRequest,
} from '../../../../types';
import {
  useScheduleInterviewMutation,
  useCancelInterviewBookingMutation,
  useSkipInterviewRoundMutation,
  useStatusUpdateMutation,
  useSubstituteInterviewerMutation,
} from '../../../../api/candidate-service/Candidates/Candidates';
import { get } from 'lodash-es';
import {
  arraysEqual,
  formatRoundLabel,
  formattedDate,
  formattedTime,
  getDisplayRoundNumber,
  // getStatusStyle,
  resolveRoundSequenceByRound,
  safeDecodeToken,
} from '../../../../shared/utils/methods';
import { InterviewEnum, StatusModalType } from '../../../../shared/utils/enums';
import { Loader } from '../../../shared/ui/loader';
import VideoInterviewRound from './VideoInterviewRound';
import { useRef, useState, useEffect } from 'react';
import ScheduleInterviewModal from '../Modal/ScheduleInterviewModal';
import CommonModal from '../Modal/CommonModal';
import InterviewFeedback from './InterviewFeedback';
import { Modal, Select, Tooltip } from 'antd';
import { roundTypeOptions } from '../../../../shared/utils/business-logic';
import ConfirmationModal from '../../../shared/ui/ConfirmationModal';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import NotifyCandidateModal from '../Modal/NotifyCandidateModal';
import CandidateStatus from '../CandidateStatus';
import type { CandidateNoteItem } from '../../Notes/notesTypes';

function countNotesForInterview(
  interview: InterviewRoundResponseDTO,
  apiNotes: CandidateNoteItem[]
): number {
  const rid = Number(interview.id);
  const bid = Number(interview.interviewBookingId ?? interview.id);
  return apiNotes.filter((n) => {
    const nr = n.roundId != null ? Number(n.roundId) : NaN;
    const nb = n.bookingId != null ? Number(n.bookingId) : NaN;
    return nr === rid || nb === rid || nr === bid || nb === bid;
  }).length;
}

type RoundCardProps = {
  candidateId?: number;
  candidate?: CandidateByIdResponse;
  onOpenRoundNotes?: (roundId: number, roundName?: string) => void;
  allNotesForCounts?: CandidateNoteItem[];
};

type InterviewerDataType = {
  interviewerName: string[];
  interviewerIds?: string[];
  interviewSlotDuration?: number;
  interviewLocation?: string;
};

const InterviewRounds: React.FC<RoundCardProps> = ({
  candidateId,
  candidate,
  onOpenRoundNotes,
  allNotesForCounts = [],
}) => {
  const [status, setStatus] = useState<string>('');
  const selectedLabel = roundTypeOptions.find((opt) => opt.value === status)?.label || '';
  const isCallEnquiryFeatureEnabled = import.meta.env.VITE_CALL_EXPIRY_FEATURE === 'true';
  const [showStatusModal, setShowStatusModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [interviewRecord, setInterviewRecord] = useState<InterviewRoundResponseDTO>();
  const [interviewerData, setInterviewerData] = useState<InterviewerDataType>({
    interviewerName: [],
    interviewerIds: [],
    interviewSlotDuration: 15,
    interviewLocation: '',
  });
  const [reason, setReason] = useState<string>('');
  const interviewRounds = candidate?.interviewRounds ?? [];
  console.log('interviewRounds', interviewRounds);
  const [scheduleInterview, { isLoading: isScheduleLoading }] = useScheduleInterviewMutation();
  const [substituteInterviewer, { isLoading: isSubstituteLoading }] =
    useSubstituteInterviewerMutation();
  const [statusUpdate, { isLoading: isStatusUpdateLoading }] = useStatusUpdateMutation();
  const [cancelInterviewBooking, { isLoading: isCancelLoading }] =
    useCancelInterviewBookingMutation();
  const [skipInterviewRound, { isLoading: isSkipLoading }] = useSkipInterviewRoundMutation();
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyInterviewRecord, setNotifyInterviewRecord] = useState<InterviewRoundResponseDTO>();

  useEffect(() => {
    const isFeedbackFeatureEnabled = import.meta.env.VITE_INTERVIEW_FEEDBACK_FEATURE === 'true';
    if (!isFeedbackFeatureEnabled) return;

    const searchParams = new URLSearchParams(location.search);
    const paramRoundId = searchParams.get('interviewRoundId');
    if (paramRoundId && interviewRounds.length > 0) {
      const round = interviewRounds.find(
        (r) => Number(r.interviewRoundId) === Number(paramRoundId)
      );
      if (round) {
        setInterviewRecord(round);
        setFeedbackModalOpen(true);
      }
    }
  }, [location.search, interviewRounds]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editInterviewRecord, setEditInterviewRecord] = useState<InterviewRoundResponseDTO>();
  const [originalInterviewerData, setOriginalInterviewerData] = useState<InterviewerDataType>({
    interviewerName: [],
    interviewerIds: [],
    interviewSlotDuration: 15,
    interviewLocation: '',
  });
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedModalStatus, setSelectedModalStatus] = useState<StatusModalType>(
    StatusModalType.ADVANCE
  );
  const [currentInterviewForAction, setCurrentInterviewForAction] =
    useState<InterviewRoundResponseDTO>();
  const [skipReloadAfterStatusUpdate, setSkipReloadAfterStatusUpdate] = useState(false);
  const skipReloadAfterStatusUpdateRef = useRef(false);

  const resetInterviewerData = () => {
    setInterviewerData({
      interviewerName: [],
      interviewerIds: [],
      interviewSlotDuration: 15,
      interviewLocation: '',
    });
  };

  const { loginToken } = useSelector((state: any) => state.LoginSlice);
  const isBookingCreated = (interview: InterviewRoundResponseDTO) => {
    return interview?.interviewStatus === InterviewEnum.BOOKING_CREATED;
  };
  const handleInterviewRoundClick = (interview: InterviewRoundResponseDTO) => {
    if (interview?.interviewStatus === InterviewEnum.INTERVIEW_COMPLETED) {
      navigate(`${location.pathname}?tab=1&round=${interview.id}`, { replace: true });
    }
  };
  const handleNotifyCandidate = (interview: InterviewRoundResponseDTO) => {
    setNotifyInterviewRecord(interview);
    setShowNotifyModal(true);
  };
  const handleCloseNotifyModal = () => {
    setShowNotifyModal(false);
    setNotifyInterviewRecord(undefined);
  };

  const decodedToken = safeDecodeToken<{ userId: number }>(loginToken);

  const getInterviewerNames = (interview: InterviewRoundResponseDTO) => {
    if (!interview?.interviewerList || interview.interviewerList.length === 0) {
      return [];
    }
    return interview.interviewerList.map((interviewer) => interviewer.fullName);
  };
  const getInterviewerIds = (interview: InterviewRoundResponseDTO) => {
    if (!interview?.interviewerList || interview.interviewerList.length === 0) {
      return [];
    }
    return interview.interviewerList
      .map((interviewer) => {
        const rawId = interviewer.hostId ?? interviewer.userId;
        const normalizedId = Number(rawId);
        return Number.isFinite(normalizedId) && normalizedId > 0 ? normalizedId : null;
      })
      .filter((id): id is number => id !== null);
  };

  const normalizeRoundType = (value?: string): string =>
    (value || '').trim().toUpperCase().replace(/[\s-]/g, '_');

  const resolveRoundType = (round?: any): string => {
    return normalizeRoundType(
      round?.roundType ||
        round?.round?.roundType ||
        (candidate as any)?.nextRoundDetails?.nextRound?.roundType ||
        (candidate as any)?.nextRoundDetails?.nextRound?.round?.roundType
    );
  };

  const onSubmit = async (round: InterviewRoundResponseDTO) => {
    let payload: any;
    switch (resolveRoundType(round)) {
      case 'AI':
        payload = {
          candidateId: Number(candidateId),
          jobId: Number(round?.jobId),
          interviewRoundId: Number(round?.id),
          videoInterviewScheduleRequestDto: {},
          lengthInMinutes: '',
        };
        break;

      case 'VIDEO':
        payload = {
          candidateId: Number(candidateId),
          jobId: Number(round?.jobId),
          interviewRoundId: Number(round?.id),
          videoInterviewScheduleRequestDto: {
            hostsId: interviewerData.interviewerIds || [],
            lengthInMinutes: Number(interviewerData?.interviewSlotDuration),
          },
        };
        break;

      case 'IN_PERSON':
        payload = {
          candidateId: Number(candidateId),
          jobId: Number(round?.jobId),
          interviewRoundId: Number(round?.id),
          inPersonInterviewScheduleRequestDto: {
            hostsId: interviewerData.interviewerIds || [],
            lengthInMinutes: Number(interviewerData?.interviewSlotDuration),
            address: interviewerData?.interviewLocation,
          },
        };
        break;

      default:
        payload = {};
        break;
    }
    scheduleInterview(payload)
      .unwrap()
      .then((res) => {
        if (res?.success) {
          showToast({
            message: get(res, 'message'),
            type: 'success',
          });
          setShowScheduleModal(false);
        } else {
          showToast({
            message: get(res, 'message', 'Failed to schedule interview round'),
            type: 'error',
          });
        }
      })
      .catch((err) => {
        showToast({
          message: get(
            err,
            'data.message',
            'Something went wrong while scheduling the interview round.'
          ),
          type: 'error',
        });
      });
  };

  const handleAdvanceScheduleSubmit = async () => {
    if (!interviewRecord) {
      return;
    }

    const roundType = resolveRoundType(interviewRecord);
    let payload: Record<string, unknown> = {};

    if (roundType.includes('VIDEO')) {
      payload = {
        candidateId: Number(interviewRecord?.candidateId),
        jobId: Number(interviewRecord?.jobId),
        interviewRoundId: Number(interviewRecord?.id),
        videoInterviewScheduleRequestDto: {
          hostsId: interviewerData.interviewerIds || [],
          lengthInMinutes: Number(interviewerData?.interviewSlotDuration),
        },
      };
    }

    if (roundType.includes('IN_PERSON')) {
      payload = {
        candidateId: Number(interviewRecord?.candidateId),
        jobId: Number(interviewRecord?.jobId),
        interviewRoundId: Number(interviewRecord?.id),
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
          setInterviewRecord(undefined);
          resetInterviewerData();
          setSkipReloadAfterStatusUpdate(false);
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

  const onSubmitEdit = async (round: InterviewRoundResponseDTO) => {
    const hostIds = interviewerData.interviewerIds?.map((id) => Number(id)) || [];
    const payload: SubstituteInterviewerRequest = {
      hostsId: hostIds,
      candidateId: Number(candidateId),
      jobId: Number(round?.jobId),
      interviewRoundId: Number(round?.id),
    };

    substituteInterviewer(payload)
      .unwrap()
      .then((res) => {
        if (res?.status === 'OK') {
          showToast({
            message: get(res, 'message', 'Interview updated successfully'),
            type: 'success',
          });
          setShowEditModal(false);
          setEditInterviewRecord(undefined);
          setInterviewerData({
            interviewerName: [],
            interviewerIds: [],
            interviewSlotDuration: 15,
            interviewLocation: '',
          });
          setOriginalInterviewerData({
            interviewerName: [],
            interviewerIds: [],
            interviewSlotDuration: 15,
            interviewLocation: '',
          });
          // window.location.reload()
        } else {
          showToast({
            message: get(res, 'message', 'Failed to update interview'),
            type: 'error',
          });
        }
      })
      .catch((err) => {
        showToast({
          message: get(err, 'data.message', 'Something went wrong while updating the interview.'),
          type: 'error',
        });
      });
  };

  const handleUpdateInterviewStatus = () => {
    updateInterviewStatus({
      externalBookingId: interviewRecord?.externalBookingId ?? '',
      status,
    });
  };

  const updateInterviewStatus = (data: UpdateInterviewStatusRequest) => {
    statusUpdate(data)
      .unwrap()
      .then((res: any) => {
        if (res?.status) {
          showToast({
            message: get(res, 'message'),
            type: 'success',
          });
          setShowStatusModal(false);
          setStatus('');
        } else {
          showToast({
            message: get(res, 'message', 'Failed to update interview status'),
            type: 'error',
          });
        }
      });
  };

  const submitCancelInterview = () => {
    onCancelBooking({
      externalBookingId: interviewRecord?.externalBookingId ?? '',
      reason: reason.trim(),
    });
  };

  const onCancelBooking = async (data: CancelBookingRequest) => {
    cancelInterviewBooking(data)
      .unwrap()
      .then((res) => {
        if (res?.status) {
          showToast({
            message: get(res, 'message'),
            type: 'success',
          });
          setShowCancelModal(false);
          setReason('');
        } else {
          showToast({
            message: get(res, 'message', 'Failed to schedule interview round'),
            type: 'error',
          });
        }
      })
      .catch((err) => {
        showToast({
          message: get(
            err,
            'data.message',
            'Something went wrong while scheduling the interview round.'
          ),
          type: 'error',
        });
      });
  };

  const submitSkipInterview = () => {
    handleSkipInterview({
      candidateId: Number(candidateId),
      interviewRoundId: Number(interviewRecord?.id),
      jobOpeningId: Number(interviewRecord?.jobId),
      reason: reason.trim(),
    });
  };

  const handleSkipInterview = async (data: SkipInterviewRoundRequest) => {
    skipInterviewRound(data)
      .unwrap()
      .then((res) => {
        if (res?.status) {
          showToast({
            message: get(res, 'message'),
            type: 'success',
          });
          setShowSkipModal(false);
          setReason('');
          // Reload to refresh candidate data and properly enable next round
          window.location.reload();
        } else {
          showToast({
            message: get(res, 'message', 'Failed to skip interview round'),
            type: 'error',
          });
        }
      })
      .catch((err) => {
        showToast({
          message: get(
            err,
            'data.message',
            'Something went wrong while scheduling the interview round.'
          ),
          type: 'error',
        });
      });
  };

  const handleEditInterview = (interview: InterviewRoundResponseDTO) => {
    const currentInterviewerNames = getInterviewerNames(interview);
    const currentInterviewerIds = getInterviewerIds(interview);
    const interviewerIdStrings = currentInterviewerIds.map(String);

    const originalData: InterviewerDataType = {
      interviewerName: currentInterviewerNames,
      interviewerIds: interviewerIdStrings,
      interviewSlotDuration: interview.interviewDurationInMinutes,
      interviewLocation: interview.interviewLocation,
    };

    const currentData: InterviewerDataType = {
      interviewerName: currentInterviewerNames,
      interviewerIds: interviewerIdStrings,
      interviewSlotDuration: interview.interviewDurationInMinutes,
      interviewLocation: interview.interviewLocation,
    };

    setInterviewerData(currentData);
    setOriginalInterviewerData(originalData);
    setEditInterviewRecord(interview);
    setShowEditModal(true);
  };

  const isCandidateShortlisted = () => {
    return candidate?.resumeStatus === 'COMPLETED';
  };

  const isCandidateSelectedOrRejected = () => {
    return (
      candidate?.status?.toUpperCase() === 'SELECTED' ||
      candidate?.status?.toUpperCase() === 'NOT_SELECTED' ||
      candidate?.status?.toUpperCase() === 'DECISION_PENDING'
    );
  };

  const handleAdvanceClick = (interview: InterviewRoundResponseDTO) => {
    setSelectedModalStatus(StatusModalType.ADVANCE);
    setCurrentInterviewForAction(interview);
    setIsStatusModalOpen(true);
  };

  const handleRejectClick = (interview: InterviewRoundResponseDTO) => {
    setSelectedModalStatus(StatusModalType.NOT_SELECTED);
    setCurrentInterviewForAction(interview);
    setIsStatusModalOpen(true);
  };

  const handleCloseStatusModal = () => {
    setIsStatusModalOpen(false);
    setCurrentInterviewForAction(undefined);
  };

  const handleStatusUpdateSuccess = () => {
    setIsStatusModalOpen(false);
    setCurrentInterviewForAction(undefined);
    if (skipReloadAfterStatusUpdateRef.current) {
      skipReloadAfterStatusUpdateRef.current = false;
      setSkipReloadAfterStatusUpdate(false);
      return;
    }
    window.location.reload();
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
      const isPending = !round?.interviewStatus || normalizedStatus === InterviewEnum.NOT_SCHEDULED;
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

    const pendingRound = rounds.find((round) => {
      const normalizedStatus = normalizeValue(round?.interviewStatus);
      return !round?.interviewStatus || normalizedStatus === InterviewEnum.NOT_SCHEDULED;
    });
    return pendingRound || null;
  };

  const isDecisionPendingState = (): boolean => {
    if (candidate?.status?.toUpperCase() === 'DECISION_PENDING') {
      return true;
    }

    const nextRoundName = candidate?.nextRoundDetails?.nextRound?.round?.name;
    return (nextRoundName || '').toUpperCase().includes('DECISION PENDING');
  };

  const handleAdvanceInviteRequested = async (): Promise<void> => {
    if (selectedModalStatus !== StatusModalType.ADVANCE || isDecisionPendingState()) {
      return;
    }

    const nextPendingRound = getNextPendingRound();
    if (!nextPendingRound) {
      showToast({
        message: 'Candidate advanced, but no schedulable next round was found.',
        type: 'warning',
      });
      return;
    }

    const nextRoundType = resolveRoundType(nextPendingRound);

    if (nextRoundType === 'AI') {
      const payload = {
        candidateId: Number(candidateId),
        jobId: Number(nextPendingRound?.jobId),
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

    if (nextRoundType.includes('VIDEO') || nextRoundType.includes('IN_PERSON')) {
      const normalizedRecordRoundType = nextRoundType.includes('IN_PERSON')
        ? 'IN_PERSON'
        : nextRoundType.includes('VIDEO')
          ? 'VIDEO'
          : nextPendingRound.roundType;

      // Keep the page state intact so the scheduling modal remains visible after status update.
      skipReloadAfterStatusUpdateRef.current = true;
      setSkipReloadAfterStatusUpdate(true);
      setInterviewRecord({
        ...nextPendingRound,
        roundType: normalizedRecordRoundType,
        firstName: candidate?.firstName || '',
        lastName: candidate?.lastName || '',
        candidateId: Number(candidateId),
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

  const currentRoundLabel =
    formatRoundLabel(
      currentInterviewForAction?.round?.name,
      getDisplayRoundNumber(
        interviewRounds,
        Number(currentInterviewForAction?.sequence) || undefined
      )
    ) || 'current round';

  const nextRoundLabel = (() => {
    const nextRoundName = candidate?.nextRoundDetails?.nextRound?.round?.name;

    // Use the sequence from nextRoundDetails.nextRound first — it is the most
    // authoritative source and correctly identifies the specific next round even
    // when multiple rounds share the same round-type ID (e.g. multiple In-person rounds).
    const directNextSequence = Number((candidate as any)?.nextRoundDetails?.nextRound?.sequence);
    if (Number.isFinite(directNextSequence) && directNextSequence > 0) {
      return formatRoundLabel(
        nextRoundName || 'Decision Pending',
        getDisplayRoundNumber(interviewRounds, directNextSequence)
      );
    }

    // Fallback: resolve by round-type ID (may be inaccurate when round types repeat)
    const nextRoundId = (candidate as any)?.nextRoundDetails?.nextRound?.round?.id;
    const matchedNextSequence = resolveRoundSequenceByRound(
      interviewRounds,
      nextRoundId,
      nextRoundName
    );
    if (matchedNextSequence) {
      return formatRoundLabel(
        nextRoundName || 'Decision Pending',
        getDisplayRoundNumber(interviewRounds, matchedNextSequence)
      );
    }

    const currentSequence = Number(currentInterviewForAction?.sequence);
    const currentDisplayNumber = getDisplayRoundNumber(
      interviewRounds,
      Number.isFinite(currentSequence) && currentSequence > 0 ? currentSequence : undefined
    );
    return formatRoundLabel(
      nextRoundName || 'Decision Pending',
      currentDisplayNumber ? currentDisplayNumber + 1 : undefined
    );
  })();

  const showSendInviteCheckbox =
    selectedModalStatus === StatusModalType.ADVANCE &&
    !isDecisionPendingState() &&
    !!getNextPendingRound();
  const sendInviteCheckboxLabel = (
    <>
      Send interview invite over email and SMS for <strong>{nextRoundLabel || 'next round'}</strong>
    </>
  );

  // Helper function to render invitation status with expiry indicator
  const renderInvitationStatus = (interview: InterviewRoundResponseDTO) => {
    const reminderCount = interview?.reminderCount ?? 0;
    const lastInvitationSentAt = interview?.lastInvitationSentAt;
    const bookingSentAt = interview?.bookingSentAt;
    const isLastAttemptExpired = interview?.isLastAttemptExpired ?? false;

    // For reattempt states (reminderCount > 0), use lastInvitationSentAt
    if (reminderCount > 0 && lastInvitationSentAt) {
      const remainingAttempts = 3 - reminderCount;
      let attemptText = '';

      // Only show attempt indicator if feature flag is enabled
      if (isCallEnquiryFeatureEnabled) {
        if (remainingAttempts === 0) {
          attemptText = '(Final Attempt)';
        } else {
          attemptText = `(Remaining Attempts: ${remainingAttempts})`;
        }
      }

      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center text-sm text-gray-600">
            <span className="mr-2">
              <LuCalendarDays fontSize={16} />
            </span>
            <span>Resent Invitation on {formattedDate(lastInvitationSentAt)}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <span className="mr-2">
              <RxClock fontSize={16} />
            </span>
            <span>
              At {formattedTime(lastInvitationSentAt)} {attemptText}
            </span>
            {/* Expiry Status Indicator - same line */}
            {isCallEnquiryFeatureEnabled &&
              (isLastAttemptExpired ? (
                <Tooltip title="Auto resend invitation link expired" placement="top">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 ml-2 cursor-pointer"></span>
                </Tooltip>
              ) : (
                <Tooltip title="Invitation link is active and valid" placement="top">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 ml-2 cursor-pointer"></span>
                </Tooltip>
              ))}
          </div>
        </div>
      );
    }

    // For initial invitation (reminderCount === 0), use bookingSentAt
    if (bookingSentAt && reminderCount === 0) {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center text-sm text-gray-600">
            <span className="mr-2">
              <LuCalendarDays fontSize={16} />
            </span>
            <span>Invitation sent on {formattedDate(bookingSentAt)}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <span className="mr-2">
              <RxClock fontSize={16} />
            </span>
            <span>At {formattedTime(bookingSentAt)} (Pending Reattempts: 3)</span>
            {/* Expiry Status Indicator - same line */}
            {isCallEnquiryFeatureEnabled &&
              (isLastAttemptExpired ? (
                <Tooltip title="Auto resend invitation link expired" placement="top">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 ml-2 cursor-help"></span>
                </Tooltip>
              ) : (
                <Tooltip title="Invitation link is active and valid" placement="top">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 ml-2 cursor-help"></span>
                </Tooltip>
              ))}
          </div>
        </div>
      );
    }

    // Fallback for edge cases
    return null;
  };

  return (
    <>
      {interviewRounds.length > 0 ? (
        <div className="flex flex-row flex-wrap gap-4">
          {interviewRounds.map((interview: InterviewRoundResponseDTO, index: number) => {
            const interviewerNames = getInterviewerNames(interview);
            const isLastRound = interviewRounds[interviewRounds.length - 1]?.id === interview?.id;
            let isRoundEnabled = false;
            const isCurrentUserInterviewer =
              interview?.interviewerList?.some(
                (interviewer) => interviewer.userId === decodedToken?.userId
              ) || false;
            const isCompletedVideoOrInPerson =
              interview?.interviewStatus === InterviewEnum.INTERVIEW_COMPLETED &&
              (interview?.roundType === 'VIDEO' || interview?.roundType === 'IN_PERSON');
            const isRoundShortlisted = (round: InterviewRoundResponseDTO) => {
              return round?.interviewStatus === InterviewEnum.SHORTLISTED;
            };
            if (isCandidateSelectedOrRejected()) {
              isRoundEnabled = false;
            } else if (index > 0) {
              const basicChecksPassed = interviewRounds.slice(0, index).every((r, i) => {
                if (
                  r.interviewStatus === InterviewEnum.CANDIDATE_SELECTED ||
                  r.interviewStatus === InterviewEnum.INTERVIEW_SKIPPED ||
                  r.interviewStatus === InterviewEnum.SHORTLISTED
                ) {
                  return true;
                }
                if (r.interviewStatus === InterviewEnum.INTERVIEW_COMPLETED) {
                  // A completed round is processed if the candidate has progressed to any subsequent round
                  return interviewRounds
                    .slice(i + 1)
                    .some((subsequentRound) => !!subsequentRound?.interviewStatus);
                }
                return false;
              });

              // Check if this is the first incomplete round
              const isFirstIncompleteRound =
                basicChecksPassed &&
                interview?.interviewStatus !== InterviewEnum.CANDIDATE_SELECTED &&
                interview?.interviewStatus !== InterviewEnum.INTERVIEW_SKIPPED &&
                interview?.interviewStatus !== InterviewEnum.SHORTLISTED &&
                interview?.interviewStatus !== InterviewEnum.INTERVIEW_COMPLETED;

              if (isCandidateShortlisted()) {
                if (index === 0) {
                  isRoundEnabled = true;
                } else {
                  isRoundEnabled = !!interview?.interviewStatus || isFirstIncompleteRound;
                }
              } else {
                isRoundEnabled = !!interview?.interviewStatus || isFirstIncompleteRound;
              }
            } else {
              // First round (index === 0)
              if (isCandidateShortlisted()) {
                // Check if first round is not already completed
                const isNotCompleted =
                  interview?.interviewStatus !== InterviewEnum.CANDIDATE_SELECTED &&
                  interview?.interviewStatus !== InterviewEnum.INTERVIEW_SKIPPED &&
                  interview?.interviewStatus !== InterviewEnum.SHORTLISTED;
                isRoundEnabled = isNotCompleted;
              } else {
                isRoundEnabled = false;
              }
            }
            return (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 min-w-[320px] max-w-[400px] min-h-[220px] flex flex-col overflow-hidden"
              >
                {/* Status Header */}
                <div
                  className={`py-3 px-5 flex items-center justify-between ${
                    !interview?.interviewStatus
                      ? 'bg-red-100'
                      : isRoundShortlisted(interview)
                        ? 'bg-green-100'
                        : interview?.interviewStatus === InterviewEnum.INTERVIEW_COMPLETED
                          ? 'bg-brand-100'
                          : interview?.interviewStatus === InterviewEnum.BOOKING_CREATED
                            ? 'bg-brand-100'
                            : interview?.interviewStatus === InterviewEnum.INTERVIEW_SKIPPED
                              ? 'bg-red-100'
                              : interview?.interviewStatus === InterviewEnum.BOOKING_CANCELLED
                                ? 'bg-red-100'
                                : 'bg-gray-100'
                  }`}
                >
                  <h4 className="min-w-0 flex-1 truncate font-semibold text-black text-base">
                    {interview?.round?.name}
                  </h4>
                  <div className="flex shrink-0 items-center gap-2">
                    {!interview?.interviewStatus ? (
                      <span className="text-xs font-semibold text-red-700">NOT SCHEDULED</span>
                    ) : isRoundShortlisted(interview) ? (
                      <span className="text-xs font-semibold text-green-700">ADVANCED</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className={`text-xs font-semibold ${
                            interview?.interviewStatus === InterviewEnum.INTERVIEW_COMPLETED
                              ? 'text-brand-700 cursor-pointer hover:underline'
                              : interview?.interviewStatus === InterviewEnum.BOOKING_CREATED
                                ? 'text-brand-700'
                                : interview?.interviewStatus === InterviewEnum.INTERVIEW_SKIPPED ||
                                    interview?.interviewStatus === InterviewEnum.BOOKING_CANCELLED
                                  ? 'text-red-700'
                                  : 'text-gray-700'
                          } bg-transparent border-none p-0`}
                          onClick={() => {
                            if (interview?.interviewStatus === InterviewEnum.INTERVIEW_COMPLETED) {
                              handleInterviewRoundClick(interview);
                            }
                          }}
                          disabled={
                            interview?.interviewStatus !== InterviewEnum.INTERVIEW_COMPLETED
                          }
                        >
                          {interview?.interviewStatusLabel.toUpperCase() === 'BOOKING CREATED'
                            ? 'SCHEDULED'
                            : interview?.interviewStatusLabel.toUpperCase()}
                        </button>
                        {interview?.interviewStatus === InterviewEnum.INTERVIEW_SKIPPED ? (
                          <Tooltip placement="top" title={interview?.skipReason ?? ''}>
                            <FaInfoCircle className="text-red-600 cursor-help" size={14} />
                          </Tooltip>
                        ) : interview?.interviewStatus === InterviewEnum.BOOKING_CANCELLED ? (
                          <Tooltip placement="top" title={interview?.cancellationReason ?? ''}>
                            <FaInfoCircle className="text-red-600 cursor-help" size={14} />
                          </Tooltip>
                        ) : null}
                        {isCompletedVideoOrInPerson && (
                          <Tooltip
                            placement="top"
                            title={
                              interview.isFollowUpEmailSent
                                ? 'Follow-up email already sent'
                                : 'Notify candidate'
                            }
                          >
                            <FaEnvelope
                              className={`cursor-pointer ${
                                interview.isFollowUpEmailSent ? 'text-gray-400' : 'text-brand-600'
                              }`}
                              size={14}
                              onClick={() =>
                                !interview.isFollowUpEmailSent && handleNotifyCandidate(interview)
                              }
                            />
                          </Tooltip>
                        )}
                      </div>
                    )}
                    {interview?.interviewStatus &&
                      interview?.interviewStatus !== InterviewEnum.NOT_SCHEDULED && (
                        <Tooltip
                          title={`Round notes (${countNotesForInterview(interview, allNotesForCounts)})`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              onOpenRoundNotes?.(Number(interview?.id), interview?.round?.name)
                            }
                            className="inline-flex shrink-0 items-center justify-center border-0 bg-transparent p-0.5 text-[#263d92] hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#263d92]/30"
                            aria-label="Round notes"
                          >
                            <LuSquarePen size={18} strokeWidth={2} aria-hidden />
                          </button>
                        </Tooltip>
                      )}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex flex-col gap-3 flex-1">
                  {/* Empty State / Not Scheduled Placeholder */}
                  {!interview?.startTime &&
                    !interview?.bookingSentAt &&
                    interviewerNames.length === 0 &&
                    interview?.interviewStatus !== InterviewEnum.INTERVIEW_SKIPPED &&
                    isRoundEnabled && (
                      <div className="flex flex-col items-center justify-center flex-1 py-2 opacity-70">
                        <div className="bg-gray-50 p-3 rounded-full mb-3 shadow-sm">
                          <LuCalendarDays className="text-gray-400" size={24} />
                        </div>
                        <p className="text-sm font-semibold text-gray-500 mb-1">
                          Ready to Schedule?
                        </p>
                        <p className="text-xs text-gray-400 text-center leading-relaxed">
                          {"Initialize this round to move forward with the candidate's evaluation."}
                        </p>
                      </div>
                    )}

                  {/* Skipped Round Status Placeholder */}
                  {interview?.interviewStatus === InterviewEnum.INTERVIEW_SKIPPED && (
                    <div className="flex flex-col items-center justify-center flex-1 py-4 opacity-70">
                      <div className="bg-red-50 p-3 rounded-full mb-3 shadow-sm border border-red-100">
                        <LuCalendarOff className="text-red-300" size={24} />
                      </div>
                      <p className="text-sm font-semibold text-gray-500 mb-1">Round Skipped</p>
                      <p className="text-xs text-gray-400 text-center leading-relaxed max-w-[200px]">
                        This interview stage has been skipped.
                      </p>
                    </div>
                  )}
                  {/* Displaying date and time */}
                  {!interview?.startTime ? null : (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">
                          <LuCalendarDays fontSize={16} />
                        </span>
                        <span>Scheduled on {formattedDate(interview?.startTime)}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">
                          <RxClock fontSize={16} />
                        </span>
                        <span>At {formattedTime(interview?.startTime)}</span>
                      </div>
                    </div>
                  )}
                  {interview?.interviewStatus === InterviewEnum.INVITATION_SENT &&
                    interview?.bookingSentAt &&
                    renderInvitationStatus(interview)}
                  {/* Displaying interviewer names if available */}
                  {interview.interviewStatus === InterviewEnum.INTERVIEW_SKIPPED
                    ? ''
                    : interviewerNames.length > 0 && (
                        <div className="flex items-start w-full">
                          <div className="text-sm text-black">
                            <span className="font-bold">Interviewer(s):</span>{' '}
                            {interviewerNames.join(' | ')}
                            {isBookingCreated(interview) && (
                              <Tooltip title="Edit Interview">
                                <span
                                  className="ml-1 cursor-pointer text-gray-500 hover:text-primary transition-colors inline-block align-middle"
                                  onClick={() => handleEditInterview(interview)}
                                >
                                  <LuPencil size={12} />
                                </span>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      )}

                  {/* Buttons Section */}
                  <div className="flex flex-col gap-2 mt-auto">
                    {(!interview?.interviewStatus ||
                      interview?.interviewStatus === 'NOT_SCHEDULED') &&
                    isRoundEnabled &&
                    !isCandidateSelectedOrRejected() ? (
                      <Button
                        className="bg-primary text-white rounded-full px-4 py-2 text-sm font-semibold"
                        onClick={() =>
                          interview?.roundType === 'AI'
                            ? onSubmit(interview)
                            : (() => {
                                setShowScheduleModal(true);
                                setInterviewRecord(interview);
                              })()
                        }
                      >
                        {isScheduleLoading ? <Loader /> : <span>INVITE</span>}
                      </Button>
                    ) : interview?.interviewStatus === InterviewEnum.INVITATION_SENT ||
                      interview?.interviewStatus === InterviewEnum.BOOKING_CANCELLED ||
                      interview?.interviewStatus === InterviewEnum.NO_SHOW ||
                      interview?.interviewStatus === InterviewEnum.AI_CALL_NOT_COMPLETED ? (
                      isRoundEnabled &&
                      !isCandidateSelectedOrRejected() && (
                        <Button
                          className="bg-primary text-white rounded-full px-4 py-2 text-sm font-semibold"
                          onClick={() =>
                            interview?.roundType === 'AI'
                              ? onSubmit(interview)
                              : (() => {
                                  setShowScheduleModal(true);
                                  setInterviewRecord(interview);
                                })()
                          }
                        >
                          {isScheduleLoading ? <Loader /> : <span>RE-INVITE</span>}
                        </Button>
                      )
                    ) : interview?.interviewStatus === InterviewEnum.BOOKING_CREATED ? (
                      <Button
                        className="border border-gray-300 text-black rounded-full px-4 py-2 text-sm font-semibold"
                        onClick={() => {
                          setShowCancelModal(true);
                          setInterviewRecord(interview);
                        }}
                      >
                        {isCancelLoading ? <Loader /> : <span>CANCEL</span>}
                      </Button>
                    ) : null}

                    {interview?.roundType === 'VIDEO' &&
                      interview?.interviewStatus !== InterviewEnum.BOOKING_CANCELLED &&
                      interview?.interviewStatus !== InterviewEnum.CANDIDATE_SELECTED &&
                      interview?.interviewStatus !== InterviewEnum.CANDIDATE_REJECTED &&
                      interview?.interviewStatus !== InterviewEnum.INTERVIEW_SKIPPED &&
                      interview?.interviewStatus !== InterviewEnum.NO_SHOW &&
                      isRoundEnabled && (
                        <div>
                          <VideoInterviewRound
                            startTime={interview?.startTime}
                            isRoundEnabled={isRoundEnabled}
                            interview={interview}
                            candidate={candidate}
                          />
                        </div>
                      )}

                    {interview?.roundType === 'AI' ||
                    interview?.interviewStatus === InterviewEnum.BOOKING_CANCELLED ||
                    interview?.interviewStatus === InterviewEnum.CANDIDATE_SELECTED ||
                    interview?.interviewStatus === InterviewEnum.CANDIDATE_REJECTED ||
                    interview?.interviewStatus === InterviewEnum.INTERVIEW_SKIPPED ||
                    interview?.interviewStatus === InterviewEnum.NO_SHOW ||
                    interview?.interviewStatus === InterviewEnum.AI_CALL_NOT_COMPLETED ||
                    !interviewRounds[index]?.isCompleted ||
                    !isRoundEnabled ||
                    isCandidateSelectedOrRejected() ? null : (
                      <Button
                        className="bg-primary text-white rounded-full px-4 py-2 text-sm font-semibold"
                        onClick={() => {
                          setFeedbackModalOpen(true);
                          setInterviewRecord(interview);
                        }}
                      >
                        SUBMIT FEEDBACK
                      </Button>
                    )}

                    {interview?.interviewStatus === InterviewEnum.INTERVIEW_SKIPPED ||
                    interview?.interviewStatus === InterviewEnum.INTERVIEW_COMPLETED ||
                    interview?.interviewStatus === InterviewEnum.CANDIDATE_SELECTED ||
                    interview?.interviewStatus === InterviewEnum.CANDIDATE_REJECTED ||
                    (interview?.interviewStatus === InterviewEnum.AI_CALL_NOT_COMPLETED &&
                      interview?.roundType !== 'AI') ||
                    (interview?.interviewStatus === InterviewEnum.AI_CALL_IN_PROGRESS &&
                      interview?.roundType === 'AI') ||
                    (interview?.interviewStatus === InterviewEnum.AI_CALLBACK_STARTED &&
                      interview?.roundType === 'AI') ||
                    interview?.interviewStatus === InterviewEnum.SHORTLISTED ||
                    isLastRound ||
                    !isRoundEnabled ||
                    isCandidateSelectedOrRejected() ? null : (
                      <Button
                        className="border border-gray-300 text-black rounded-full px-4 py-2 text-sm font-semibold"
                        onClick={() => {
                          setShowSkipModal(true);
                          setInterviewRecord(interview);
                        }}
                      >
                        SKIP ROUND
                      </Button>
                    )}

                    {/* ADVANCE and REJECT Buttons - Horizontal Layout */}
                    {(interview?.interviewStatus === InterviewEnum.BOOKING_CREATED ||
                      interview?.interviewStatus === InterviewEnum.INTERVIEW_COMPLETED ||
                      (isRoundEnabled &&
                        interview?.interviewStatus !== InterviewEnum.CANDIDATE_REJECTED &&
                        interview?.interviewStatus !== InterviewEnum.INTERVIEW_SKIPPED)) &&
                      !isCandidateSelectedOrRejected() &&
                      !candidate?.resumeProcessFailed &&
                      // Check if next round is NOT started (null/undefined only)
                      !interviewRounds[index + 1]?.interviewStatus && (
                        <div className="flex gap-2 w-full">
                          {interview?.interviewStatus === InterviewEnum.INTERVIEW_COMPLETED && (
                            <Button
                              className="flex-1 bg-primary text-white rounded-full px-4 py-2 text-xs font-semibold"
                              onClick={() => handleAdvanceClick(interview)}
                            >
                              ADVANCE
                            </Button>
                          )}

                          {(isRoundEnabled ||
                            interview?.interviewStatus === InterviewEnum.INTERVIEW_COMPLETED) &&
                            interview?.interviewStatus !== InterviewEnum.CANDIDATE_REJECTED &&
                            interview?.interviewStatus !== InterviewEnum.INTERVIEW_SKIPPED && (
                              <Button
                                className="flex-1 border-2 border-red-600 bg-red-50 text-red-600 rounded-full px-4 py-2 text-xs font-semibold hover:bg-red-100"
                                onClick={() => handleRejectClick(interview)}
                              >
                                REJECT
                              </Button>
                            )}
                        </div>
                      )}

                    {interview?.roundType === 'IN_PERSON' &&
                      interview?.interviewStatus === InterviewEnum.BOOKING_CREATED &&
                      isCurrentUserInterviewer && (
                        <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl">
                          <Select
                            placeholder="Mark Status"
                            allowClear
                            value={status || undefined}
                            className="w-full custom-select-jobs placeholder-style"
                            onChange={(val) => {
                              setStatus(val);
                              setShowStatusModal(true);
                              setInterviewRecord(interview);
                            }}
                            popupClassName="rounded-3xl"
                            options={roundTypeOptions}
                          ></Select>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <Modal
        open={feedbackModalOpen}
        onCancel={() => setFeedbackModalOpen(false)}
        footer={null}
        width={1100}
        destroyOnClose
        centered
      >
        {interviewRecord && (
          <InterviewFeedback
            onClose={() => setFeedbackModalOpen(false)}
            selectedInterviewerId={candidate?.interviewerId}
            candidate={candidate}
            interviewRecord={interviewRecord}
          />
        )}
      </Modal>
      <Modal
        open={showNotifyModal}
        onCancel={handleCloseNotifyModal}
        footer={null}
        width={1000}
        destroyOnClose
        centered
        maskClosable={false}
        title="Notify Candidate"
        className="max-h-[70vh]"
      >
        {notifyInterviewRecord && (
          <NotifyCandidateModal
            candidate={candidate}
            interviewRoundName={notifyInterviewRecord?.round?.name || 'Interview'}
            onClose={handleCloseNotifyModal}
            interviewBookingId={Number(notifyInterviewRecord?.interviewBookingId)}
            onSuccess={() => {
              handleCloseNotifyModal();
            }}
          />
        )}
      </Modal>

      <CommonModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Please explain why you are cancelling the interview"
        setReason={setReason}
        footer={
          <div className="flex justify-center items-center space-x-2">
            <Button
              className="px-10 py-3 bg-primary font-bold text-white border rounded-4xl cursor-pointer"
              onClick={submitCancelInterview}
              disabled={!reason.trim() || isCancelLoading}
            >
              <span>SUBMIT</span>
            </Button>

            <Button
              className="px-7 py-3 font-bold border border-gray-200 rounded-4xl cursor-pointer !bg-white"
              onClick={() => {
                setReason('');
                setShowCancelModal(false);
              }}
            >
              <span>CANCEL</span>
            </Button>
          </div>
        }
      />

      <CommonModal
        visible={showSkipModal}
        onClose={() => setShowSkipModal(false)}
        title="Please explain why you are skipping the interview"
        setReason={setReason}
        footer={
          <div className="flex justify-center items-center space-x-2">
            <Button
              className="px-10 py-3 bg-primary font-bold text-white border rounded-4xl cursor-pointer"
              onClick={submitSkipInterview}
              disabled={!reason.trim() || isSkipLoading}
            >
              <span>SUBMIT</span>
            </Button>

            <Button
              className="px-7 py-3 font-bold border border-gray-200 rounded-4xl cursor-pointer !bg-white"
              onClick={() => {
                setReason('');
                setShowSkipModal(false);
              }}
            >
              <span>CANCEL</span>
            </Button>
          </div>
        }
      />
      {showStatusModal && status && (
        <ConfirmationModal
          onClose={() => setShowStatusModal(false)}
          onConfirm={handleUpdateInterviewStatus}
          title={`Are you sure you want to mark the status as  <strong> ${selectedLabel} </strong>`}
          confirmText="CONFIRM"
          isLoading={isStatusUpdateLoading}
        />
      )}

      {interviewRecord && (
        <ScheduleInterviewModal
          visible={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false);
            setInterviewRecord(undefined);
            resetInterviewerData();
            skipReloadAfterStatusUpdateRef.current = false;
            setSkipReloadAfterStatusUpdate(false);
          }}
          title="Schedule Interview"
          interviewRecord={interviewRecord}
          interviewerData={interviewerData}
          setInterviewerData={setInterviewerData}
          onDataChange={(data) => setInterviewerData(data)}
          footer={
            <div className="flex justify-center items-center space-x-2">
              <Button
                className="px-10 py-3 w-full bg-primary font-bold text-white border rounded-4xl cursor-pointer"
                onClick={() => {
                  if (skipReloadAfterStatusUpdate) {
                    handleAdvanceScheduleSubmit();
                  } else {
                    onSubmit(interviewRecord);
                  }
                }}
                disabled={
                  (resolveRoundType(interviewRecord).includes('VIDEO') &&
                    (!interviewerData?.interviewSlotDuration ||
                      interviewerData?.interviewerIds?.length === 0)) ||
                  (resolveRoundType(interviewRecord).includes('IN_PERSON') &&
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

      {editInterviewRecord && isBookingCreated(editInterviewRecord) && (
        <ScheduleInterviewModal
          visible={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditInterviewRecord(undefined);
            setInterviewerData({
              interviewerName: [],
              interviewerIds: [],
              interviewSlotDuration: 15,
              interviewLocation: '',
            });
            setOriginalInterviewerData({
              interviewerName: [],
              interviewerIds: [],
              interviewSlotDuration: 15,
              interviewLocation: '',
            });
          }}
          title="Update Interviewer"
          interviewRecord={editInterviewRecord}
          interviewerData={interviewerData}
          setInterviewerData={setInterviewerData}
          onDataChange={(data) => setInterviewerData(data)}
          isEditMode={true}
          footer={
            <div className="flex justify-center items-center space-x-2">
              <Button
                className="px-10 py-3 w-full bg-primary font-bold text-white border rounded-4xl cursor-pointer"
                onClick={() => {
                  onSubmitEdit(editInterviewRecord);
                }}
                disabled={
                  isSubstituteLoading ||
                  arraysEqual(
                    originalInterviewerData.interviewerIds,
                    interviewerData.interviewerIds
                  ) ||
                  interviewerData?.interviewerIds?.length === 0
                }
              >
                {isSubstituteLoading ? <Loader /> : <span>Submit</span>}
              </Button>
            </div>
          }
        />
      )}

      {isStatusModalOpen && currentInterviewForAction && (
        <AntdCommonModal
          open={isStatusModalOpen}
          onClose={handleCloseStatusModal}
          title={
            selectedModalStatus === StatusModalType.ADVANCE
              ? 'Advance Candidate'
              : 'Reject Candidate'
          }
          subtitle={
            selectedModalStatus === StatusModalType.ADVANCE ? (
              <span>
                You are advancing candidate{' '}
                <strong>
                  {candidate?.firstName || ''} {candidate?.lastName || ''}
                </strong>{' '}
                from <strong>{currentRoundLabel}</strong> to <strong>{nextRoundLabel}</strong>.
                <br />
                Are you sure you want to proceed?
              </span>
            ) : (
              `Do you want to reject ${candidate?.firstName || ''} ${candidate?.lastName || ''}?`
            )
          }
          modalProps={{
            width: 700,
          }}
        >
          <CandidateStatus
            isOpen={isStatusModalOpen}
            onClose={handleCloseStatusModal}
            candidateIds={[Number(candidateId)]}
            statusType={selectedModalStatus}
            candidateNames={[`${candidate?.firstName} ${candidate?.lastName}`]}
            currentRoundId={currentInterviewForAction?.id || null}
            onStatusUpdate={handleStatusUpdateSuccess}
            showSendInviteCheckbox={showSendInviteCheckbox}
            sendInviteCheckboxLabel={sendInviteCheckboxLabel}
            onAdvanceInviteRequested={handleAdvanceInviteRequested}
            candidateDetails={[
              {
                candidateId: Number(candidateId),
                jobOpeningId: Number(currentInterviewForAction?.jobId),
                roundId: currentInterviewForAction?.id || null,
                candidateName: `${candidate?.firstName} ${candidate?.lastName}`,
                interviewRounds: candidate?.interviewRounds || [],
                resumeStatus: candidate?.resumeStatus || '',
                status: candidate?.status || '',
                interviewStatus: candidate?.interviewStatus || '',
                nextRound: candidate?.nextRoundDetails?.nextRound?.round,
              },
            ]}
          />
        </AntdCommonModal>
      )}
    </>
  );
};

export default InterviewRounds;
