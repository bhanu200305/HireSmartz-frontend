import { useEffect, useState } from 'react';
import { Drawer, Select } from 'antd';
import dayjs from 'dayjs';

import { Badge } from '../../components/shared/ui/badge';
import { Button } from '../../components/shared/ui/button';
import { Loader } from '../../components/shared/ui/loader';
import { showToast } from '../../components/shared';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';
import {
  useGetBookingQuery,
  useGetFollowUpsQuery,
  useGetParticipationQuery,
  useGetArtifactsQuery,
  useGetInterviewersQuery,
  useGetInterviewerCalendarStatusQuery,
  useGetSessionStateQuery,
  useCancelBookingMutation,
  useSkipBookingMutation,
  useUpdateBookingStatusMutation,
  useRequestFollowUpMutation,
  useSubstituteInterviewerMutation,
  useSubmitFeedbackMutation,
  useAttachRecordingMutation,
  type BookingStatus,
  type FeedbackRecommendation,
  type InterviewApiError,
} from '../../api/interview-service/client';
import { CandidateNameCell } from './CandidateNameCell';
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

const TERMINAL: BookingStatus[] = ['completed', 'cancelled', 'no_show', 'failed'];

const fmt = (iso: string | null): string =>
  iso && dayjs(iso).isValid() ? dayjs(iso).format('DD MMM YYYY, h:mm A') : '—';

const shortId = (id: string) => `${id.slice(0, 8)}…`;

type PendingAction = 'cancel' | 'skip' | 'status' | 'substitute' | null;

