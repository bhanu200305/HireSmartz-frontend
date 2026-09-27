import { useEffect, useMemo, useState } from 'react';
import { Tabs } from 'antd';
import dayjs from 'dayjs';
import { IoStar, IoStarOutline, IoOpenOutline } from 'react-icons/io5';
import { Badge, InfoHint, type BadgeStatus } from '../../../shared';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { Loader } from '../../../shared/ui/loader';
import { CommonCard } from '../../../shared';
import {
  useListCandidateInterviewRoundArtifactsQuery,
  type CandidateInterviewRoundArtifactView,
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
//
// PLAYED INLINE, NOT LINKED OUT TO A NEW TAB — added 2026-09-11. A
// recording/transcript used to be a bare "VIEW" link opening
// `artifact.url` in a new browser tab; a recruiter working through a
// candidate's pipeline lost their place every time. The two real kinds
// today (interview-service's `ArtifactKind`: `"recording"` — audio/wav for
// an AUDIO/AUDIO_SCREENING round, video/mp4 for an AI_VIDEO/PANEL one —
// and `"transcript"` — always `text/plain`) get a real inline player/text
// panel below; a kind neither of those (scorecard/summary/feedback,
// "expected" per `CandidateInterviewRoundArtifact`'s own docstring but not
// live yet) falls back to the original open-in-new-tab link, since there's
// nothing to render inline for a format this modal doesn't know yet.

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

/** `1:05` for anything under an hour, `1:01:05` past that — never bare
 * seconds alone, which reads ambiguously past ~99. */
const formatDuration = (totalSeconds: number): string => {
  const whole = Math.round(totalSeconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = whole % 60;
  const paddedSeconds = String(seconds).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`
    : `${minutes}:${paddedSeconds}`;
};

/**
 * Groups a round's artifacts (recordings/transcripts) into one tab per
 * reattempt — "Attempt 1", "Attempt 2", etc. — oldest first.
 *
 * Prefers `booking_id` (which attempt actually produced this artifact) once
 * candidate-service sends it — see this file's own artifact-view import and
 * the TODO on `CandidateInterviewRoundArtifactView.booking_id`. Until then,
 * falls back to clustering by `produced_at`: a single attempt's recording
 * and transcript land within the same call, seconds to a few minutes apart,
 * while a reattempt happens a whole separate booking later — so a 30-minute
 * gap between consecutive artifacts (sorted oldest first) is treated as an
 * attempt boundary. Not-yet-produced rows (`produced_at: null`, still
 * "reserved") have no timestamp to sort by, so they're assumed to belong to
 * the most recent attempt and appended to the last group.
 */
const GROUP_GAP_THRESHOLD_MS = 30 * 60 * 1000;

const groupArtifactsByAttempt = (
  artifacts: CandidateInterviewRoundArtifactView[]
): CandidateInterviewRoundArtifactView[][] => {
  if (artifacts.length === 0) return [];

  if (artifacts.some((a) => a.booking_id)) {
    const byBooking = new Map<string, CandidateInterviewRoundArtifactView[]>();
    const noBooking: CandidateInterviewRoundArtifactView[] = [];
    for (const artifact of artifacts) {
      if (!artifact.booking_id) {
        noBooking.push(artifact);
        continue;
      }
      const group = byBooking.get(artifact.booking_id) ?? [];
      group.push(artifact);
      byBooking.set(artifact.booking_id, group);
    }
    const earliestOf = (group: CandidateInterviewRoundArtifactView[]) =>
      Math.min(...group.map((a) => (a.produced_at ? dayjs(a.produced_at).valueOf() : Infinity)));
    const groups = [...byBooking.values()].sort((a, b) => earliestOf(a) - earliestOf(b));
    // Legacy rows recorded before candidate-service sent `booking_id` — no
    // attempt to attribute them to, so they trail as their own group rather
    // than being silently dropped.
    if (noBooking.length > 0) groups.push(noBooking);
    return groups;
  }

  const sorted = [...artifacts].sort((a, b) => {
    if (!a.produced_at) return 1;
    if (!b.produced_at) return -1;
    return dayjs(a.produced_at).valueOf() - dayjs(b.produced_at).valueOf();
  });

  const groups: CandidateInterviewRoundArtifactView[][] = [];
  for (const artifact of sorted) {
    const lastGroup = groups[groups.length - 1];
    const lastArtifact = lastGroup?.[lastGroup.length - 1];
    const gapMs =
      artifact.produced_at && lastArtifact?.produced_at
        ? dayjs(artifact.produced_at).valueOf() - dayjs(lastArtifact.produced_at).valueOf()
        : 0;
    if (lastGroup && (!artifact.produced_at || gapMs <= GROUP_GAP_THRESHOLD_MS)) {
      lastGroup.push(artifact);
    } else {
      groups.push([artifact]);
    }
  }
  return groups;
};

/** Small "open in a new tab" affordance sat next to an inline preview — the
 * escape hatch for someone who actually wants the raw file (to download it,
 * share the link, etc.), never the primary way to view it anymore. */
const OpenInNewTabLink = ({ url, label }: { url: string; label: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    title={label}
    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
  >
    <IoOpenOutline size={15} />
  </a>
);

/** The recording artifact, played right in the modal. `isVideo` picks the
 * element — a video round (AI_VIDEO/PANEL) gets a real video frame, an
 * audio round (AUDIO/AUDIO_SCREENING, or a round type this modal doesn't
 * know) gets a compact audio bar instead of an oversized blank video box.
 *
 * `preload="metadata"` (already needed so the native player shows a
 * scrubbable duration without downloading the whole file) also lets this
 * read `duration` off the element itself the moment it loads — surfaced
 * both as a `title` (hovering the player shows it, the ask this was built
 * for) and as a small always-visible label underneath, since a tooltip
 * alone is easy to miss and duration is exactly the kind of thing you want
 * to see before pressing play, not after hovering long enough to notice
 * one exists. */
const RecordingPlayer = ({ url, isVideo }: { url: string; isVideo: boolean }) => {
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);

  const handleLoadedMetadata = (event: React.SyntheticEvent<HTMLMediaElement>) => {
    const { duration } = event.currentTarget;
    if (Number.isFinite(duration)) setDurationSeconds(duration);
  };

  const durationLabel = durationSeconds != null ? formatDuration(durationSeconds) : null;
  const hoverTitle =
    durationSeconds != null
      ? `Duration: ${durationLabel} (${Math.round(durationSeconds)} seconds)`
      : undefined;

  return (
    <div className="flex flex-col gap-1">
      {isVideo ? (
        <div className="overflow-hidden rounded-xl bg-neutral-900">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- no caption track exists to attach; interview-service produces the recording alone. */}
          <video
            controls
            preload="metadata"
            title={hoverTitle}
            onLoadedMetadata={handleLoadedMetadata}
            className="aspect-video w-full"
          >
            <source src={url} />
          </video>
        </div>
      ) : (
        // eslint-disable-next-line jsx-a11y/media-has-caption -- audio-only call recording, nothing to caption.
        <audio
          controls
          preload="metadata"
          title={hoverTitle}
          onLoadedMetadata={handleLoadedMetadata}
          className="w-full"
        >
          <source src={url} />
        </audio>
      )}
      {durationLabel && (
        <span className="text-xs text-neutral-400" title={hoverTitle}>
          Duration: {durationLabel}
        </span>
      )}
    </div>
  );
};

/** The transcript artifact — fetched and shown as real, styled text instead
 * of a link, since `text/plain` is all it ever is (see this file's own
 * module comment). Falls back to embedding the file directly (still
 * in-modal, never a new tab) if the fetch itself fails — a CORS-blocked
 * storage bucket or a network hiccup, not something worth losing the inline
 * experience over. */
const TranscriptViewer = ({ url }: { url: string }) => {
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'text'; text: string } | { status: 'fallback' }
  >({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`transcript fetch failed: ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setState({ status: 'text', text });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'fallback' });
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (state.status === 'loading') {
    return (
      <div className="flex items-center justify-center rounded-xl border border-neutral-100 bg-neutral-50 py-8">
        <Loader />
      </div>
    );
  }

  if (state.status === 'fallback') {
    // A plain-text response renders as-is inside an iframe regardless of
    // CORS — that restriction only applies to script-driven `fetch`, not a
    // browsing-context navigation, so this still shows inline.
    return (
      <iframe
        src={url}
        title="Interview transcript"
        className="h-64 w-full rounded-xl border border-neutral-200 bg-white"
      />
    );
  }

  return (
    <div className="max-h-64 overflow-y-auto rounded-xl border border-neutral-100 bg-neutral-50 p-4">
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">{state.text}</p>
    </div>
  );
};

