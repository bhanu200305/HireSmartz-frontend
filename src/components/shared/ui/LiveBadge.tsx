import React from 'react';

/**
 * Small "data is live" indicator for a KPI dashboard's header — a pulsing
 * dot, not a literal "refreshed N min ago" timestamp (nothing here tracks
 * that yet, and a fabricated one would be worse than none).
 */
const LiveBadge: React.FC = () => (
  <span className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-500">
    <span className="relative flex h-2 w-2" aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
    </span>
    Live
  </span>
);

export default LiveBadge;
