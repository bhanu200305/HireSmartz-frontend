import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export type DonutSlice = {
  name: string;
  value: number;
  color: string;
};

type DonutStatProps = {
  data: DonutSlice[];
  /** Small caption under the center total, e.g. "JOBS", "TENANTS". */
  centerLabel: string;
  height?: number;
};

/**
 * Donut with the total centered inside the ring and a labeled dot list
 * alongside it, instead of a bottom legend — matches the KPI-dashboard
 * design (Jobs by status / Organization status / MFA success all use this
 * same shape: one number people scan first, plus the breakdown next to it).
 *
 * No hover tooltip: recharts positions a Pie's default tooltip near the
 * hovered slice's own arc midpoint, which for a wide-innerRadius donut like
 * this one can land inside the ring — directly on top of the center total
 * pinned there via `absolute inset-0`, with no `position` override that
 * reliably keeps it clear of that box at every slice angle. The slice's
 * name/value are already visible at all times in the list to the right, so
 * the tooltip was showing nothing new — dropping it removes the overlap
 * outright instead of chasing a position fix.
 */
const DonutStat: React.FC<DonutStatProps> = ({ data, centerLabel, height = 168 }) => {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold text-neutral-900">
            {total.toLocaleString()}
          </span>
          <span className="text-[10px] font-semibold tracking-wide text-neutral-400 uppercase">
            {centerLabel}
          </span>
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-2.5">
        {data.map((slice) => (
          <li key={slice.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-neutral-600">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
                aria-hidden
              />
              {slice.name}
            </span>
            <span className="font-display font-semibold text-neutral-900">
              {slice.value.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DonutStat;