type RoundArtifactsModalProps = {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  /** Must be the LOCAL round row's `id`, not job-service's `round_id`. */
  roundId: string;
  roundName: string;
  /** `CandidateInterviewRoundView.round_type` — decides whether the
   * recording plays as video or audio. Null (resume stage, or an
   * unclassifiable round type) falls back to the audio player. */
  roundType: string | null;
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
  roundType,
  feedback,
}: RoundArtifactsModalProps) => {
  const { data, isLoading, error } = useListCandidateInterviewRoundArtifactsQuery(
    { candidateId, roundId },
    { skip: !open }
  );
  const isVideoRound = roundType === 'AI_VIDEO' || roundType === 'PANEL';
  const attemptGroups = useMemo(() => groupArtifactsByAttempt(data ?? []), [data]);

  const renderArtifactBody = (artifact: CandidateInterviewRoundArtifactView) => {
    if (!artifact.url) {
      return <span className="shrink-0 text-xs text-gray-400">Not ready yet</span>;
    }
    if (artifact.kind === 'recording') {
      return (
        <div className="flex flex-col gap-1.5">
          <RecordingPlayer url={artifact.url} isVideo={isVideoRound} />
          <div className="flex justify-end">
            <InfoHint content="Wear earphones for the best quality" />
          </div>
        </div>
      );
    }
    if (artifact.kind === 'transcript') {
      return <TranscriptViewer url={artifact.url} />;
    }
    // An artifact kind this modal doesn't know how to render inline yet
    // (scorecard/summary/feedback) — same open-in-new-tab link this whole
    // modal used to be, kept only as a fallback for the unknown case.
    return (
      <a
        href={artifact.url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100"
      >
        VIEW
      </a>
    );
  };

  const renderArtifactList = (artifacts: CandidateInterviewRoundArtifactView[]) => (
    <div className="flex flex-col gap-4">
      {artifacts.map((artifact) => (
        <CommonCard key={artifact.id}>
          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{artifactKindLabel(artifact.kind)}</span>
                <Badge status={artifactStatusBadge(artifact.status)}>{artifact.status}</Badge>
              </div>
              {artifact.url &&
                (artifact.kind === 'recording' || artifact.kind === 'transcript') && (
                  <OpenInNewTabLink
                    url={artifact.url}
                    label={`Open ${artifactKindLabel(artifact.kind).toLowerCase()} in a new tab`}
                  />
                )}
            </div>
            {renderArtifactBody(artifact)}
          </div>
        </CommonCard>
      ))}
    </div>
  );

  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title="Round Recordings"
      subtitle={roundName}
      modalProps={{
        width: 640,
        maskClosable: true,
        // No hardcoded vh cap — index.css already caps every antd Modal's
        // `.ant-modal-content` at the real gap between the app header/footer
        // and scrolls `.modal-content` inside it; a per-modal vh guess on
        // top of that budget is a second, independent limit that can
        // disagree with it and silently clip content (see the comment on
        // `.ant-modal-body .modal-content` in index.css).
      }}
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
        <Tabs
          tabPosition="top"
          // Pinned to the top of the modal's own scroll container (see
          // `.round-artifacts-tabs` in index.css) — this modal's content
          // (recordings, transcripts) runs well past one screen, and without
          // this the Attempt 1/Attempt 2 strip scrolls away with everything
          // else, forcing a scroll back to the top just to switch attempts.
          className="round-artifacts-tabs"
          items={attemptGroups.map((group, index) => ({
            key: String(index),
            label: `Attempt ${index + 1}`,
            children: renderArtifactList(group),
          }))}
        />
      )}
    </AntdCommonModal>
  );
};

export default RoundArtifactsModal;
