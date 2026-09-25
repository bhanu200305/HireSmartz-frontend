import React from 'react';
import { MdOutlineInsights } from 'react-icons/md';
import OverviewSlide from './OverviewSlide';
import HiringOverviewStats from '../CompanyMetrics/HiringOverviewStats';

/**
 * Company Admin's home-dashboard carousel slide — just the four "Hiring
 * overview" stat cards (2×2, no chart, no scroll), with "View full report"
 * linking to `/company-metrics` for the complete breakdown. Same reasoning
 * as the Super Admin's `PlatformOverviewSlide`.
 */
const HiringOverviewSlide: React.FC<{ fillHeight?: boolean }> = ({ fillHeight }) => (
  <OverviewSlide
    icon={<MdOutlineInsights />}
    title="Hiring Overview"
    subtitle="Job Openings, applications and interviews for your company"
    viewAllHref="/company-metrics"
    fillHeight={fillHeight}
  >
    <HiringOverviewStats columns={2} tall />
  </OverviewSlide>
);

export default HiringOverviewSlide;
