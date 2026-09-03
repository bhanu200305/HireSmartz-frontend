import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Rate, Tabs, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { LuMail, LuPencil, LuSquarePen, LuThumbsDown, LuThumbsUp } from 'react-icons/lu';
import { IoChatbubbleEllipses } from 'react-icons/io5';
import { CommonCard, Button, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import { NotesPillTrigger } from '../Notes/NotesPillTrigger';
import { useGetJobOpeningByIdQuery } from '../../../api/job-service/JobOpening/GetJobOpeningById';
import { asJobId } from '../../../api/job-service/jobId';
import {
  useGetCandidateQuery,
  type CandidateView,
} from '../../../api/candidate-service/Candidates/CandidateLifecycle';
import { useListCandidateInterviewRoundsQuery } from '../../../api/candidate-service/Candidates/interviewRounds';
import {
  useListCandidateInterviewScoresQuery,
  useDeleteResumeReviewMutation,
  useLazyGetCandidateResumeDownloadQuery,
} from '../../../api/candidate-service/Candidates/scoring';
import { useListRecruiterNotesQuery } from '../../../api/candidate-service/Candidates/notes';
import {
  useCreateBookingMutation,
  useGetBookingQuery,
  useLazyGetCalendarConnectUrlQuery,
} from '../../../api/interview-service/client';
import type { CandidateInterviewRoundView } from '../../../api/candidate-service/Candidates/interviewRounds';
import { getCandidateErrorMessage } from '../../../shared/utils/auth/candidateError.helpers';
import ChangeCandidateStatusModal, {
  type ChangeCandidateStatusMode,
} from './Modal/ChangeCandidateStatusModal';
import BulkEmailCandidatesModal from './Modal/BulkEmailCandidatesModal';
import BulkSendSmsModal from './Modal/BulkSendSmsModal';
import CandidateRecruiterNotesPanel from './Notes/CandidateRecruiterNotesPanel';
import ResumeReviewModal from './Modal/ResumeReviewModal';
import RecruiterRoundScoreModal from './Modal/RecruiterRoundScoreModal';
import PipelineBoard from './PipelineBoard';
import StatusHistoryTab from './StatusHistoryTab';
import EditCandidateModal from './Modal/EditCandidateModal';

// Rewritten against the real candidate-service contract — replaces the
// previous ~2050-line version, which was built entirely around a legacy
// round-type-specific model (per-round AI/VIDEO/IN_PERSON evaluation
// dashboards, a fixed Overall/Resume/AI-Audio/Video/In-person scoring
// grid, multi-job "assigned jobs" switching, SSE candidate streaming,
// manual interview-invite scheduling) that has no equivalent on
// candidate-service's real, deliberately much simpler model — see
// PROJECT_UNDERSTANDING.md §4. Kept the same header-card + tab-strip visual
// shell this app already uses elsewhere (`CommonCard`, pill status badge,
// circular icon-button header actions), but the tab taxonomy itself follows
// the wireframe's Pipeline / Assessment / Resume / Interview Summary / SMS
// Communication split — that maps directly onto the 5 separate calls
// FRONTEND_INTEGRATION_DETAILS.md §4.4 actually documents, unlike the old
// 4-tab layout which assumed data this API doesn't have.
//
// Deliberately dropped, no real-backend equivalent (flagged, not faked):
// - Multi-job "assigned jobs" switcher — a candidate has exactly one
//   `job_opening_id`, immutable in practice; no assign-to-another-job
//   endpoint exists.
// - Previous/next-candidate navigation — `CandidateView` carries no
//   adjacent-candidate ids; would need deriving from the list screen's own
//   result order, not available here in isolation.
// - SMS Communication as a conversation thread — candidate-service can only
//   SEND email/SMS (`messaging.ts`), there is no "list prior messages"
//   endpoint on the real contract. Rendered as a compose-and-send panel
//   instead of fabricated history.
// - Round-type-specific rich evaluation panels (AI transcript, avatar/voice
//   call detail) — that's interview-service's data, not yet surfaced
//   through candidate-service.

type TabKey = 'pipeline' | 'assessment' | 'resume' | 'summary' | 'sms' | 'history';

const candidateHeaderIconCircle =
  'inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--primary)] transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 disabled:opacity-40';

const candidateDisplayName = (c?: CandidateView) =>
  `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim() || 'N/A';

const formatDateTime = (value: string | null | undefined) =>
  value && dayjs(value).isValid() ? dayjs(value).format('MMM DD, YYYY · h:mm A') : null;

const formatStatus = (status: string) =>
  status.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());

const CandidateDetails = () => {
  const navigate = useNavigate();
  const { candidateId, id: jobIdFromParams } = useParams<{
    candidateId: string;
    id: string;
  }>();
  const parsedJobId = asJobId(jobIdFromParams);

  const [activeTab, setActiveTab] = useState<TabKey>('pipeline');
  const [statusModal, setStatusModal] = useState<ChangeCandidateStatusMode | null>(null);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isSmsOpen, setIsSmsOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isResumeReviewOpen, setIsResumeReviewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<CandidateInterviewRoundView | null>(null);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [scoreModalFor, setScoreModalFor] = useState<{
    scoreId: string;
    roundName: string;
    currentScore: number | null;
    currentReason: string | null;
  } | null>(null);

  const {
    data: candidate,
    isLoading: isCandidateLoading,
    error: candidateError,
  } = useGetCandidateQuery(candidateId ?? '', { skip: !candidateId });

  const { data: jobOpeningData } = useGetJobOpeningByIdQuery(
    { jobOpeningId: parsedJobId },
    { skip: !parsedJobId }
  );

  const { data: rounds = [] } = useListCandidateInterviewRoundsQuery(candidateId ?? '', {
    skip: !candidateId,
  });
  const { data: scores = [] } = useListCandidateInterviewScoresQuery(candidateId ?? '', {
    skip: !candidateId,
  });
  const { data: notesData } = useListRecruiterNotesQuery(
    { candidateId: candidateId ?? '', limit: 1 },
    { skip: !candidateId }
  );
  const [deleteResumeReview] = useDeleteResumeReviewMutation();
  const [getResumeDownload, { isLoading: isResumeUrlLoading }] =
    useLazyGetCandidateResumeDownloadQuery();
  const [createBooking] = useCreateBookingMutation();
  const { data: selectedBooking } = useGetBookingQuery(selectedRound?.interview_booking_id ?? '', {
    skip: !selectedRound?.interview_booking_id,
  });
  const [getCalendarConnectUrl] = useLazyGetCalendarConnectUrlQuery();

  const handleBackToList = () => navigate(`/jobs/view/${parsedJobId}/candidates`);

  const handleDownloadResume = async () => {
    if (!candidateId) return;
    try {
      const res = await getResumeDownload(candidateId).unwrap();
      window.open(res.download_url, '_blank', 'noopener');
    } catch (e) {
      showToast({ message: getCandidateErrorMessage(e, 'Resume not available'), type: 'error' });
    }
  };

  const handleDeleteResumeReview = async () => {
    if (!candidateId) return;
    try {
      await deleteResumeReview(candidateId).unwrap();
      showToast({ message: 'Review removed.', type: 'success' });
    } catch (e) {
      showToast({ message: getCandidateErrorMessage(e, 'Could not remove review'), type: 'error' });
    }
  };

  const statusUpper = (candidate?.status_code ?? '').toLowerCase();
  const isTerminal = ['selected', 'rejected', 'resume_rejected', 'interview_rejected'].includes(
    statusUpper
  );

  if (candidateError) {
    return (
      <p className="p-4 text-sm text-red-500">
        {getCandidateErrorMessage(candidateError, 'Failed to load candidate.')}
      </p>
    );
  }

  return (
    <>
      {isCandidateLoading && <Loader />}
      <div className="flex flex-col mb-6 gap-2">
        <div className="flex justify-end">
          <Button
            className="p-2 cursor-pointer flex items-center justify-center hover:underline text-primary"
            onClick={handleBackToList}
            title="Back to Candidate List"
          >
            <span className="text-sm">Back to Candidate List</span>
          </Button>
        </div>

        <div className="flex-1 bg-white px-6 py-4 shadow-sm rounded-xl">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold">{candidateDisplayName(candidate)}</h2>

            <div className="flex items-center gap-3">
              <Tooltip title="Edit candidate details">
                <span className="inline-flex">
                  <button
                    type="button"
                    className={candidateHeaderIconCircle}
                    disabled={!candidate}
                    aria-label="Edit candidate"
                    onClick={() => setIsEditOpen(true)}
                  >
                    <LuPencil size={18} strokeWidth={2} aria-hidden />
                  </button>
                </span>
              </Tooltip>
              <Tooltip
                title={candidate?.email_id ? `Email ${candidate.email_id}` : 'No email on file'}
              >
                <span className="inline-flex">
                  <button
                    type="button"
                    className={candidateHeaderIconCircle}
                    disabled={!candidate?.email_id}
                    aria-label="Email candidate"
                    onClick={() => setIsEmailOpen(true)}
                  >
                    <LuMail size={18} strokeWidth={2} aria-hidden />
                  </button>
                </span>
              </Tooltip>
              <Tooltip title={candidate?.contact_no ? 'Send SMS' : 'No phone number on file'}>
                <span className="inline-flex">
                  <button
                    type="button"
                    className={candidateHeaderIconCircle}
                    disabled={!candidate?.contact_no}
                    aria-label="Send SMS"
                    onClick={() => setIsSmsOpen(true)}
                  >
                    <IoChatbubbleEllipses size={18} aria-hidden />
                  </button>
                </span>
              </Tooltip>
              <NotesPillTrigger
                count={notesData?.items.length ?? 0}
                onClick={() => setIsNotesOpen(true)}
                tooltip="Candidate notes"
              />
              <span
                className={`text-sm font-medium px-4 py-1.5 rounded-full flex items-center gap-2 ${
                  statusUpper === 'selected'
                    ? 'text-green-700'
                    : statusUpper.includes('reject')
                      ? 'text-red-700'
                      : 'text-brand-700'
                }`}
              >
                {statusUpper === 'selected' ? (
                  <LuThumbsUp size={16} />
                ) : statusUpper.includes('reject') ? (
                  <LuThumbsDown size={16} />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-brand-500 shadow-lg shadow-brand-400" />
                )}
                {candidate?.status_label || 'Applied'}
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center text-sm gap-2">
                <p className="font-bold">Job ID:</p>
                <span className="text-gray-500">
                  {jobOpeningData?.data?.jobProfileCode ?? 'N/A'}
                </span>
              </div>
              <div className="flex items-center text-sm gap-2">
                <p className="font-bold">Applied:</p>
                <span className="text-gray-500">
                  {formatDateTime(candidate?.applied_date) ?? 'N/A'}
                </span>
              </div>
              <div className="flex items-center text-sm gap-2">
                <p className="font-bold">Source:</p>
                <span className="text-gray-500">{candidate?.source ?? 'N/A'}</span>
              </div>
              <div className="flex items-center text-sm gap-2">
                <p className="font-bold">Resume Score:</p>
                <span className="text-gray-500">
                  {candidate?.resume_score === null || candidate?.resume_score === undefined
                    ? '—'
                    : candidate.resume_score}
                </span>
              </div>
            </div>

            {!isTerminal && (
              <div className="flex items-center gap-3">
                <Button
                  className="flex items-center justify-center text-sm px-6 h-[34px] gap-2 rounded-full bg-primary"
                  onClick={() => setStatusModal('advance')}
                >
                  <span className="text-white">ADVANCE</span>
                </Button>
                <Button
                  className="flex items-center justify-center text-sm px-6 h-[34px] gap-2 rounded-full border-2 border-red-600 bg-red-50 text-red-600 font-semibold hover:bg-red-100"
                  onClick={() => setStatusModal('reject')}
                >
                  <span>REJECT</span>
                </Button>
                <Button
                  className="flex items-center justify-center text-sm px-6 h-[34px] gap-2 rounded-full border-2 border-green-500 bg-green-50"
                  onClick={() => setStatusModal('select')}
                >
                  <span className="text-green-700 font-semibold">MARK SELECTED</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col bg-[#FAFAFA] rounded-2xl overflow-hidden">
        <div className="px-6">
          {!selectedRound && (
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as TabKey)}
              className="view-candidate-tabs"
              items={[
                { key: 'pipeline', label: 'Pipeline' },
                { key: 'assessment', label: 'Assessment' },
                { key: 'resume', label: 'Resume' },
                { key: 'summary', label: 'Interview Summary' },
                { key: 'sms', label: 'SMS Communication' },
                { key: 'history', label: 'Status History' },
              ]}
            />
          )}
        </div>

        <div className="p-6">
          {selectedRound ? (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                className="self-start text-sm text-primary hover:underline"
                onClick={() => setSelectedRound(null)}
              >
                ← Back to {candidateDisplayName(candidate)} Pipeline
              </button>
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedRound.round_name || 'Interview Round'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {candidateDisplayName(candidate)} · {candidate?.email_id || 'No email on file'}
                  </p>
                </div>
                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold capitalize text-primary-700">
                  {selectedBooking?.status ?? selectedRound.status}
                </span>
              </div>

              <CommonCard>
                <div className="p-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase text-gray-400">
                      Round details
                    </div>
                    <div className="mt-2 text-sm text-gray-700">
                      Sequence {selectedRound.sequence ?? '—'} ·{' '}
                      {selectedRound.duration_minutes ?? '—'} minutes
                    </div>
                    <div className="mt-2 text-sm text-gray-700">
                      {selectedRound.scheduled_at
                        ? `Scheduled ${formatDateTime(selectedRound.scheduled_at)}`
                        : 'Not scheduled yet'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase text-gray-400">
                      Submission details
                    </div>
                    <div className="mt-2 text-sm text-gray-700">
                      Name: {candidateDisplayName(candidate)}
                    </div>
                    <div className="mt-2 text-sm text-gray-700">
                      Email: {candidate?.email_id || '—'}
                    </div>
                    <div className="mt-2 text-sm text-gray-700">
                      Phone: {candidate?.contact_no || '—'}
                    </div>
                  </div>
                </div>
              </CommonCard>

              <CommonCard>
                <div className="p-5 flex flex-col gap-3">
                  <h4 className="font-semibold text-gray-900">Interview scheduling</h4>
                  {selectedRound.interview_booking_id ? (
                    <p className="text-sm text-gray-600">
                      This round has a booking. The candidate uses the booking link to choose a
                      time; audio and AI Video use available AI slots, while Panel uses the
                      connected calendar.
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Create a booking to start scheduling this round.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      className={`rounded-full px-5 py-2 text-sm font-semibold ${
                        selectedRound.interview_booking_id
                          ? 'border border-green-200 bg-green-50 text-green-700'
                          : 'bg-primary text-white'
                      }`}
                      disabled={Boolean(selectedRound.interview_booking_id) || isCreatingBooking}
                      onClick={() => {
                        if (!candidateId || !parsedJobId || !selectedRound.round_id) return;
                        setIsCreatingBooking(true);
                        const name = selectedRound.round_name?.toLowerCase() ?? '';
                        const interviewType = name.includes('panel')
                          ? 'panel'
                          : name.includes('video')
                            ? 'ai_video'
                            : 'audio_screening';
                        void createBooking({
                          body: {
                            candidate_id: candidateId,
                            job_id: parsedJobId,
                            round_id: selectedRound.round_id,
                            sequence_no: selectedRound.sequence ?? 1,
                            interview_type: interviewType,
                            interviewer_id: null,
                            immediate: false,
                          },
                        })
                          .unwrap()
                          .then((booking) => {
                            setSelectedRound({
                              ...selectedRound,
                              interview_booking_id: booking.id,
                            });
                            showToast({
                              message: 'Booking created successfully.',
                              type: 'success',
                            });
                          })
                          .catch((error) =>
                            showToast({
                              message: getCandidateErrorMessage(error, 'Could not create booking.'),
                              type: 'error',
                            })
                          )
                          .finally(() => setIsCreatingBooking(false));
                      }}
                    >
                      {isCreatingBooking
                        ? 'CREATING…'
                        : selectedRound.interview_booking_id
                          ? 'INVITATION CREATED'
                          : 'CREATE BOOKING'}
                    </Button>
                    {selectedRound.round_name?.toLowerCase().includes('panel') && (
                      <Button
                        className="rounded-full border border-primary-300 bg-white px-5 py-2 text-sm font-semibold text-primary-700"
                        onClick={() => {
                          void getCalendarConnectUrl().then(({ data }) => {
                            if (data?.connect_url) window.location.assign(data.connect_url);
                          });
                        }}
                      >
                        CONNECT CALENDAR
                      </Button>
                    )}
                  </div>
                </div>
              </CommonCard>

              {selectedRound.stage_type === 'resume' && (
                <CommonCard>
                  <div className="p-5">
                    <h4 className="font-semibold text-gray-900">Interviewer Notes</h4>
                    <p className="mt-3 text-sm text-gray-500">No notes yet at this step.</p>
                  </div>
                </CommonCard>
              )}
            </div>
          ) : activeTab === 'pipeline' && candidateId ? (
            <PipelineBoard
              rounds={rounds}
              scores={scores}
              resumeScore={candidate?.resume_score ?? null}
              candidateId={candidateId}
              onRoundClick={(round) => {
                setSelectedRound(round);
              }}
            />
          ) : null}

          {!selectedRound && activeTab === 'assessment' && (
            <CommonCard>
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold">Resume Assessment</h3>
                  <Button
                    className="rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-700"
                    onClick={() => setIsResumeReviewOpen(true)}
                  >
                    {candidate?.resume_rating ? 'EDIT REVIEW' : 'ADD REVIEW'}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      AI Score
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {candidate?.resume_score ?? '—'}
                    </div>
                    {candidate?.scoring_reason && (
                      <p className="text-sm text-gray-600 mt-1">{candidate.scoring_reason}</p>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Recruiter Review
                    </div>
                    {candidate?.resume_rating ? (
                      <>
                        <Rate disabled value={candidate.resume_rating} />
                        {candidate.resume_review_comment && (
                          <p className="text-sm text-gray-600 mt-1">
                            {candidate.resume_review_comment}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleDeleteResumeReview()}
                          className="mt-2 text-xs font-semibold text-red-500 hover:underline"
                        >
                          Remove review
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">No review yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </CommonCard>
          )}

          {!selectedRound && activeTab === 'resume' && (
            <CommonCard>
              <div className="p-5 flex flex-col items-center gap-4 text-center">
                {candidate?.resume_s3_key ? (
                  <>
                    <p className="text-sm text-gray-600">A resume is on file for this candidate.</p>
                    <Button
                      className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white"
                      onClick={() => void handleDownloadResume()}
                      disabled={isResumeUrlLoading}
                    >
                      {isResumeUrlLoading ? 'PREPARING…' : 'VIEW / DOWNLOAD RESUME'}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No resume on file yet.</p>
                )}
              </div>
            </CommonCard>
          )}

          {!selectedRound && activeTab === 'summary' && (
            <div className="flex flex-col gap-4">
              {rounds.length === 0 ? (
                <p className="text-sm text-gray-500">No interview rounds recorded yet.</p>
              ) : (
                <>
                  <CommonCard>
                    <div className="p-5">
                      <h3 className="text-sm font-semibold text-gray-900">Scores across rounds</h3>
                      <div className="mt-4 h-28 rounded-lg bg-gradient-to-b from-primary-50 to-white px-2 pt-2">
                        <div className="flex h-full items-start gap-2 border-b border-gray-100">
                          {rounds.map((round, index) => {
                            // `CandidateInterviewScoreView` carries no round
                            // name/id of its own — resolve it via
                            // `candidate_interview_round_id` against the
                            // LOCAL round row's `id` (not `.round_id`,
                            // job-service's id — see interviewRounds.ts's
                            // note on that mix-up).
                            const score = scores.find(
                              (item) => item.candidate_interview_round_id === round.id
                            );
                            const value = score?.recruiter_score ?? score?.score;
                            return (
                              <div
                                key={round.id ?? `score-${index}`}
                                className="flex h-full flex-1 flex-col items-center justify-between"
                              >
                                <span
                                  className="mt-auto mb-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-white"
                                  title={value == null ? 'No score recorded' : `${value} / 5`}
                                />
                                <span className="h-0.5 w-full bg-primary/20" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2 text-[10px] text-gray-400">
                        {rounds.map((round, index) => (
                          <span
                            key={round.id ?? `label-${index}`}
                            className="min-w-0 flex-1 truncate text-center"
                          >
                            {round.round_name || 'Round'}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CommonCard>

                  <CommonCard>
                    <div className="overflow-x-auto p-4">
                      <table className="w-full min-w-[620px] text-left text-sm">
                        <thead className="border-b border-gray-200 text-[10px] font-semibold uppercase text-gray-500">
                          <tr>
                            <th className="px-2 py-3">Round</th>
                            <th className="px-2 py-3">Interviewer</th>
                            <th className="px-2 py-3">Score</th>
                            <th className="px-2 py-3">Recommendation</th>
                            <th className="px-2 py-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {rounds.map((round, index) => {
                            const score = scores.find(
                              (item) => item.candidate_interview_round_id === round.id
                            );
                            const roundName = round.round_name || 'Interview Round';
                            const finalScore = score?.recruiter_score ?? score?.score;
                            return (
                              <tr
                                key={round.id ?? `summary-${index}`}
                                className="border-b border-gray-100 last:border-0"
                              >
                                <td className="px-2 py-3 font-medium text-gray-800">{roundName}</td>
                                <td className="px-2 py-3 text-gray-500">
                                  {score?.recruiter_scored_by ?? 'Not assigned'}
                                </td>
                                <td className="px-2 py-3 text-gray-700">
                                  {finalScore == null
                                    ? formatStatus(round.status)
                                    : `${finalScore} / 5`}
                                </td>
                                <td className="px-2 py-3">
                                  {score ? (
                                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                                      {score.recruiter_score != null ? 'Reviewed' : 'Scored'}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="px-2 py-3">
                                  {score && (
                                    <Button
                                      className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700"
                                      onClick={() =>
                                        setScoreModalFor({
                                          scoreId: score.id,
                                          roundName,
                                          currentScore: score.recruiter_score,
                                          currentReason: score.recruiter_score_reason,
                                        })
                                      }
                                    >
                                      {score.recruiter_score ? 'EDIT' : 'SCORE'}
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CommonCard>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <CommonCard>
                      <div className="p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-900">Interviewer Notes</h3>
                          <Button
                            className="rounded-full border border-primary-200 bg-white px-3 py-1 text-xs font-semibold text-primary-700"
                            onClick={() => setIsNotesOpen(true)}
                          >
                            + Add Note
                          </Button>
                        </div>
                        {notesData?.items[0] ? (
                          <p className="mt-4 border-l-2 border-primary px-3 text-sm text-gray-600">
                            {notesData.items[0].note}
                          </p>
                        ) : (
                          <p className="mt-4 text-sm text-gray-500">No notes yet at this step.</p>
                        )}
                      </div>
                    </CommonCard>
                    <CommonCard>
                      <div className="p-5">
                        <h3 className="text-sm font-semibold text-gray-900">AI Summary</h3>
                        <p className="mt-4 text-sm leading-6 text-gray-600">
                          {scores.length > 0
                            ? `${scores.length} interview score${scores.length === 1 ? '' : 's'} recorded across ${rounds.length} round${rounds.length === 1 ? '' : 's'}. Review the round details and scores above.`
                            : 'AI summary will appear after an interview produces a score or transcript.'}
                        </p>
                      </div>
                    </CommonCard>
                  </div>
                </>
              )}
            </div>
          )}

          {!selectedRound && activeTab === 'sms' && (
            <CommonCard>
              <div className="p-5 flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-gray-500 max-w-md">
                  Message history isn&apos;t available yet — this sends a new SMS, it doesn&apos;t
                  show a conversation thread.
                </p>
                <Button
                  className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  onClick={() => setIsSmsOpen(true)}
                  disabled={!candidate?.contact_no}
                >
                  <LuSquarePen size={14} className="inline mr-2" />
                  SEND SMS
                </Button>
              </div>
            </CommonCard>
          )}

          {activeTab === 'history' && candidateId && <StatusHistoryTab candidateId={candidateId} />}
        </div>
      </div>

      {statusModal && candidate && (
        <ChangeCandidateStatusModal
          open={!!statusModal}
          onClose={() => setStatusModal(null)}
          mode={statusModal}
          candidates={[candidate]}
          onSuccess={() => setStatusModal(null)}
        />
      )}
      {candidate && (
        <>
          <BulkEmailCandidatesModal
            open={isEmailOpen}
            onClose={() => setIsEmailOpen(false)}
            candidates={[candidate]}
          />
          <BulkSendSmsModal
            open={isSmsOpen}
            onClose={() => setIsSmsOpen(false)}
            candidates={[candidate]}
          />
          <EditCandidateModal
            open={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            candidate={candidate}
          />
        </>
      )}
      <CandidateRecruiterNotesPanel
        open={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        title={`Candidate Notes - ${candidateDisplayName(candidate)}`}
        candidateId={candidateId}
      />
      {candidateId && (
        <ResumeReviewModal
          open={isResumeReviewOpen}
          onClose={() => setIsResumeReviewOpen(false)}
          candidateId={candidateId}
          currentRating={candidate?.resume_rating ?? null}
          currentComment={candidate?.resume_review_comment ?? null}
        />
      )}
      {scoreModalFor && candidateId && (
        <RecruiterRoundScoreModal
          open={!!scoreModalFor}
          onClose={() => setScoreModalFor(null)}
          candidateId={candidateId}
          scoreId={scoreModalFor.scoreId}
          roundName={scoreModalFor.roundName}
          currentScore={scoreModalFor.currentScore}
          currentReason={scoreModalFor.currentReason}
        />
      )}
    </>
  );
};

export default CandidateDetails;
