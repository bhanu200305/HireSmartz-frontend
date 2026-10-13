import React from 'react';

export type FunnelStageBar = {
  label: string;
  value: number;
};

type FunnelBarsProps = {
  stages: FunnelStageBar[];
  color?: string;
};

/**
 * Horizontal proportional bar list for a funnel/pipeline — each row's fill
 * width is scaled against the largest stage (the first one, always, for a
 * real funnel) rather than each bar carrying its own axis. Reads as a single
 * shape at a glance, which a `BarChart` with tick labels and gridlines
 * doesn't for a strict top-to-bottom funnel like this.
 */
const FunnelBars: React.FC<FunnelBarsProps> = ({ stages, color = '#fe7725' }) => {
  const max = Math.max(...stages.map((stage) => stage.value), 1);

  return (
    <div className="flex flex-col gap-3">
      {stages.map((stage) => {
        const widthPercent = Math.max((stage.value / max) * 100, stage.value > 0 ? 3 : 0);
        return (
          <div key={stage.label} className="flex items-center gap-3">
            <span className="w-36 shrink-0 truncate text-right text-sm text-neutral-600">
              {stage.label}
            </span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${widthPercent}%`, backgroundColor: color }}
              />
            </div>
            <span className="w-12 shrink-0 text-right font-display text-sm font-semibold text-neutral-900">
              {stage.value.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default FunnelBars;
