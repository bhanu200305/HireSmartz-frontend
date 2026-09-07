import dayjs from 'dayjs';
import { IoStar, IoStarOutline } from 'react-icons/io5';
import { Badge, type BadgeStatus } from '../../../shared';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { Loader } from '../../../shared/ui/loader';
import { CommonCard } from '../../../shared';
import {
  useListCandidateInterviewRoundArtifactsQuery,
  type CandidateInterviewRoundView,
} from '../../../../api/candidate-service/Candidates/interviewRounds';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';

// New — `GET /candidates/{id}/interview-rounds/{round_id}/artifacts`
// (recordings/transcripts interview-service produced for a round). The
// `{round_id}` path segment is this LOCAL round row's own `id`
// (`CandidateInterviewRoundView.id`), NOT job-service's `round_id` —
// `ListInterviewRoundArtifactsUseCase` does a primary-key lookup on it, so
// the caller here must always pass `round.id`.
//
// `url` is short-lived and `null` while `status === "reserved"` (recording
// not encoded yet) — FRONTEND_INTEGRATION_DETAILS.md §7 says to refetch the
// list rather than cache it, so this deliberately doesn't remember a url
// past one open of the modal (closing and reopening always refetches).

const artifactStatusBadge = (status: string): BadgeStatus => {
  const key = status.trim().toLowerCase();
  if (key === 'ready' || key === 'available' || key === 'completed') return 'success';
  if (key === 'reserved' || key === 'processing' || key === 'pending') return 'warning';
  if (key === 'failed' || key === 'error') return 'danger';
  return 'neutral';
};

const artifactKindLabel = (kind: string) =>
  kind
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Artifact';

type RoundArtifactsModalProps = {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  /** Must be the LOCAL round row's `id`, not job-service's `round_id`. */
  roundId: string;
  roundName: string;
  /** The candidate's own post-round rating/text, reported by
   * interview-service — already on the round object the caller has in
   * hand, so it's passed straight through rather than refetched. */
  feedback: Pick<
    CandidateInterviewRoundView,
    'candidate_feedback_rating' | 'candidate_feedback_text' | 'candidate_feedback_submitted_at'
  >;
};

const RoundArtifactsModal = ({
  open,
  onClose,
  candidateId,
  roundId,
  roundName,
  feedback,
}: RoundArtifactsModalProps) => {
  const { data, isLoading, error } = useListCandidateInterviewRoundArtifactsQuery(
    { candidateId, roundId },
    { skip: !open }
  );

  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title="Round Recordings"
      subtitle={roundName}
      modalProps={{ width: 520 }}
    >
      {feedback.candidate_feedback_submitted_at && (
        <CommonCard className="mb-4">
          <div className="flex flex-col gap-1.5 p-4">
            <div className="text-xs font-semibold text-neutral-500">Candidate feedback</div>
            {feedback.candidate_feedback_rating !== null && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) =>
                  i < (feedback.candidate_feedback_rating ?? 0) ? (
                    <IoStar key={i} className="text-warning" size={16} />
                  ) : (
                    <IoStarOutline key={i} className="text-neutral-300" size={16} />
                  )
                )}
              </div>
            )}
            {feedback.candidate_feedback_text && (
              <p className="text-sm text-neutral-700">{feedback.candidate_feedback_text}</p>
            )}
            <span className="text-xs text-neutral-400">
              Submitted {dayjs(feedback.candidate_feedback_submitted_at).format('MMM D, h:mm A')}
            </span>
          </div>
        </CommonCard>
      )}

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">
          {getCandidateErrorMessage(error, 'Failed to load recordings.')}
        </p>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-gray-500">No recordings or transcripts for this round yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((artifact) => (
            <CommonCard key={artifact.id}>
              <div className="flex items-center justify-between gap-4 p-4">
                <div>
                  <div className="text-sm font-semibold">{artifactKindLabel(artifact.kind)}</div>
                  <div className="mt-1">
                    <Badge status={artifactStatusBadge(artifact.status)}>{artifact.status}</Badge>
                  </div>
                </div>
                {artifact.url ? (
                  <a
                    href={artifact.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                  >
                    VIEW
                  </a>
                ) : (
                  <span className="shrink-0 text-xs text-gray-400">Not ready yet</span>
                )}
              </div>
            </CommonCard>
          ))}
        </div>
      )}
    </AntdCommonModal>
  );
};

export default RoundArtifactsModal;
