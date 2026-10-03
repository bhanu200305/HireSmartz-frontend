import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Spin, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { FaRobot } from 'react-icons/fa';
import { FaRegUser } from 'react-icons/fa6';
import { IoStar, IoStarOutline } from 'react-icons/io5';
import { LuMaximize2 } from 'react-icons/lu';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';
import { Loader } from '../../shared/ui/loader';
import {
  useListCandidateInterviewRoundArtifactsQuery,
  type CandidateInterviewRoundArtifactView,
  type CandidateInterviewRoundView,
} from '../../../api/candidate-service/Candidates/interviewRounds';
import { getCandidateErrorMessage } from '../../../shared/utils/auth/candidateError.helpers';

// A round's recording and transcript, shown INLINE in the round's own
// collapsible cards ("Interview Recording" / "Transcripts"), laid out like
// the old app (careerforcepro-web InterviewRecording.tsx / Transcript.tsx):
// a plain full-width player, and the transcript as chat bubbles —
// interviewer/AI on the left, candidate on the right. Replaced the
// RoundArtifactsModal popup on 2026-10-03.
//
// Source: `GET /candidates/{id}/interview-rounds/{round_id}/artifacts`
// (recordings/transcripts interview-service produced for a round). The
// `{round_id}` path segment is this LOCAL round row's own `id`
// (`CandidateInterviewRoundView.id`), NOT job-service's `round_id` —
// `ListInterviewRoundArtifactsUseCase` does a primary-key lookup on it.
//
// `url` is short-lived and `null` while `status === "reserved"` (recording
// not encoded yet). Both cards share one cached list (same query args), so
// opening the second card never swaps the first card's url mid-playback;
// the cards are `lazy`, so nothing downloads until one is opened.
//
// Kinds (interview-service's `ArtifactKind`): `"recording"` — audio/wav for
// an AUDIO/AUDIO_SCREENING round, video/mp4 for an AI_VIDEO/PANEL one — and
// `"transcript"`, always `text/plain`. Transcript text comes in two shapes:
// role-labeled lines ("Interviewer: …" / "Candidate: …", Vapi audio calls)
// rendered as bubbles, or unlabeled plain text (AWS Transcribe, AI video)
// rendered as paragraphs since there are no speakers to split it by.

/**
 * Groups a round's artifacts into one entry per reattempt, oldest first.
 *
 * Prefers `booking_id` (which attempt produced the artifact). Without it,
 * clusters by `produced_at`: one attempt's recording and transcript land
 * minutes apart, a reattempt a whole booking later — so a 30-minute gap is
 * an attempt boundary. Not-yet-produced rows (`produced_at: null`) belong to
 * the most recent attempt.
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
    // Legacy rows from before `booking_id` existed trail as their own group.
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

/** The round's artifacts for one kind, per attempt, with an attempt picker
 * (latest attempt selected by default). */
const useRoundArtifactsOfKind = (candidateId: string, roundId: string, kind: string) => {
  const { data, isLoading, error } = useListCandidateInterviewRoundArtifactsQuery({
    candidateId,
    roundId,
  });
  const attempts = useMemo(() => groupArtifactsByAttempt(data ?? []), [data]);
  const [picked, setPicked] = useState<number | null>(null);
  const attemptIndex = picked ?? attempts.length - 1;
  const artifact = attempts[attemptIndex]?.find((a) => a.kind === kind);
  return { attempts, attemptIndex, setAttempt: setPicked, artifact, isLoading, error };
};

