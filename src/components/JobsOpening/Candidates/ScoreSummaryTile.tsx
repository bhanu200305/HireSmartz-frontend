import { useState, type ReactNode } from 'react';
import { AI_SCORE_MAX, aiScorePercent, scoreBadgeStatus } from './roundPipeline';

type ScoreSummaryTileProps = {
  label: string;
  icon: ReactNode;
  /** 0-AI_SCORE_MAX, or null when not scored yet. */
  score: number | null | undefined;
  reason?: string | null;
  /** Shown in place of the score while it's still pending. */
  pendingText: string;
};

// Same green / amber / red cut points as `scoreBadgeStatus` everywhere else.
const TONE = {
  success: { bar: 'bg-success', text: 'text-success-text' },
  warning: { bar: 'bg-warning', text: 'text-warning-text' },
  danger: { bar: 'bg-danger', text: 'text-danger-text' },
} as const;

/** Explanations longer than this are cut with "…" and a See more toggle. */
const REASON_WORD_LIMIT = 100;

/** The AI's explanation, truncated to REASON_WORD_LIMIT words until expanded. */
const ReasonText = ({ text }: { text: string }) => {
  const [expanded, setExpanded] = useState(false);
  const words = text.trim().split(/\s+/);
  const isLong = words.length > REASON_WORD_LIMIT;
  const shown = isLong && !expanded ? `${words.slice(0, REASON_WORD_LIMIT).join(' ')}…` : text;

  return (
    <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">
      {shown}
      {isLong && (
        <>
          {' '}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="font-semibold text-primary hover:underline cursor-pointer"
          >
            {expanded ? 'See less' : 'See more'}
          </button>
        </>
      )}
    </p>
  );
};

// One AI score on the Resume Screening panel (resume score, intake-call
// consistency): label + "x / 5" with a colour-banded bar on top, the AI's
// explanation below it — always stacked, full card width, never a side
// column. A side-by-side layout here (score block left, text right) looked
// right in principle but a narrow text column wraps prose into an
// unreadable single-word-per-line column the moment anything upstream eats
// even a little of its width; stacking removes that failure mode entirely
// since the explanation always gets the full card to itself.
const ScoreSummaryTile = ({ label, icon, score, reason, pendingText }: ScoreSummaryTileProps) => {
  const isScored = score != null;
  const status = isScored ? scoreBadgeStatus(score) : null;
  const tone =
    status === 'success' || status === 'warning' || status === 'danger' ? TONE[status] : null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary">
          {icon}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      </div>

      {isScored && tone ? (
        <>
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-bold leading-none ${tone.text}`}>{score}</span>
            <span className="text-sm font-medium text-gray-400">/ {AI_SCORE_MAX}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${tone.bar} transition-[width] duration-500`}
              style={{ width: `${aiScorePercent(score)}%` }}
            />
          </div>
        </>
      ) : (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-400" aria-hidden />
          Pending
        </span>
      )}

      {/* The score/bar above reads as one unit; this divider is what marks
          "everything below is the explanation", now that there's no longer
          a side border doing that job. */}
      <div className="min-w-0 border-t border-gray-100 pt-3">
        {reason ? (
          <ReasonText text={reason} />
        ) : (
          <p className="text-sm text-gray-400">
            {isScored ? 'No explanation provided.' : pendingText}
          </p>
        )}
      </div>
    </div>
  );
};

export default ScoreSummaryTile;