const RECOMMENDATION_OPTIONS: Array<{ label: string; value: FeedbackRecommendation }> = [
  { label: 'Strong yes', value: 'strong_yes' },
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
  { label: 'Strong no', value: 'strong_no' },
];

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex justify-between gap-4 py-1.5 text-sm">
    <span className="shrink-0 text-neutral-500">{label}</span>
    <span className="text-right text-neutral-800">{children}</span>
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-neutral-500">
    {children}
  </h3>
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

  const { data: booking, isLoading, isFetching, error } = useGetBookingQuery(id, { skip: !open });
  const { data: followUps } = useGetFollowUpsQuery(id, { skip: !open });
  const { data: participation } = useGetParticipationQuery(id, { skip: !open });
  const { data: artifacts } = useGetArtifactsQuery(id, { skip: !open });

  const canCancel = useHasAccess(Authorities.INTERVIEW_QUESTIONS_DELETE);
  const canUpdate = useHasAccess(Authorities.INTERVIEW_QUESTIONS_UPDATE);
  const canFollowUp = useHasAccess(Authorities.INTERVIEW_QUESTIONS_EDIT);

  const isPanel = booking?.interview_type === 'panel';
  const isVideo = booking?.interview_type === 'ai_video' || isPanel;
  const { data: interviewers } = useGetInterviewersQuery(undefined, {
    skip: !open || !isPanel || !canUpdate,
  });
  const { data: calendarStatus } = useGetInterviewerCalendarStatusQuery(id, {
    skip: !open || !isPanel,
  });
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

  const [pending, setPending] = useState<PendingAction>(null);
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
        showToast({ message: 'Interview cancelled.', type: 'success' });
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
      showToast({ message: err?.message || 'Action failed.', type: 'error' });
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
  const apiError = error as InterviewApiError | undefined;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={460}
      title={booking ? 'Interview' : 'Interview details'}
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
              <CandidateNameCell candidateId={booking.candidate_id} />
              <Badge status={bookingStatusBadge(booking.status)}>
                {bookingStatusLabel(booking.status)}
              </Badge>
            </div>

            <SectionTitle>Overview</SectionTitle>
            <div className="divide-y divide-neutral-100">
              <Row label="Type">{interviewTypeLabel(booking.interview_type)}</Row>
              <Row label="Round">Round {booking.sequence_no}</Row>
              <Row label="Scheduled">{fmt(booking.start_time)}</Row>
              <Row label="Ends">{fmt(booking.end_time)}</Row>
              <Row label="Timezone">{booking.attendee_timezone || '—'}</Row>
              {booking.rescheduled_from_booking_id && (
                <Row label="Rescheduled from">
                  <span className="font-mono text-xs">
                    {shortId(booking.rescheduled_from_booking_id)}
                  </span>
                </Row>
              )}
              {booking.cancellation_reason && (
                <Row label="Cancellation reason">{booking.cancellation_reason}</Row>
              )}
              {booking.skip_reason && <Row label="Skip reason">{booking.skip_reason}</Row>}
            </div>

            <details className="mt-3 text-xs text-neutral-500">
              <summary className="cursor-pointer select-none">Identifiers</summary>
              <div className="mt-1 space-y-0.5 font-mono">
                <div>booking {booking.id}</div>
                <div>candidate {booking.candidate_id}</div>
                <div>job {booking.job_id}</div>
                <div>round {booking.round_id}</div>
              </div>
            </details>

            {/* Panel interviewers — calendar-connection status */}
            {isPanel && calendarStatus && calendarStatus.interviewers.length > 0 && (
              <>
                <SectionTitle>Panel interviewers</SectionTitle>
                <ul className="space-y-1.5 text-sm">
                  {calendarStatus.interviewers.map((iv) => (
                    <li key={iv.interviewer_id} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-neutral-700">
                        {iv.display_name || iv.email || `${iv.interviewer_id.slice(0, 8)}…`}
                      </span>
                      <Badge status={iv.calendar_connected ? 'success' : 'warning'} dot={false}>
                        {iv.calendar_connected ? 'Calendar connected' : 'No calendar'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Follow-up notes */}
            <SectionTitle>Follow-up notes</SectionTitle>
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
                  className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
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
                    Add note
                  </Button>
                </div>
              </div>
            )}

            {/* Live session state — scheduled video rounds only */}
            {sessionState && (
              <>
                <SectionTitle>Live session</SectionTitle>
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
                  <Row label="In the room">{sessionState.participants.length}</Row>
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
                        <span className="capitalize text-neutral-700">
                          {a.kind}
                          {a.playback_token && (
                            <a
                              href={`/recordings?token=${encodeURIComponent(a.playback_token)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-xs font-medium text-brand-600 hover:text-brand-700"
                            >
                              View
                            </a>
                          )}
                        </span>
                        <Badge status="neutral" dot={false}>
                          {String(a.handoff_status).replace(/_/g, ' ')}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-neutral-400">No recordings attached yet.</p>
                )}
                {canFollowUp && (
                  <div className="mt-2 flex gap-2">
                    <input
                      className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                      placeholder="Attach recording by reference…"
                      value={recordingRef}
                      onChange={(e) => setRecordingRef(e.target.value)}
                    />
                    <Button
                      className={GHOST_BTN}
                      disabled={!recordingRef.trim() || attachState.isLoading}
                      onClick={saveRecording}
                    >
                      Attach
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Interviewer feedback — relayed to Candidate Service, not stored here */}
            {canFollowUp && (
              <>
                <SectionTitle>Submit feedback</SectionTitle>
                <div className="space-y-2">
                  <Select<FeedbackRecommendation>
                    className="w-full"
                    placeholder="Recommendation"
                    value={recommendation}
                    options={RECOMMENDATION_OPTIONS}
                    onChange={(v) => setRecommendation(v)}
                  />
                  <textarea
                    className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                    rows={3}
                    placeholder="Notes for the hiring team…"
                    value={feedbackNotes}
                    onChange={(e) => setFeedbackNotes(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button
                      className={GHOST_BTN}
                      disabled={!recommendation || !feedbackNotes.trim() || feedbackState.isLoading}
                      onClick={sendFeedback}
                    >
                      Submit feedback
                    </Button>
                  </div>
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
                      className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
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
                        ? 'Confirm cancel'
                        : pending === 'skip'
                          ? 'Confirm skip'
                          : pending === 'substitute'
                            ? 'Replace'
                            : 'Update status'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {canUpdate && (
                    <Button className={GHOST_BTN} onClick={() => setPending('status')}>
                      Change status
                    </Button>
                  )}
                  {canUpdate && isPanel && (
                    <Button
                      className={GHOST_BTN}
                      disabled={isTerminal}
                      onClick={() => setPending('substitute')}
                    >
                      Replace interviewer
                    </Button>
                  )}
                  {canUpdate && (
                    <Button
                      className={GHOST_BTN}
                      disabled={isTerminal}
                      onClick={() => setPending('skip')}
                    >
                      Skip round
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      className={DANGER_BTN}
                      disabled={isTerminal}
                      onClick={() => setPending('cancel')}
                    >
                      Cancel interview
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
