import React from 'react';
import { Typography } from '../shared';
import { Loader } from '../shared/ui/loader';

type MetricTileProps = {
  title: string;
  isLoading: boolean;
  /** `false`/`undefined` renders the tile's "not available" state instead
   * of `children` — never a fake zero, per docs/frontend_guide.txt's
   * repeated instruction for exactly these five tiles. */
  available: boolean;
  children: React.ReactNode;
};

const MetricTile: React.FC<MetricTileProps> = ({ title, isLoading, available, children }) => (
  <div className="cfp-hover-lift relative overflow-hidden bg-white rounded-xl border border-neutral-200 p-5 flex flex-col gap-2 min-h-[140px]">
    <span
      className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary-600 to-accent-400"
      aria-hidden
    />
    <Typography
      variant="subtitle2"
      className="uppercase tracking-wide text-[11px] text-gray-500 font-bold"
    >
      {title}
    </Typography>
    {isLoading ? (
      <Loader />
    ) : available ? (
      children
    ) : (
      <Typography variant="body2" className="text-gray-400">
        Not available yet.
      </Typography>
    )}
  </div>
);

export default MetricTile;
