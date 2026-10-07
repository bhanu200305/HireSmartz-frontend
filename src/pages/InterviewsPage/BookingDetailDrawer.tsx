import { useEffect, useRef, useState } from 'react';
import { Drawer, Select } from 'antd';
import dayjs from 'dayjs';
import { LuExternalLink, LuCirclePlay } from 'react-icons/lu';
import { Link } from 'react-router-dom';

import { Badge } from '../../components/shared/ui/badge';
import { Button } from '../../components/shared/ui/button';
import { Loader } from '../../components/shared/ui/loader';
import { showToast } from '../../components/shared';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';
import { useGetCandidateQuery } from '../../api/candidate-service/Candidates/CandidateLifecycle';
import { buildCandidateDetailsPath } from '../../components/JobsOpening/Candidates/useCandidateNavigation';
import {
  useGetBookingQuery,
  useGetFollowUpsQuery,
  useGetParticipationQuery,
  useGetArtifactsQuery,
  useGetInterviewersQuery,
  useGetInterviewerCalendarStatusQuery,
  useNudgeInterviewerCalendarConnectMutation,
  useGetSessionStateQuery,
  useCancelBookingMutation,
  useSkipBookingMutation,
  useUpdateBookingStatusMutation,
  useRequestFollowUpMutation,
  useSubstituteInterviewerMutation,
  useSubmitFeedbackMutation,
  useAttachRecordingMutation,
  useUploadOfflineRecordingMutation,
  toUploadableAudioFile,
  AUDIO_UPLOAD_ACCEPT,
  type BookingStatus,
  type FeedbackRecommendation,
  type InterviewApiError,
} from '../../api/interview-service/client';
import { useGetJobQuestionsQuery } from '../../api/job-service/JobOpening/jobQuestions';
import { CandidateNameCell } from './CandidateNameCell';
import { useJobTitleForOpening } from './useJobTitleForOpening';
import {
  BOOKING_STATUS_OPTIONS,
  bookingStatusBadge,
  bookingStatusLabel,
  interviewTypeLabel,
} from './interviewLabels';

const PRIMARY_BTN =
  'text-white bg-button rounded-3xl px-4 py-2 text-sm shadow-xs hover:shadow-sm transition-shadow disabled:opacity-50';
const GHOST_BTN =
  'rounded-3xl border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50';
const DANGER_BTN =
  'rounded-3xl bg-danger-bg px-4 py-2 text-sm font-medium text-danger-text hover:brightness-95 disabled:opacity-50';

const TERMINAL: BookingStatus[] = [
  'completed',
  'cancelled',
  'no_show',
  'interviewer_no_show',
  'failed',
];

const fmt = (iso: string | null): string =>
  iso && dayjs(iso).isValid() ? dayjs(iso).format('MMM D, YYYY, h:mm A') : '-';

type PendingAction = 'cancel' | 'skip' | 'status' | 'substitute' | null;

const RECOMMENDATION_OPTIONS: Array<{ label: string; value: FeedbackRecommendation }> = [
  { label: 'Strong Yes', value: 'strong_yes' },
  { label: 'Yes', value: 'yes' },
  { label: 'Neutral', value: 'neutral' },
  { label: 'No', value: 'no' },
  { label: 'Strong No', value: 'strong_no' },
];

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex justify-between gap-4 py-1.5 text-sm">
    <span className="shrink-0 text-neutral-500">{label}</span>
    <span className="text-right text-neutral-800">{children}</span>
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-2 mt-6 text-xs font-semibold tracking-wide text-neutral-500">{children}</h3>
);