const AttemptPicker = ({
  count,
  value,
  onChange,
}: {
  count: number;
  value: number;
  onChange: (index: number) => void;
}) =>
  count > 1 ? (
    <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Attempt">
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          type="button"
          aria-pressed={index === value}
          onClick={() => onChange(index)}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
            index === value
              ? 'border-primary bg-primary text-white'
              : 'border-gray-300 bg-white text-gray-600 hover:border-primary hover:bg-primary hover:text-white'
          }`}
        >
          Attempt {index + 1}
        </button>
      ))}
    </div>
  ) : null;

/** Empty / processing state for both cards — same plain line the cards
 * show before the round is booked. */
const EmptyBox = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-gray-600">{children}</p>
);

const ArtifactsStatus = ({ isLoading, error }: { isLoading: boolean; error: unknown }) =>
  isLoading ? (
    <div className="flex justify-center py-6">
      <Loader />
    </div>
  ) : error ? (
    <p className="text-sm text-red-500">
      {getCandidateErrorMessage(error, 'Failed to load this round’s recordings.')}
    </p>
  ) : null;

// ── Recording ──────────────────────────────────────────────────────────

type RoundRecordingProps = {
  candidateId: string;
  /** Must be the LOCAL round row's `id`, not job-service's `round_id`. */
  roundId: string;
  /** AI_VIDEO / PANEL play as video; anything else as audio. */
  roundType: string | null;
};

export const RoundRecording = ({ candidateId, roundId, roundType }: RoundRecordingProps) => {
  const { attempts, attemptIndex, setAttempt, artifact, isLoading, error } =
    useRoundArtifactsOfKind(candidateId, roundId, 'recording');
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const url = artifact?.url ?? null;
  const isVideo = roundType === 'AI_VIDEO' || roundType === 'PANEL';

  useEffect(() => {
    setIsMediaLoading(true);
  }, [url]);

  if (isLoading || error) return <ArtifactsStatus isLoading={isLoading} error={error} />;

  const doneLoading = () => setIsMediaLoading(false);

  return (
    <div>
      <AttemptPicker count={attempts.length} value={attemptIndex} onChange={setAttempt} />
      {!artifact ? (
        <EmptyBox>Not available</EmptyBox>
      ) : !url ? (
        <EmptyBox>The recording is still processing</EmptyBox>
      ) : (
        <div>
          {isMediaLoading && <Spin size="small" />}
          {isVideo ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption -- no caption track exists; interview-service produces the recording alone.
            <video
              key={url}
              className="w-full max-w-[820px] rounded-lg"
              controls
              preload="metadata"
              onLoadedData={doneLoading}
              onCanPlay={doneLoading}
              onError={doneLoading}
            >
              <source src={url} />
            </video>
          ) : (
            // eslint-disable-next-line jsx-a11y/media-has-caption -- audio-only call recording, nothing to caption.
            <audio
              key={url}
              className="w-full"
              controls
              preload="metadata"
              onLoadedData={doneLoading}
              onCanPlay={doneLoading}
              onError={doneLoading}
            >
              <source src={url} />
            </audio>
          )}
        </div>
      )}
    </div>
  );
};

// ── Transcript ─────────────────────────────────────────────────────────

type TranscriptMessage = {
  id: number;
  speakerLabel: string;
  text: string;
  isCandidate: boolean;
  isBot: boolean;
};

const SPEAKER_LINE = /^([^:\n\r]{1,40}):\s*(.*)$/;
const CANDIDATE_SPEAKER = /\b(candidate|user|usuario|customer)\b/i;
const BOT_SPEAKER = /^(ai|bot|assistant)$/i;

/** Role-labeled transcript → bubbles (consecutive lines from the same
 * speaker merged, unlabeled lines continue the previous message). `null`
 * when no line carries a speaker label — plain text, nothing to split. */
const parseTranscript = (rawText: string): TranscriptMessage[] | null => {
  const messages: TranscriptMessage[] = [];
  let sawSpeaker = false;

  for (const rawLine of rawText.split(/\r?\n|\\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(SPEAKER_LINE);
    const previous = messages[messages.length - 1];

    if (!match) {
      if (previous) previous.text = `${previous.text}\n${line}`;
      else
        messages.push({
          id: 0,
          speakerLabel: '',
          text: line,
          isCandidate: false,
          isBot: false,
        });
      continue;
    }

    sawSpeaker = true;
    const speaker = match[1].trim();
    const text = match[2].trim();
    if (!text) continue;
    const isCandidate = CANDIDATE_SPEAKER.test(speaker);
    const isBot = !isCandidate && BOT_SPEAKER.test(speaker);
    const speakerLabel = isCandidate ? 'Candidate' : isBot ? 'AI Interviewer' : speaker;

    if (previous && previous.speakerLabel === speakerLabel) {
      previous.text = `${previous.text}\n${text}`;
    } else {
      messages.push({ id: messages.length, speakerLabel, text, isCandidate, isBot });
    }
  }

  return sawSpeaker ? messages : null;
};

const bubbleClass =
  'max-w-xl whitespace-pre-line rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-800 shadow';

const TranscriptBody = ({ text }: { text: string }) => {
  const messages = useMemo(() => parseTranscript(text), [text]);

  if (!text.trim()) return <p className="text-sm text-gray-600">Not available</p>;

  if (!messages) {
    return <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{text}</p>;
  }

  return (
    <div className="space-y-4">
      {messages.map((message) =>
        message.isCandidate ? (
          <div key={message.id} className="flex items-start justify-end gap-3">
            <div className={bubbleClass}>
              <p className="mb-1 font-semibold text-gray-600">{message.speakerLabel}</p>
              {message.text}
            </div>
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-300">
              <FaRegUser size={16} title="Candidate" />
            </div>
          </div>
        ) : (
          <div key={message.id} className="flex items-start gap-3">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
              {message.isBot ? (
                <FaRobot size={18} title="AI Interviewer" />
              ) : (
                <FaRegUser size={16} title="Interviewer" />
              )}
            </div>
            <div className={bubbleClass}>
              {message.speakerLabel && (
                <p className="mb-1 font-semibold text-gray-600">{message.speakerLabel}</p>
              )}
              {message.text}
            </div>
          </div>
        )
      )}
    </div>
  );
};

/** Fetches the transcript text once and shows it in a height-capped box
 * with its own scrollbar (the page doesn't scroll with it), plus an expand
 * icon in the bottom-right corner opening the same text in a large popup.
 * Falls back to embedding the file if the fetch fails (CORS / network) —
 * an iframe navigation isn't subject to CORS, so it still shows inline. */
const TranscriptViewer = ({ url, roundName }: { url: string; roundName: string }) => {
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'text'; text: string } | { status: 'fallback' }
  >({ status: 'loading' });
  const [isExpanded, setIsExpanded] = useState(false);

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
      <div className="flex items-center justify-center py-8">
        <Loader />
      </div>
    );
  }

  const content = (heightClass: string) =>
    state.status === 'text' ? (
      <TranscriptBody text={state.text} />
    ) : (
      <iframe
        src={url}
        title="Interview transcript"
        className={`${heightClass} w-full rounded-lg border border-gray-200 bg-white`}
      />
    );

  return (
    <>
      <div className="relative">
        <div className="max-h-[420px] overflow-y-auto overscroll-contain rounded-lg bg-gray-50 p-4 pb-12">
          {content('h-[380px]')}
        </div>
        <Tooltip title="Expand transcript">
          <button
            type="button"
            aria-label="Expand transcript"
            onClick={() => setIsExpanded(true)}
            className="absolute bottom-3 right-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--primary)] shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 cursor-pointer"
          >
            <LuMaximize2 size={16} aria-hidden />
          </button>
        </Tooltip>
      </div>
      <AntdCommonModal
        open={isExpanded}
        onClose={() => setIsExpanded(false)}
        title="Transcript"
        subtitle={roundName}
        modalProps={{ width: 960, maskClosable: true }}
      >
        {content('h-[70vh]')}
      </AntdCommonModal>
    </>
  );
};

type RoundTranscriptProps = RoundRecordingProps & {
  /** Shown as the expanded popup's subtitle. */
  roundName: string;
};

export const RoundTranscript = ({ candidateId, roundId, roundName }: RoundTranscriptProps) => {
  const { attempts, attemptIndex, setAttempt, artifact, isLoading, error } =
    useRoundArtifactsOfKind(candidateId, roundId, 'transcript');

  if (isLoading || error) return <ArtifactsStatus isLoading={isLoading} error={error} />;

  return (
    <div>
      <AttemptPicker count={attempts.length} value={attemptIndex} onChange={setAttempt} />
      {!artifact ? (
        <EmptyBox>Not available</EmptyBox>
      ) : !artifact.url ? (
        <EmptyBox>The transcript is still processing</EmptyBox>
      ) : (
        <TranscriptViewer url={artifact.url} roundName={roundName} />
      )}
    </div>
  );
};

// ── Candidate's own feedback ───────────────────────────────────────────

type RoundCandidateFeedbackProps = {
  feedback: Pick<
    CandidateInterviewRoundView,
    'candidate_feedback_rating' | 'candidate_feedback_text' | 'candidate_feedback_submitted_at'
  >;
};

/** The candidate's post-round rating/comment (interview-service), already on
 * the round object — nothing to fetch. Renders nothing until submitted. */
export const RoundCandidateFeedback = ({ feedback }: RoundCandidateFeedbackProps) => {
  if (!feedback.candidate_feedback_submitted_at) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-sm font-semibold text-gray-700">Candidate&apos;s feedback</div>
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
        <p className="text-sm text-gray-600">{feedback.candidate_feedback_text}</p>
      )}
      <span className="text-xs text-gray-400">
        Submitted {dayjs(feedback.candidate_feedback_submitted_at).format('MMM D, h:mm A')}
      </span>
    </div>
  );
};
