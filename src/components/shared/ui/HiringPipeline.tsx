import React from 'react';
import {
  FiFileText,
  FiMic,
  FiCpu,
  FiUsers,
  FiCheckCircle,
  FiXCircle,
  FiPhoneCall,
  FiCalendar,
  FiCircle,
} from 'react-icons/fi';

export type PipelineStage = {
  label: string;
  value: number;
};

type HiringPipelineProps = {
  stages: PipelineStage[];
};

const OUTCOME_LABELS = new Set(['selected', 'rejected']);

const OUTCOME_STYLES: Record<string, { icon: React.ReactNode; wrap: string; iconWrap: string }> = {
  selected: {
    icon: <FiCheckCircle />,
    wrap: 'border-neutral-200 bg-success-bg',
    iconWrap: 'bg-white text-success',
  },
  rejected: {
    icon: <FiXCircle />,
    wrap: 'border-neutral-200 bg-danger-bg',
    iconWrap: 'bg-white text-danger',
  },
};

/** Blue ramp for the sequential stage cards — darkest first, lightening as
 * candidates move further down the pipeline, cycling if there are more
 * stages than swatches. */
const STAGE_TINTS = [
  { wrap: 'bg-primary-50', icon: 'text-primary-700' },
  { wrap: 'bg-primary-50', icon: 'text-primary-600' },
  { wrap: 'bg-accent-50', icon: 'text-accent-600' },
  { wrap: 'bg-accent-50', icon: 'text-accent-500' },
];

const stageIcon = (label: string): React.ReactNode => {
  const key = label.trim().toLowerCase();
  if (key.includes('applied')) return <FiFileText />;
  if (key.includes('audio')) return <FiMic />;
  if (key.includes('ai')) return <FiCpu />;
  if (key.includes('panel') || key.includes('team')) return <FiUsers />;
  if (key.includes('intake') || key.includes('phone') || key.includes('call'))
    return <FiPhoneCall />;
  if (key.includes('schedul') || key.includes('interview')) return <FiCalendar />;
  return <FiCircle />;
};

/**
 * Candidate-pipeline visual for the "Hiring funnel" KPI — stage cards
 * connected by arrows, with Selected/Rejected broken out as an outcome
 * branch off to the side, replacing the old proportional-bar-list funnel.
 *
 * Stage labels/order come straight from the API and aren't hardcoded —
 * tenants can rename or add interview rounds (e.g. "Intake Call"), so this
 * treats anything literally labeled "Selected" or "Rejected" as the outcome
 * branch and renders everything else, in the order given, as the sequential
 * pipeline.
 */
const HiringPipeline: React.FC<HiringPipelineProps> = ({ stages }) => {
  const mainStages = stages.filter((s) => !OUTCOME_LABELS.has(s.label.trim().toLowerCase()));
  const outcomeStages = stages.filter((s) => OUTCOME_LABELS.has(s.label.trim().toLowerCase()));

  if (mainStages.length === 0) return null;

  const total = mainStages[0].value || 1;
  const lastMainStage = mainStages[mainStages.length - 1];
  const outcomeBase = lastMainStage.value || 1;

  return (
    <div className="flex h-full flex-col justify-center gap-3 py-1">
      <div className="flex flex-col items-stretch gap-2 sm:flex-row">
        {mainStages.map((stage, i) => {
          const tint = STAGE_TINTS[i % STAGE_TINTS.length];
          const pct = Math.round((stage.value / total) * 100);
          return (
            <React.Fragment key={stage.label}>
              <div className="flex-1 rounded-xl border border-neutral-200 px-2 py-3 text-center transition-transform duration-200 hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md">
                <div
                  className={`mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-lg text-sm ${tint.wrap} ${tint.icon}`}
                >
                  {stageIcon(stage.label)}
                </div>
                <div className="truncate text-xs font-bold tracking-wide text-neutral-500">
                  {stage.label}
                </div>
                <div className="mt-1 font-display text-lg font-semibold text-neutral-900">
                  {stage.value.toLocaleString()}
                </div>
                <div className="mt-0.5 text-xs text-neutral-400">Candidates · {pct}% of total</div>
              </div>
              {i < mainStages.length - 1 && (
                <div className="flex shrink-0 items-center justify-center py-1 text-primary-500 sm:w-6 sm:py-0">
                  <span className="rotate-90 text-lg leading-none sm:rotate-0">→</span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {outcomeStages.length > 0 && (
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-neutral-400">
            <span className="h-px w-4 bg-neutral-300" aria-hidden />
            {lastMainStage.label} Outcome
          </div>
          <div className="grid grid-cols-2 gap-2 sm:w-[22rem]">
            {outcomeStages.map((stage) => {
              const key = stage.label.trim().toLowerCase();
              const style = OUTCOME_STYLES[key] ?? OUTCOME_STYLES.selected;
              const pct = Math.round((stage.value / outcomeBase) * 100);
              return (
                <div
                  key={stage.label}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${style.wrap}`}
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs ${style.iconWrap}`}
                  >
                    {style.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-bold tracking-wide text-neutral-500">
                      {stage.label}
                    </div>
                    <div className="font-display text-sm font-semibold text-neutral-900">
                      {stage.value.toLocaleString()}
                    </div>
                    <div className="truncate text-[11px] text-neutral-400">{pct}% of stage</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default HiringPipeline;
