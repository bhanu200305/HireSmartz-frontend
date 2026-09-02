import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Rate, Tabs, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { LuMail, LuSquarePen, LuThumbsDown, LuThumbsUp } from 'react-icons/lu';
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

type TabKey = 'pipeline' | 'assessment' | 'resume' | 'summary' | 'sms';

const candidateHeaderIconCircle =
  'inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--primary)] transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 disabled:opacity-40';

const candidateDisplayName = (c?: CandidateView) =>
  `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim() || 'N/A';

const formatDateTime = (value: string | null | undefined) =>
  value && dayjs(value).isValid() ? dayjs(value).format('MMM DD, YYYY · h:mm A') : null;

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
            ]}
          />
        </div>

        <div className="p-6">
          {activeTab === 'pipeline' && (
            <PipelineBoard
              rounds={rounds}
              scores={scores}
              resumeScore={candidate?.resume_score ?? null}
            />
          )}

          {activeTab === 'assessment' && (
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

          {activeTab === 'resume' && (
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

          {activeTab === 'summary' && (
            <div className="flex flex-col gap-3">
              {scores.length === 0 ? (
                <p className="text-sm text-gray-500">No interview scores recorded yet.</p>
              ) : (
                scores.map((score) => {
                  const round = rounds.find((r) => r.round_id === score.round_id);
                  const roundName = score.round_name || round?.round_name || 'Round';
                  return (
                    <CommonCard key={score.score_id}>
                      <div className="p-4 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold text-sm">{roundName}</div>
                          {score.ai_score_reason && (
                            <p className="text-xs text-gray-500 mt-1">{score.ai_score_reason}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-[10px] font-semibold text-gray-400 uppercase">
                              AI
                            </div>
                            <div className="font-bold text-primary">{score.ai_score ?? '—'}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] font-semibold text-gray-400 uppercase">
                              Recruiter
                            </div>
                            <div className="font-bold text-green-700">
                              {score.recruiter_score ?? '—'}
                            </div>
                          </div>
                          <Button
                            className="rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-700"
                            onClick={() =>
                              setScoreModalFor({
                                scoreId: score.score_id,
                                roundName,
                                currentScore: score.recruiter_score,
                                currentReason: score.recruiter_score_reason,
                              })
                            }
                          >
                            {score.recruiter_score ? 'EDIT' : 'SCORE'}
                          </Button>
                        </div>
                      </div>
                    </CommonCard>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'sms' && (
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
