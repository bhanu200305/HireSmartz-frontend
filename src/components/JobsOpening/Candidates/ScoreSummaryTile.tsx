import type { ReactNode } from 'react';
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
  success: { bar: 'bg-success', text: 'text-success-text', chip: 'bg-success-bg' },
  warning: { bar: 'bg-warning', text: 'text-warning-text', chip: 'bg-warning-bg' },
  danger: { bar: 'bg-danger', text: 'text-danger-text', chip: 'bg-danger-bg' },
} as const;

// One AI score on the Resume Screening panel (resume score, intake-call
// consistency): label, "x / 5" with a colour-banded bar, and the AI's reason.
const ScoreSummaryTile = ({ label, icon, score, reason, pendingText }: ScoreSummaryTileProps) => {
  const isScored = score != null;
  const status = isScored ? scoreBadgeStatus(score) : null;
  const tone =
    status === 'success' || status === 'warning' || status === 'danger' ? TONE[status] : null;

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
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
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" aria-hidden />
            Pending
          </span>
          <span className="text-sm text-gray-400">{pendingText}</span>
        </div>
      )}

      {reason && <p className="text-sm leading-relaxed text-gray-600">{reason}</p>}
    </div>
  );
};

export default ScoreSummaryTile;
