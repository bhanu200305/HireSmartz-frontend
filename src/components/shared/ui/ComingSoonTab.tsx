import React from 'react';
import { Typography } from './Typography';

/**
 * Honest placeholder for a screen whose real organization-service wiring
 * hasn't landed yet (tracked in a later integration phase) — shown instead
 * of leaving a legacy mock call silently pointed at data that no longer
 * matches a real session (e.g. a numeric company id that doesn't exist for
 * a real tenant_id-based login). Matches this codebase's own convention of
 * an explicit "not available" state rather than a broken or fake one.
 */
const ComingSoonTab: React.FC<{ label: string }> = ({ label }) => (
  <div className="p-10 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
    <Typography variant="h6" className="mb-1 block">
      {label}
    </Typography>
    <Typography variant="body2">
      This section is being connected and isn&apos;t available yet.
    </Typography>
  </div>
);

export default ComingSoonTab;