export const BookingDetailDrawer = ({
  bookingId,
  onClose,
}: {
  bookingId: string | null;
  onClose: () => void;
}) => {
  const open = Boolean(bookingId);
  const id = bookingId ?? '';

  const {
    data: booking,
    isLoading,
    isFetching,
    error,
  } = useGetBookingQuery(id, {
    skip: !open,
    // Both the candidate's scheduling email AND (for PANEL) this booking's
    // status flipping to "Scheduled" happen server-side once the last
    // interviewer connects their calendar — nothing clicked in this drawer
    // triggers either, so it has to catch up on its own. `refetchOnMount...`
    // covers "opened again later"; the poll covers "left open while it
    // happens".
    refetchOnMountOrArgChange: true,
    pollingInterval: 20_000,
    skipPollingIfUnfocused: true,
  });
  const { data: followUps } = useGetFollowUpsQuery(id, { skip: !open });
  const { data: participation } = useGetParticipationQuery(id, { skip: !open });
  const { data: artifacts } = useGetArtifactsQuery(id, { skip: !open });

  const canCancel = useHasAccess(Authorities.INTERVIEW_QUESTIONS_DELETE);
  const canUpdate = useHasAccess(Authorities.INTERVIEW_QUESTIONS_UPDATE);
  const canFollowUp = useHasAccess(Authorities.INTERVIEW_QUESTIONS_EDIT);
  // Looser than the action gates above — a panel interviewer who only
  // needs to READ this round's questions before the call may well hold
  // interview:read without holding update/delete/edit.
  const canViewQuestions = useHasAccess(Authorities.INTERVIEW_QUESTIONS_VIEW);

  const isPanel = booking?.interview_type === 'panel';
  const isVideo = booking?.interview_type === 'ai_video' || isPanel;
  // Only an offline PANEL round has no LiveKit egress to auto-record it —
  // online PANEL/AI_VIDEO get their recording automatically, so manually
  // attaching one there would just create a second, conflicting artifact.
  const isOfflinePanel = isPanel && booking?.round_snapshot?.delivery_mode === 'offline';
  const { data: interviewers } = useGetInterviewersQuery(undefined, {
    skip: !open || !isPanel || !canUpdate,
  });
  const { data: calendarStatus } = useGetInterviewerCalendarStatusQuery(id, {
    skip: !open || !isPanel,
    refetchOnMountOrArgChange: true,
    pollingInterval: 15_000,
    skipPollingIfUnfocused: true,
    refetchOnFocus: true,
  });
  // Job Service owns the question bank, grouped by round — matched back to
  // THIS booking's round by `sequence_no`, not `round_id`, because a round
  // TYPE (e.g. "Hiring Panel") can repeat more than once in one job's plan
  // and every repeat shares the same `round_id`; only the sequence number
  // is unique per round instance (see candidate-service's own
  // `CandidateInterviewRound.job_round_instance_id` docstring for the full
  // reasoning — that's the id that actually disambiguates repeats, but
  // interview-service's booking never carries it, so sequence is the one
  // key both sides already agree on).
  const { data: jobQuestions } = useGetJobQuestionsQuery(booking?.job_id ?? '', {
    skip: !open || !isPanel || !canViewQuestions || !booking?.job_id,
  });
  const roundQuestions = jobQuestions?.rounds.find((r) => r.sequence === booking?.sequence_no);
  // Live session state — only meaningful for a scheduled/in-progress video round.
  const { data: sessionState } = useGetSessionStateQuery(id, {
    skip: !open || !isVideo || booking?.status !== 'scheduled',
  });

  const [cancelBooking, cancelState] = useCancelBookingMutation();
  const [skipBooking, skipState] = useSkipBookingMutation();
  const [updateStatus, statusState] = useUpdateBookingStatusMutation();
  const [requestFollowUp, followUpState] = useRequestFollowUpMutation();
  const [substituteInterviewer, substituteState] = useSubstituteInterviewerMutation();
  const [submitFeedback, feedbackState] = useSubmitFeedbackMutation();
  const [attachRecording, attachState] = useAttachRecordingMutation();
  const [uploadOfflineRecording, uploadState] = useUploadOfflineRecordingMutation();
  const [nudgeCalendarConnect] = useNudgeInterviewerCalendarConnectMutation();
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  const [pending, setPending] = useState<PendingAction>(null);
  // Which interviewer's "Send reminder" is in flight, if any — nudging one
  // must not disable/relabel every OTHER interviewer's button too (the
  // mutation hook's own `isLoading` is shared across every row, not
  // per-interviewer).
  const [nudgingInterviewerId, setNudgingInterviewerId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [targetStatus, setTargetStatus] = useState<BookingStatus>('completed');
  const [newInterviewerId, setNewInterviewerId] = useState<string | undefined>(undefined);
  const [note, setNote] = useState('');
  const [recommendation, setRecommendation] = useState<FeedbackRecommendation | undefined>(
    undefined
  );
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [recordingRef, setRecordingRef] = useState('');

  // Reset transient UI whenever a different booking is opened / the drawer closes.
  useEffect(() => {
    setPending(null);
    setReason('');
    setNote('');
    setTargetStatus('completed');
    setNewInterviewerId(undefined);
    setRecommendation(undefined);
    setFeedbackNotes('');
    setRecordingRef('');
  }, [bookingId]);

  const saveRecording = async () => {
    if (!recordingRef.trim()) return;
    try {
      await attachRecording({ bookingId: id, external_ref: recordingRef.trim() }).unwrap();
      setRecordingRef('');
      showToast({ message: 'Recording attached.', type: 'success' });
    } catch (e) {
      const err = e as InterviewApiError;
      showToast({ message: err?.message || 'Could not attach recording.', type: 'error' });
    }
  };

  const sendCalendarReminder = async (interviewerId: string) => {
    setNudgingInterviewerId(interviewerId);
    try {
      await nudgeCalendarConnect({ bookingId: id, interviewerId }).unwrap();
      showToast({ message: 'Reminder sent.', type: 'success' });
    } catch (e) {
      const err = e as InterviewApiError;
      showToast({ message: err?.message || 'Could not send reminder.', type: 'error' });
    } finally {
      setNudgingInterviewerId(null);
    }
  };

  // Real bytes, alongside `saveRecording`'s by-reference version above —
  // same sibling relationship `upload_offline_recording.py` documents
  // server-side. Both endpoints are idempotent per booking (a second call
  // to EITHER one just hands back whatever the FIRST call stored, never
  // replaces it), so `hasRecording` below disables both once one exists
  // rather than letting a second attempt look like it did something.
  const handleAudioFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const audioFile = toUploadableAudioFile(file);
    if (!audioFile) {
      showToast({ message: 'Please choose an audio file.', type: 'error' });
      return;
    }
    if (audioFile.size === 0) {
      showToast({ message: 'This audio file is empty.', type: 'error' });
      return;
    }
    try {
      await uploadOfflineRecording({ bookingId: id, file: audioFile }).unwrap();
      showToast({ message: 'Recording uploaded.', type: 'success' });
    } catch (e2) {
      const err = e2 as InterviewApiError;
      showToast({ message: err?.message || 'Could not upload the recording.', type: 'error' });
    }
  };

  const busy =
    cancelState.isLoading ||
    skipState.isLoading ||
    statusState.isLoading ||
    followUpState.isLoading ||
    substituteState.isLoading;

  const runAction = async () => {
    if (!booking) return;
    try {
      if (pending === 'cancel') {
        await cancelBooking({ bookingId: id, reason: reason.trim() || null }).unwrap();
        showToast({ message: 'Interview canceled.', type: 'success' });
      } else if (pending === 'skip') {
        await skipBooking({ bookingId: id, reason: reason.trim() || null }).unwrap();
        showToast({ message: 'Round skipped.', type: 'success' });
      } else if (pending === 'status') {
        await updateStatus({
          bookingId: id,
          target_status: targetStatus,
          reason: reason.trim() || null,
        }).unwrap();
        showToast({
          message: `Status set to ${bookingStatusLabel(targetStatus)}.`,
          type: 'success',
        });
      } else if (pending === 'substitute') {
        if (!newInterviewerId) return;
        await substituteInterviewer({
          bookingId: id,
          new_interviewer_id: newInterviewerId,
        }).unwrap();
        showToast({ message: 'Interviewer replaced.', type: 'success' });
      }
      setPending(null);
      setReason('');
      setNewInterviewerId(undefined);
    } catch (e) {
      const err = e as InterviewApiError;
      // Friendly wording for the conflicts the backend names; anything else
      // falls back to the server's own message.
      const message =
        err?.code === 'INTERVIEW_IN_PROGRESS'
          ? "Can't skip: the interview is in progress."
          : err?.code === 'BOOKING_TERMINAL'
            ? 'This round has already concluded.'
            : err?.code === 'CANDIDATE_ALREADY_SELECTED'
              ? 'This candidate has already been selected, so the remaining rounds are closed.'
              : err?.message || 'Action failed.';
      showToast({
        message,
        type: err?.code === 'CANDIDATE_ALREADY_SELECTED' ? 'info' : 'error',
      });
    }
  };

  const sendFeedback = async () => {
    if (!recommendation || !feedbackNotes.trim()) return;
    try {
      await submitFeedback({
        bookingId: id,
        recommendation,
        notes: feedbackNotes.trim(),
      }).unwrap();
      setRecommendation(undefined);
      setFeedbackNotes('');
      showToast({ message: 'Feedback submitted.', type: 'success' });
    } catch (e) {
      const err = e as InterviewApiError;
      showToast({ message: err?.message || 'Could not submit feedback.', type: 'error' });
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    try {
      await requestFollowUp({ bookingId: id, note_text: note.trim() }).unwrap();
      setNote('');
      showToast({ message: 'Follow-up note added.', type: 'success' });
    } catch (e) {
      const err = e as InterviewApiError;
      showToast({ message: err?.message || 'Could not add note.', type: 'error' });
    }
  };

  const isTerminal = booking ? TERMINAL.includes(booking.status) : true;
  const hasRecording = Boolean(artifacts?.artifacts.some((a) => a.kind === 'recording'));
  const apiError = error as InterviewApiError | undefined;

  const resolveJobTitle = useJobTitleForOpening();
  const jobTitle =
    booking?.round_snapshot?.job_title?.trim() || (booking ? resolveJobTitle(booking.job_id) : '');
  const roundDurationMin = booking?.round_snapshot?.duration_minutes ?? null;

  // Same candidate query `CandidateNameCell` below already fires — RTK
  // Query dedupes identical args into one request, so this just reads the
  // `job_opening_id` that request already has, to build the profile link.
  const { data: candidateForProfile } = useGetCandidateQuery(booking?.candidate_id ?? '', {
    skip: !open || !booking?.candidate_id,
  });
  const profileHref =
    booking && candidateForProfile?.job_opening_id
      ? buildCandidateDetailsPath(candidateForProfile.job_opening_id, booking.candidate_id)
      : null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={460}
      title={booking ? 'Interview' : 'Interview Details'}
      styles={{ body: { padding: 0 } }}
    >
      {isLoading || (isFetching && !booking) ? (
        <div className="flex justify-center py-16">
          <Loader />
        </div>
      ) : apiError || !booking ? (
        <div className="px-5 py-16 text-center text-sm text-neutral-600">
          {apiError?.message || 'Could not load this interview.'}
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CandidateNameCell candidateId={booking.candidate_id} />
                {jobTitle && (
                  <div className="mt-1 truncate text-sm text-neutral-600">{jobTitle}</div>
                )}
              </div>
              <Badge status={bookingStatusBadge(booking.status)}>
                {bookingStatusLabel(booking.status)}
              </Badge>
            </div>

            {profileHref && (
              <Link
                to={profileHref}
                state={{ returnTo: '/interviews', returnLabel: 'Back to Calendar' }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100"
              >
                View Full Candidate Profile
                <LuExternalLink size={14} />
              </Link>
            )}

            <SectionTitle>Overview</SectionTitle>
            <div className="divide-y divide-neutral-100">
              <Row label="Type">{interviewTypeLabel(booking.interview_type)}</Row>
              <Row label="Round">
                Round {booking.sequence_no}
                {roundDurationMin ? ` · ${roundDurationMin} min` : ''}
              </Row>
              <Row label="Scheduled">{fmt(booking.start_time)}</Row>
              <Row label="Ends">{fmt(booking.end_time)}</Row>
              <Row label="Timezone">{booking.attendee_timezone || '-'}</Row>
              {booking.rescheduled_from_booking_id && (
                <Row label="Rescheduled">Yes, moved from an earlier slot</Row>
              )}
              {booking.cancellation_reason && (
                <Row label="Cancellation Reason">{booking.cancellation_reason}</Row>
              )}
              {booking.skip_reason && <Row label="Skip Reason">{booking.skip_reason}</Row>}
            </div>

            <button
              type="button"
              className="mt-3 text-xs font-medium text-neutral-400 hover:text-neutral-600 cursor-pointer"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(booking.id)
                  .then(() => showToast({ message: 'Support reference copied.', type: 'success' }))
                  .catch(() => undefined);
              }}
            >
              Copy Support Reference
            </button>

            {/* Panel interviewers — calendar-connection status */}
            {isPanel && calendarStatus && calendarStatus.interviewers.length > 0 && (
              <>
                <SectionTitle>Panel Interviewers</SectionTitle>
                <ul className="space-y-1.5 text-sm">
                  {calendarStatus.interviewers.map((iv) => (
                    <li key={iv.interviewer_id} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-neutral-700">
                        {iv.display_name || iv.email || 'Interviewer'}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge status={iv.calendar_connected ? 'success' : 'warning'} dot={false}>
                          {iv.calendar_connected ? 'Calendar Connected' : 'No calendar'}
                        </Badge>
                        {/* interview:write, matching the backend route's own
                            require_permission — canUpdate (interview:update)
                            would be the wrong gate here, canFollowUp
                            (interview:write) is the one that actually lines
                            up, so a read-only viewer never sees a button
                            that's only going to 403. */}
                        {!iv.calendar_connected && canFollowUp && (
                          <button
                            type="button"
                            onClick={() => void sendCalendarReminder(iv.interviewer_id)}
                            disabled={nudgingInterviewerId === iv.interviewer_id}
                            className="text-xs font-medium text-primary-600 hover:underline disabled:opacity-50"
                          >
                            {nudgingInterviewerId === iv.interviewer_id
                              ? 'Sending…'
                              : 'Send Reminder'}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Interview questions — this round's slice of the job's question
                bank, read-only. What a panel interviewer opens this drawer
                for. */}
            {isPanel && canViewQuestions && (
              <>
                <SectionTitle>Interview Questions</SectionTitle>
                {roundQuestions && roundQuestions.questions.length > 0 ? (
                  <ol className="list-decimal space-y-3 pl-5 text-sm">
                    {roundQuestions.questions.map((q) => (
                      <li key={q.id} className="text-neutral-800">
                        {q.question_text}
                        {q.answer_text && (
                          <p className="mt-0.5 text-xs text-neutral-400">{q.answer_text}</p>
                        )}
                        {q.scoring_sections.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {q.scoring_sections.map((section) => (
                              <Badge key={section} status="neutral" dot={false}>
                                {section}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-neutral-400">
                    No questions have been added for this round yet.
                  </p>
                )}
              </>
            )}

            {/* Follow-up notes */}
            <SectionTitle>Follow-Up Notes</SectionTitle>
            {followUps && followUps.requests.length > 0 ? (
              <ul className="space-y-2">
                {[...followUps.requests]
                  .sort((a, b) => b.requested_at.localeCompare(a.requested_at))
                  .map((r) => (
                    <li key={r.id} className="rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                      <p className="text-neutral-800">{r.note_text}</p>
                      <p className="mt-1 text-xs text-neutral-400">{fmt(r.requested_at)}</p>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-400">No follow-up notes yet.</p>
            )}
            {canFollowUp && (
              <div className="mt-2">
                <textarea
                  className="w-full resize-none rounded-lg border border-neutral-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  rows={2}
                  placeholder="Add a follow-up note…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="mt-1 flex justify-end">
                  <Button
                    className={GHOST_BTN}
                    disabled={!note.trim() || followUpState.isLoading}
                    onClick={addNote}
                  >
                    Add Note
                  </Button>
                </div>
              </div>
            )}

            {/* Live session state — scheduled video rounds only */}
            {sessionState && (
              <>
                <SectionTitle>Live Session</SectionTitle>
                <div className="divide-y divide-neutral-100">
                  <Row label="Room">
                    <Badge
                      status={
                        sessionState.status === 'active'
                          ? 'success'
                          : sessionState.status === 'failed'
                            ? 'danger'
                            : 'neutral'
                      }
                    >
                      {sessionState.status}
                    </Badge>
                  </Row>
                  <Row label="Recording">
                    {sessionState.recording_active ? 'Active' : 'Not recording'}
                  </Row>
                  <Row label="In the Room">{sessionState.participants.length}</Row>
                </div>
              </>
            )}

            {/* Participation (read-only) */}
            {participation && participation.participants.length > 0 && (
              <>
                <SectionTitle>Participation</SectionTitle>
                <ul className="space-y-1.5 text-sm">
                  {participation.participants.map((p, i) => (
                    <li key={`${p.participant_ref_id}-${i}`} className="flex justify-between gap-3">
                      <span className="capitalize text-neutral-700">{p.participant_type}</span>
                      <span className="text-neutral-500">
                        {fmt(p.joined_at)}
                        {p.duration_seconds != null &&
                          ` · ${Math.round(p.duration_seconds / 60)} min`}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Artifacts — recording/transcript references + playback link */}
            {((artifacts && artifacts.artifacts.length > 0) || canFollowUp) && (
              <>
                <SectionTitle>Recordings &amp; transcripts</SectionTitle>
                {artifacts && artifacts.artifacts.length > 0 ? (
                  <ul className="space-y-1.5 text-sm">
                    {artifacts.artifacts.map((a, i) => (
                      <li
                        key={`${a.kind}-${i}`}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="capitalize text-neutral-700">{a.kind}</span>
                        <div className="flex items-center gap-2">
                          {a.playback_token && (
                            <a
                              href={`/recordings?token=${encodeURIComponent(a.playback_token)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                            >
                              <LuCirclePlay size={13} />
                              Play
                            </a>
                          )}
                          <Badge status="neutral" dot={false}>
                            {String(a.handoff_status).replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-neutral-400">No recordings attached yet.</p>
                )}
                {canFollowUp && isOfflinePanel && (
                  <div className="mt-2 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none disabled:opacity-50"
                        placeholder="Attach recording by reference…"
                        value={recordingRef}
                        onChange={(e) => setRecordingRef(e.target.value)}
                        disabled={hasRecording}
                      />
                      <Button
                        className={GHOST_BTN}
                        disabled={!recordingRef.trim() || attachState.isLoading || hasRecording}
                        onClick={saveRecording}
                      >
                        Attach
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400">or</span>
                      <input
                        ref={audioFileInputRef}
                        type="file"
                        accept={AUDIO_UPLOAD_ACCEPT}
                        className="hidden"
                        onChange={(e) => void handleAudioFileSelected(e)}
                      />
                      <Button
                        className={GHOST_BTN}
                        disabled={uploadState.isLoading || hasRecording}
                        onClick={() => audioFileInputRef.current?.click()}
                      >
                        {uploadState.isLoading ? 'Uploading…' : 'Upload A Recording File'}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Interviewer feedback — relayed to Candidate Service, not stored here */}
            {canFollowUp && (
              <>
                <SectionTitle>Submit Feedback</SectionTitle>
                <div className="space-y-3 rounded-lg border border-neutral-200 p-3">
                  <div>
                    <span className="mb-1 block text-xs font-medium text-neutral-600">
                      Recommendation
                    </span>
                    <Select<FeedbackRecommendation>
                      className="w-full"
                      size="large"
                      placeholder="Select a Recommendation"
                      value={recommendation}
                      options={RECOMMENDATION_OPTIONS}
                      onChange={(v) => setRecommendation(v)}
                    />
                  </div>
                  <div>
                    <span className="mb-1 block text-xs font-medium text-neutral-600">Notes</span>
                    <textarea
                      className="w-full resize-none rounded-lg border border-neutral-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
                      rows={3}
                      placeholder="Notes for the hiring team…"
                      value={feedbackNotes}
                      onChange={(e) => setFeedbackNotes(e.target.value)}
                    />
                  </div>
                  <Button
                    className={`${PRIMARY_BTN} w-full`}
                    disabled={!recommendation || !feedbackNotes.trim() || feedbackState.isLoading}
                    onClick={sendFeedback}
                  >
                    {feedbackState.isLoading ? 'Submitting…' : 'Submit Feedback'}
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Action footer */}
          {(canCancel || canUpdate) && (
            <div className="border-t border-neutral-200 bg-neutral-50 px-5 py-4">
              {pending ? (
                <div className="space-y-2">
                  {pending === 'status' && (
                    <Select<BookingStatus>
                      className="w-full"
                      value={targetStatus}
                      options={BOOKING_STATUS_OPTIONS}
                      onChange={(v) => setTargetStatus(v)}
                    />
                  )}
                  {pending === 'substitute' ? (
                    <Select<string>
                      className="w-full"
                      placeholder="Pick a replacement interviewer"
                      value={newInterviewerId}
                      options={(interviewers?.interviewers ?? []).map((i) => ({
                        label: `${i.display_name} · ${i.email}`,
                        value: i.id,
                      }))}
                      onChange={(v) => setNewInterviewerId(v)}
                    />
                  ) : (
                    <textarea
                      className="w-full resize-none rounded-lg border border-neutral-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
                      rows={2}
                      placeholder="Reason (optional)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      className={GHOST_BTN}
                      disabled={busy}
                      onClick={() => {
                        setPending(null);
                        setReason('');
                        setNewInterviewerId(undefined);
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      className={pending === 'cancel' ? DANGER_BTN : PRIMARY_BTN}
                      disabled={busy || (pending === 'substitute' && !newInterviewerId)}
                      onClick={runAction}
                    >
                      {pending === 'cancel'
                        ? 'Confirm Cancel'
                        : pending === 'skip'
                          ? 'Confirm Skip'
                          : pending === 'substitute'
                            ? 'Replace'
                            : 'Update Status'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {canUpdate && (
                    <Button className={GHOST_BTN} onClick={() => setPending('status')}>
                      Change Status
                    </Button>
                  )}
                  {canUpdate && isPanel && (
                    <Button
                      className={GHOST_BTN}
                      disabled={isTerminal}
                      onClick={() => setPending('substitute')}
                    >
                      Replace Interviewer
                    </Button>
                  )}
                  {canUpdate && (
                    <Button
                      className={GHOST_BTN}
                      disabled={isTerminal}
                      onClick={() => setPending('skip')}
                    >
                      Skip Round
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      className={DANGER_BTN}
                      disabled={isTerminal}
                      onClick={() => setPending('cancel')}
                    >
                      Cancel Interview
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
};
