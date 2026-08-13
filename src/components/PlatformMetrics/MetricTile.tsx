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
  <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2 min-h-[140px]">
    <Typography variant="subtitle2">{title}</Typography>
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
