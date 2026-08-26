import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid var(--gray-200, #e5e8f0)',
  fontSize: 12,
  boxShadow: '0 8px 24px -12px rgba(16,30,54,.18)',
};

/**
 * Donut with the total centered inside the ring and a labeled dot list
 * alongside it, instead of a bottom legend — matches the KPI-dashboard
 * design (Jobs by status / Organization status / MFA success all use this
 * same shape: one number people scan first, plus the breakdown next to it).
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
            <Tooltip contentStyle={tooltipStyle} />
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
