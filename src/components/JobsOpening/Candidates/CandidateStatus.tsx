import { useEffect, useState } from 'react';
import { Form, Select, Checkbox, Tooltip, Rate } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, showToast } from '../../shared';
import TextArea from 'antd/es/input/TextArea';
import { useBulkStatusUpdateMutation } from '../../../api/candidate-service/Candidates/Candidates';
import { get } from 'lodash-es';
import { createCandidateStatusValidation } from './CandidateStatusSchema';
import { MdClose } from 'react-icons/md';
import { InterviewEnum } from '../../../shared/utils/enums';
import { CandidateStatusProps, SelectedCandidate, StatusFormData } from '../../../types';
import { Loader } from '../../shared/ui/loader';
import { ELIGIBLE_FOR_ADVANCE_STATUS } from '../../../constants/candidateFilterStatus';

const { Option } = Select;

const rejectionReasons = [
  'Not a culture fit',
  'Insufficient experience',
  'Skills mismatch',
  'Salary expectations too high',
  'Found a better candidate',
  'Withdrew application',
  'Failed interview',
  'Other',
];

const CandidateStatus: React.FC<CandidateStatusProps> = ({
  onClose,
  statusType,
  candidateDetails,
  currentRoundId,
  onStatusUpdate,
  onCandidatesUpdate,
  showSendInviteCheckbox = false,
  sendInviteCheckboxLabel,
  onAdvanceInviteRequested,
}) => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkStatusUpdate, { isLoading }] = useBulkStatusUpdateMutation();
  const [selectedCandidates, setSelectedCandidates] = useState<SelectedCandidate[]>([]);
  const [candidateRatings, setCandidateRatings] = useState<Record<number, number>>({});
  const [deselectedIds, setDeselectedIds] = useState<Set<number>>(new Set());

  const isCandidateEligible = (candidate: any): boolean => {
    if (statusType === 'FINAL_ROUND_SHORTLIST') {
      return isCandidateEligibleForFinalRound(candidate);
    }
    if (statusType !== 'ADVANCE') {
      return true;
    }

    if (
      candidate?.status === 'DECISION_PENDING' ||
      candidate?.status === 'NOT_SELECTED' ||
      candidate?.status === 'SELECTED'
    ) {
      return false;
    }

    if (candidate?.interviewStatus) {
      if (!ELIGIBLE_FOR_ADVANCE_STATUS.includes(candidate.interviewStatus)) {
        return false;
      }
    }

    if (candidate?.resumeStatus?.toUpperCase() === 'PENDING') {
      return true;
    }
    if (candidate?.resumeStatus?.toUpperCase() === 'REVIEW_AWAITED') {
      return true;
    }
    const interviewRounds = candidate?.interviewRounds || [];
    if (!interviewRounds.length) {
      return false;
    }

    const rounds = interviewRounds;
    const currentRoundIndex = rounds.findIndex((round: any) => {
      const status = round?.interviewStatus;
      return ![
        InterviewEnum.SHORTLISTED,
        InterviewEnum.CANDIDATE_REJECTED,
        InterviewEnum.INTERVIEW_SKIPPED,
        InterviewEnum.BOOKING_CANCELLED,
        InterviewEnum.NO_SHOW,
        InterviewEnum.AI_CALL_NOT_COMPLETED,
        // InterviewEnum.NOT_SCHEDULED,
      ].includes(status as InterviewEnum);
    });
    if (currentRoundIndex === -1) {
      return false;
    }

    const currentRound = rounds[currentRoundIndex];
    const currentRoundStatus = currentRound?.interviewStatus;

    if (currentRoundIndex === 0) {
      const isCurrentRoundCompleted = currentRoundStatus === InterviewEnum.INTERVIEW_COMPLETED;
      // If round 1 is already completed the candidate has clearly been admitted —
      // eligible regardless of resumeStatus value.
      if (isCurrentRoundCompleted) return true;
      // Round 1 not yet completed: require resume to have been shortlisted first.
      const isResumeShortlisted =
        candidate?.resumeStatus?.toUpperCase() === 'REVIEW_AWAITED' ||
        candidate?.resumeStatus?.toUpperCase() === 'SHORTLISTED' ||
        candidate?.resumeStatus?.toUpperCase() === 'SELECTED' ||
        candidate?.resumeStatus?.toUpperCase() === 'COMPLETED';
      return !!isResumeShortlisted && isCurrentRoundCompleted;
    }
    const isCurrentRoundCompleted = currentRoundStatus === InterviewEnum.INTERVIEW_COMPLETED;
    const previousRound = rounds[currentRoundIndex - 1];
    const isPreviousRoundCompleted =
      previousRound?.interviewStatus === InterviewEnum.INTERVIEW_COMPLETED;
    if (currentRoundIndex === rounds.length - 1) {
      return isCurrentRoundCompleted || isPreviousRoundCompleted;
    }
    return isCurrentRoundCompleted || isPreviousRoundCompleted;
  };

  const isCandidateEligibleForFinalRound = (candidate: any): boolean => {
    const interviewRounds = candidate?.interviewRounds || [];
    if (!interviewRounds.length) {
      return false;
    }
    const lastRound = interviewRounds[interviewRounds.length - 1];
    if (!lastRound) {
      return true;
    }
    const isLastRoundCompleted = lastRound.interviewStatus === InterviewEnum.INTERVIEW_COMPLETED;
    return isLastRoundCompleted;
  };

  useEffect(() => {
    const initializedCandidates = candidateDetails.map((candidate) => ({
      id: candidate.candidateId,
      name: candidate.candidateName || `Candidate ${candidate.candidateId}`,
      nextRoundName: candidate.nextRound?.name || undefined,
      roundId: candidate.roundId ?? null,
      isEligibleForAdvance: isCandidateEligible(candidate),
      interviewRounds: candidate.interviewRounds || [],
    }));

    setSelectedCandidates(initializedCandidates);
    const initialRatings: Record<number, number> = {};
    candidateDetails.forEach((candidate) => {
      initialRatings[candidate.candidateId] = 0;
    });
    setCandidateRatings(initialRatings);
  }, []);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StatusFormData>({
    resolver: zodResolver(createCandidateStatusValidation(statusType)),
    defaultValues: {
      reason: statusType === 'NOT_SELECTED' ? '' : undefined,
      comments: '',
      notifyCandidate: false,
      sendInterviewInvite: statusType === 'ADVANCE',
      finalRating: null,
    },
  });

  const notifyCandidate = watch('notifyCandidate');
  const sendInterviewInvite = watch('sendInterviewInvite');
  const showRatingSection = statusType === 'SELECTED' || statusType === 'NOT_SELECTED';
  const isBulkAction = candidateDetails.length > 1;

  const getStatusForAPI = (): string => {
    if (statusType === 'ADVANCE' || statusType === 'FINAL_ROUND_SHORTLIST') {
      return 'ADVANCED';
    }
    return statusType;
  };

  useEffect(() => {
    if (onCandidatesUpdate && selectedCandidates.length > 0) {
      onCandidatesUpdate(selectedCandidates.length);
    }
  }, [selectedCandidates.length]);

  useEffect(() => {
    if (statusType === 'ADVANCE' && showSendInviteCheckbox) {
      setValue('sendInterviewInvite', true);
    }
  }, [statusType, showSendInviteCheckbox, setValue]);

  const getRoundIdForStatus = (itemRoundId: number | null): number | null => {
    if (statusType === 'REACTIVATE') {
      return null;
    }

    if (statusType === 'FINAL_ROUND_SHORTLIST') {
      return itemRoundId || null;
    }

    if (statusType === 'SELECTED' || statusType === 'NOT_SELECTED') {
      return currentRoundId || itemRoundId || null;
    }

    return itemRoundId || null;
  };

  const handleRemoveCandidate = (candidateId: number) => {
    setSelectedCandidates((prev) => prev.filter((candidate) => candidate.id !== candidateId));
    setCandidateRatings((prev) => {
      const newRatings = { ...prev };
      delete newRatings[candidateId];
      return newRatings;
    });
  };

  const handleRatingChange = (candidateId: number, rating: number) => {
    setCandidateRatings((prev) => ({
      ...prev,
      [candidateId]: rating,
    }));
  };

  const getEligibleCandidateIds = () => {
    if (
      statusType === 'ADVANCE' ||
      statusType === 'FINAL_ROUND_SHORTLIST' ||
      statusType === 'REVIEW_AWAITED'
    ) {
      return selectedCandidates
        .filter((c) => c.isEligibleForAdvance && !deselectedIds.has(c.id))
        .map((c) => c.id);
    }

    return selectedCandidates.map((c) => c.id);
  };

  const hasEligibleCandidates =
    statusType === 'ADVANCE' ||
    statusType === 'FINAL_ROUND_SHORTLIST' ||
    statusType === 'REVIEW_AWAITED'
      ? getEligibleCandidateIds().length > 0
      : true;

  const submitDisabledReason =
    statusType === 'ADVANCE'
      ? 'No eligible candidates available to advance.'
      : statusType === 'FINAL_ROUND_SHORTLIST'
        ? 'No eligible candidates available for final round shortlist.'
        : '';

  const isSubmitDisabled =
    isSubmitting ||
    ((statusType === 'ADVANCE' ||
      statusType === 'REVIEW_AWAITED' ||
      statusType === 'FINAL_ROUND_SHORTLIST') &&
      !hasEligibleCandidates);
  const isFinalRound = statusType === 'FINAL_ROUND_SHORTLIST';
  const onSubmit = async (data: StatusFormData) => {
    if (isBulkAction && selectedCandidates.length === 0) {
      showToast({
        message: 'Please select at least one candidate',
        type: 'warning',
      });
      return;
    }

    if (statusType === 'REVIEW_AWAITED' || statusType === 'ADVANCE') {
      const eligibleIds = getEligibleCandidateIds();
      if (eligibleIds.length === 0) {
        showToast({
          message: 'No eligible candidates for advance. Please check candidate status.',
          type: 'warning',
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const apiStatus = getStatusForAPI();
      const candidateIdsToProcess =
        statusType === 'ADVANCE' ||
        statusType === 'REVIEW_AWAITED' ||
        statusType === 'FINAL_ROUND_SHORTLIST'
          ? getEligibleCandidateIds()
          : selectedCandidates.map((c) => c.id);

      const filteredCandidateDetails = candidateDetails.filter((item) =>
        candidateIdsToProcess.includes(item.candidateId)
      );
      const updatedCandidateDetails = filteredCandidateDetails.map((item) => ({
        ...item,
        isResumeStatusUpdated:
          statusType === 'ADVANCE' && item.resumeStatus?.toUpperCase() === 'REVIEW_AWAITED',
      }));

      const candidateStatusUpdateList = updatedCandidateDetails.map((item) => {
        const finalRating =
          isBulkAction && showRatingSection
            ? candidateRatings[item.candidateId] || null
            : data.finalRating || null;
        return {
          candidateId: item.candidateId,
          jobOpeningId: item.jobOpeningId,
          roundId: getRoundIdForStatus(item.roundId),
          status: apiStatus,
          comments: data.comments || '',
          isResumeStatusUpdated: item.isResumeStatusUpdated,
          rating: finalRating || 0,
          isNotifyCandidate: statusType === 'NOT_SELECTED' ? data.notifyCandidate : false,
          reason: statusType === 'NOT_SELECTED' ? data.reason || '' : undefined,
          isFinalRound,
        };
      });

      await bulkStatusUpdate({ candidateStatusUpdateList })
        .unwrap()
        .then(async (res) => {
          if (res?.code === 'Success' || res?.status === 'OK') {
            const shouldTriggerAdvanceInvite =
              statusType === 'ADVANCE' && showSendInviteCheckbox && !!sendInterviewInvite;

            showToast({
              message: get(res, 'message', 'Candidate status updated successfully'),
              type: 'success',
            });

            if (shouldTriggerAdvanceInvite && onAdvanceInviteRequested) {
              try {
                await Promise.resolve(onAdvanceInviteRequested(getEligibleCandidateIds()));
              } catch (error) {
                showToast({
                  message: get(
                    error,
                    'data.message',
                    'Candidate advanced, but sending interview invite failed.'
                  ),
                  type: 'error',
                });
              }
            }

            reset();
            onClose();

            if (onStatusUpdate) {
              onStatusUpdate();
            }
          } else {
            showToast({
              message: get(res, 'message', 'Failed to update candidate status'),
              type: 'error',
            });
          }
        })
        .catch((err) => {
          showToast({
            message: get(
              err,
              'data.message',
              'Something went wrong while updating candidate status.'
            ),
            type: 'error',
          });
        });
    } catch (error: any) {
      showToast({
        message: get(error, 'data.message', 'Something went wrong. Please try again.'),
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const ineligibleCandidates =
    statusType === 'ADVANCE' || statusType === 'FINAL_ROUND_SHORTLIST'
      ? selectedCandidates.filter((c) => !c.isEligibleForAdvance)
      : [];

  // const TERMINAL_STATUSES = [
  //   InterviewEnum.INTERVIEW_COMPLETED,
  //   InterviewEnum.SHORTLISTED,
  //   InterviewEnum.CANDIDATE_REJECTED,
  //   InterviewEnum.INTERVIEW_SKIPPED,
  //   InterviewEnum.BOOKING_CANCELLED,
  //   InterviewEnum.NO_SHOW,
  //   InterviewEnum.AI_CALL_NOT_COMPLETED,
  // ];

  /**
   * Converts a raw `sequence` value into a 1-based positional round number by
   * finding its index in the sorted, de-duplicated list of all sequences for
   * this candidate. This handles non-consecutive sequences (e.g. [1, 2, 4, 5])
   * so that sequence 4 is displayed as "Round 3", not "Round 4".
   */
  const getPositionalRoundNumber = (interviewRounds: any[], round: any): number => {
    const sortedSequences = [...new Set(interviewRounds.map((r: any) => r.sequence as number))]
      .filter((s) => s != null)
      .sort((a, b) => a - b);
    const idx = sortedSequences.indexOf(round.sequence);
    return idx >= 0 ? idx + 1 : interviewRounds.indexOf(round) + 1;
  };

  /**
   * Returns "Round Name - Round N" for the CURRENT round (the one just completed).
   * Uses positional rank (1-based index in the sorted sequence list) so that
   * non-consecutive sequences are displayed correctly.
   *
   * Example — sequences [1, 2, 4, 5], current = seq 2:
   *   positional rank = 2  →  "Video Interview - Round 2"  ✓
   */
  const getCurrentRoundLabel = (interviewRounds: any[] = [], explicitRoundId?: number): string => {
    if (!interviewRounds.length) return 'Resume Screening';

    if (Number.isFinite(explicitRoundId) && Number(explicitRoundId) > 0) {
      const explicitRound = interviewRounds.find((r) => Number(r?.id) === Number(explicitRoundId));
      if (explicitRound) {
        const explicitRoundName = explicitRound.round?.name || 'Resume Screening';
        const explicitRoundSequence = getPositionalRoundNumber(interviewRounds, explicitRound);
        return `${explicitRoundName} - Round ${explicitRoundSequence}`;
      }
    }

    const firstPendingIdx = interviewRounds.findIndex(
      (r) => !r.interviewStatus || r.interviewStatus === null
    );
    let current: any;
    if (firstPendingIdx > 0) {
      current = interviewRounds[firstPendingIdx - 1];
    } else if (firstPendingIdx === -1) {
      current = [...interviewRounds]
        .reverse()
        .find((r) => r.interviewStatus === InterviewEnum.INTERVIEW_COMPLETED);
    }
    if (!current) return 'Resume Screening';
    const name = current.round?.name || 'Resume Screening';
    const seq = getPositionalRoundNumber(interviewRounds, current);
    return `${name} - Round ${seq}`;
  };

  /**
   * Returns "Round Name - Round N" for the NEXT round the candidate is advancing to.
   * Uses positional rank (1-based index in the sorted sequence list) so that
   * non-consecutive sequences are displayed correctly.
   *
   * Example — sequences [1, 2, 4, 5], next pending = seq 4:
   *   positional rank = 3  →  "Video Interview - Round 3"  ✓
   */
  const getNextRoundLabel = (interviewRounds: any[] = [], nextRoundName: string): string => {
    if (!nextRoundName || nextRoundName === 'Decision Pending') return nextRoundName;
    if (!interviewRounds.length) return nextRoundName;
    const nextRound = interviewRounds.find((r) => !r.interviewStatus || r.interviewStatus === null);
    if (!nextRound) return nextRoundName;
    const seq = getPositionalRoundNumber(interviewRounds, nextRound);
    return `${nextRoundName} - Round ${seq}`;
  };
  /* ── helpers for Figma-style grouped advance view ─────────────── */
  const groupByNextRound = (candidates: SelectedCandidate[]) => {
    const groups: Record<string, SelectedCandidate[]> = {};
    candidates.forEach((c) => {
      const key = c.nextRoundName || 'Decision Pending';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  };

  const advanceFeedbackRoundName = (() => {
    if (statusType !== 'ADVANCE') return '';
    const currentCandidate = candidateDetails[0];
    const interviewRounds = currentCandidate?.interviewRounds || [];
    const explicitRoundId = Number(currentCandidate?.roundId);
    return getCurrentRoundLabel(interviewRounds, explicitRoundId);
  })();
  const groupIneligibleByCurrentRound = (candidates: SelectedCandidate[]) => {
    const groups: Record<string, SelectedCandidate[]> = {};
    candidates.forEach((c) => {
      // Pass the per-candidate roundId as explicitRoundId so getCurrentRoundLabel
      // uses the authoritative current-round ID from candidateDetails instead of
      // the heuristic fallback (which fails for candidates whose active round has
      // a non-null, non-completed status like INVITATION_SENT).
      const key = getCurrentRoundLabel(
        c.interviewRounds ?? [],
        c.roundId != null ? Number(c.roundId) : undefined
      );
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  };

  const isAdvanceBulkView =
    isBulkAction && (statusType === 'ADVANCE' || statusType === 'FINAL_ROUND_SHORTLIST');

  return (
    <div>
      {(isSubmitting || isLoading) && <Loader />}
      <div>
        {isBulkAction && (
          <div className="mb-4">
            {isAdvanceBulkView ? (
              /* ── Figma-style advance layout ──────────────────────── */
              <div>
                {/* Eligible label */}
                {selectedCandidates.filter((c) => c.isEligibleForAdvance).length > 0 && (
                  <p className="text-sm roboto-font mb-3 text-gray-700">
                    <span className="font-semibold">Eligible Candidates: </span>
                    {selectedCandidates.filter((c) => c.isEligibleForAdvance).length ===
                    selectedCandidates.length ? (
                      <>
                        All selected candidates are eligible to advance to the next round. Are you
                        sure you want to proceed?
                      </>
                    ) : (
                      <>
                        From the {selectedCandidates.length} selected candidate
                        {selectedCandidates.length !== 1 ? 's' : ''}, the{' '}
                        {selectedCandidates.filter((c) => c.isEligibleForAdvance).length} listed
                        below are eligible to advance to the next round. Are you sure you want to
                        proceed?
                      </>
                    )}
                  </p>
                )}
                {/* Eligible box */}
                <div className="max-h-72 overflow-y-auto custom-scrollbar rounded-lg border border-[var(--border)] bg-white">
                  {selectedCandidates.filter((c) => c.isEligibleForAdvance).length === 0 ? (
                    <div className="text-center text-gray-500 py-6 text-sm roboto-font">
                      {selectedCandidates.length > 0
                        ? statusType === 'FINAL_ROUND_SHORTLIST'
                          ? 'No candidates are eligible for final round shortlist. Please check candidate status.'
                          : 'No candidates are eligible for advance. Please check candidate status.'
                        : 'No candidates selected'}
                    </div>
                  ) : (
                    Object.entries(
                      groupByNextRound(selectedCandidates.filter((c) => c.isEligibleForAdvance))
                    ).map(([nextRound, groupCandidates]) => {
                      const firstRounds = groupCandidates[0]?.interviewRounds ?? [];
                      const firstRoundId = groupCandidates[0]?.roundId;
                      const currentRoundLabel = firstRounds.length
                        ? getCurrentRoundLabel(
                            firstRounds,
                            firstRoundId != null ? Number(firstRoundId) : undefined
                          )
                        : 'Resume Screening';
                      const nextRoundLabel = getNextRoundLabel(firstRounds, nextRound);
                      return (
                        <div
                          key={nextRound}
                          className="border-b border-[var(--border)] last:border-b-0"
                        >
                          {/* Group header */}
                          <div className="flex items-center px-4 py-2 bg-gray-50 text-xs text-gray-600 roboto-font">
                            <span className="flex-1">
                              Current Round:{' '}
                              <span className="font-semibold text-gray-800">
                                {currentRoundLabel}
                              </span>
                            </span>
                            <span className="text-gray-400 px-3">→</span>
                            <span className="flex-1 text-right">
                              Next Round:{' '}
                              <span className="font-semibold text-gray-800">{nextRoundLabel}</span>
                            </span>
                          </div>
                          {/* Candidates grid */}
                          <div className="grid grid-cols-3 gap-x-2 gap-y-1 px-4 py-3">
                            {groupCandidates.map((candidate) => {
                              const isDeselected = deselectedIds.has(candidate.id);
                              return (
                                <label
                                  key={candidate.id}
                                  className={`flex items-center gap-2 text-sm roboto-font cursor-pointer select-none ${
                                    isDeselected ? 'text-gray-400 line-through' : 'text-gray-700'
                                  }`}
                                >
                                  <Checkbox
                                    checked={!isDeselected}
                                    onChange={() =>
                                      setDeselectedIds((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(candidate.id)) next.delete(candidate.id);
                                        else next.add(candidate.id);
                                        return next;
                                      })
                                    }
                                    disabled={isSubmitting}
                                  />
                                  <span className="truncate">{candidate.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Ineligible section — outside the eligible box, no border wrapper */}
                {ineligibleCandidates.length > 0 && (
                  <div className="mt-3">
                    {/* Ineligible header */}
                    <div className="text-xs roboto-font mb-2">
                      <span className="font-semibold text-gray-800">Ineligible Candidates: </span>
                      <span className="text-[#FF383C]">
                        {statusType === 'ADVANCE'
                          ? 'Following candidate(s) cannot advance to the next round until their current round has been completed.'
                          : 'Disabled candidates cannot be shortlisted as their final interview round is not completed.'}
                      </span>
                    </div>
                    {/* Ineligible groups — inside a bordered box */}
                    <div className="rounded-lg border border-[var(--border)] bg-white overflow-hidden">
                      {Object.entries(groupIneligibleByCurrentRound(ineligibleCandidates)).map(
                        ([currentRound, groupCandidates], idx, arr) => (
                          <div
                            key={currentRound}
                            className={
                              idx < arr.length - 1 ? 'border-b border-[var(--border)]' : ''
                            }
                          >
                            <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 roboto-font">
                              Current Round: <span className="font-semibold">{currentRound}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-x-2 gap-y-1 px-4 py-3">
                              {groupCandidates.map((candidate) => (
                                <span
                                  key={candidate.id}
                                  className="text-sm text-gray-400 roboto-font truncate"
                                >
                                  {candidate.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
                {/* Send invite checkbox shown in bulk advance view when applicable */}
                {isAdvanceBulkView && showSendInviteCheckbox && (
                  <div className="mt-3">
                    <Controller
                      name="sendInterviewInvite"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          checked={!!field.value}
                          onChange={(event) => field.onChange(event.target.checked)}
                          disabled={isSubmitting}
                          className="custom-checkbox roboto-font"
                        >
                          {sendInviteCheckboxLabel ||
                            'Send interview invite for AI Audio Screening'}
                        </Checkbox>
                      )}
                    />
                  </div>
                )}
              </div>
            ) : (
              /* ── Original layout for SELECTED / NOT_SELECTED / REACTIVATE ── */
              <div className="max-h-60 overflow-y-auto custom-scrollbar bg-white border border-[var(--border)] rounded-lg p-3 mb-4">
                {selectedCandidates.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">No candidates selected</div>
                ) : (
                  <div className="space-y-1 mb-3">
                    {selectedCandidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-primary roboto-font">
                            {candidate.name}
                          </div>
                        </div>
                        {isBulkAction && showRatingSection && (
                          <div className="flex items-center">
                            <Tooltip title="Rate this candidate">
                              <Rate
                                value={candidateRatings[candidate.id] || 0}
                                onChange={(rating) => handleRatingChange(candidate.id, rating)}
                                disabled={isSubmitting}
                                count={5}
                                tooltips={['Strong No', 'No', 'Neutral', 'Yes', 'Strong Yes']}
                                style={{ fontSize: '18px' }}
                              />
                            </Tooltip>
                            {candidateRatings[candidate.id] > 0 && (
                              <span className="text-sm text-gray-600 ml-2 min-w-[80px]">
                                {
                                  ['Strong No', 'No', 'Neutral', 'Yes', 'Strong Yes'][
                                    candidateRatings[candidate.id] - 1
                                  ]
                                }
                              </span>
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveCandidate(candidate.id)}
                          disabled={isSubmitting}
                          className="ml-2 p-1 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <MdClose size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={handleSubmit(onSubmit)}>
          {statusType === 'NOT_SELECTED' && (
            <Form.Item
              label={
                <span>
                  Reason <span className="required-asterisk">*</span>
                </span>
              }
            >
              <Controller
                name="reason"
                control={control}
                render={({ field }) => (
                  <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl ">
                    <Select
                      {...field}
                      value={field.value || undefined}
                      onChange={(value) => {
                        field.onChange(value);
                      }}
                      className="w-full custom-select placeholder-style"
                      placeholder="Select reason"
                      allowClear
                      disabled={isSubmitting}
                      status={errors.reason ? 'error' : ''}
                    >
                      {rejectionReasons.map((reason) => (
                        <Option key={reason} value={reason}>
                          {reason}
                        </Option>
                      ))}
                    </Select>
                  </div>
                )}
              />
              {errors.reason && (
                <p className="text-red-500 text-sm mt-1">{errors.reason.message}</p>
              )}
            </Form.Item>
          )}

          <Form.Item
            label={
              <span className="roboto-font text-sm text-gray-700">
                {isAdvanceBulkView ? (
                  <>
                    <span className="font-semibold">
                      Feedback <span className="required-asterisk">*</span>:{' '}
                    </span>
                    Before proceeding, please provide feedback for the{' '}
                    <span className="font-semibold">current round.</span>
                  </>
                ) : statusType === 'ADVANCE' ? (
                  <>
                    <span className="font-semibold">
                      Feedback <span className="required-asterisk">*</span>:
                    </span>{' '}
                    Before proceeding, please provide feedback for the{' '}
                    <span className="font-semibold">{advanceFeedbackRoundName}.</span>
                  </>
                ) : (
                  <>
                    Comments <span className="required-asterisk">*</span>
                  </>
                )}
              </span>
            }
          >
            <Controller
              name="comments"
              control={control}
              render={({ field }) => (
                <div>
                  <TextArea
                    {...field}
                    placeholder={
                      isAdvanceBulkView || statusType === 'ADVANCE'
                        ? 'Add feedback here...'
                        : 'Add your comments here...'
                    }
                    rows={6}
                    className="w-full"
                    disabled={isSubmitting}
                    maxLength={1000}
                    showCount={{
                      formatter: ({ count, maxLength }) => `${count}/${maxLength} characters`,
                    }}
                    status={errors.comments ? 'error' : ''}
                  />
                  {errors.comments && (
                    <p className="text-red-500 text-sm mt-1">{errors.comments.message}</p>
                  )}
                </div>
              )}
            />
          </Form.Item>

          {statusType === 'ADVANCE' && !isBulkAction && showSendInviteCheckbox && (
            <Form.Item>
              <Controller
                name="sendInterviewInvite"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    checked={!!field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                    disabled={isSubmitting}
                    className="custom-checkbox roboto-font"
                  >
                    {sendInviteCheckboxLabel || 'Send interview invite for next round'}
                  </Checkbox>
                )}
              />
            </Form.Item>
          )}

          {showRatingSection && !isBulkAction && (
            <Form.Item label={<span>Final Rating</span>}>
              <Controller
                name="finalRating"
                control={control}
                render={({ field }) => {
                  const rating = field.value ?? 0;
                  const ratingLabels = {
                    1: 'Strong No',
                    2: 'No',
                    3: 'Neutral',
                    4: 'Yes',
                    5: 'Strong Yes',
                  };

                  return (
                    <div>
                      <div className="flex items-center gap-4">
                        <div>
                          <Rate
                            value={rating}
                            onChange={field.onChange}
                            disabled={isSubmitting}
                            count={5}
                            tooltips={['Strong No', 'No', 'Neutral', 'Yes', 'Strong Yes']}
                            style={{ fontSize: '24px' }}
                          />
                        </div>
                        {rating > 0 && (
                          <div className="text-sm whitespace-nowrap">
                            <span>{ratingLabels[rating as keyof typeof ratingLabels]}</span>
                          </div>
                        )}
                      </div>
                      {errors.finalRating && (
                        <p className="text-red-500 text-sm mt-1">{errors.finalRating.message}</p>
                      )}
                    </div>
                  );
                }}
              />
            </Form.Item>
          )}

          {statusType === 'NOT_SELECTED' && (
            <Form.Item>
              <Controller
                name="notifyCandidate"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    {...field}
                    checked={field.value}
                    onChange={field.onChange}
                    disabled={isSubmitting}
                    className="custom-checkbox roboto-font"
                  >
                    Notify the candidate via email.
                  </Checkbox>
                )}
              />
              {notifyCandidate && (
                <p className="text-sm text-gray-500 mt-1 ml-6">
                  An email will be sent to the candidate with the rejection details.
                </p>
              )}
            </Form.Item>
          )}

          <div className="flex justify-center space-x-3 pt-4 mt-6">
            <Button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2 border border-[var(--border)] bg-white rounded-3xl w-full"
            >
              {statusType === 'ADVANCE' ? 'CANCEL' : 'Cancel'}
            </Button>
            <Tooltip title={isSubmitDisabled && !isSubmitting ? submitDisabledReason : ''}>
              <span className="w-full">
                <Button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className={`px-6 py-2 border rounded-3xl text-white bg-primary w-full ${isSubmitDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} `}
                  loading={isSubmitting}
                >
                  {statusType === 'ADVANCE' ? 'CONFIRM' : 'SUBMIT'}
                </Button>
              </span>
            </Tooltip>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default CandidateStatus;
