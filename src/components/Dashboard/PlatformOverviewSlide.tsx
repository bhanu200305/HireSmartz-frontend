import React from 'react';
import { MdOutlineInsights } from 'react-icons/md';
import OverviewSlide from './OverviewSlide';
import PlatformOverviewStats from '../PlatformMetrics/PlatformOverviewStats';

/**
 * Super Admin's home-dashboard carousel slide — just the four "Platform
 * overview" stat cards (2×2, no chart, no scroll), with "View full report"
 * linking to `/platform-metrics` for the complete growth/adoption charts.
 * Same numbers, same component as that page's own stat row.
 */
const PlatformOverviewSlide: React.FC<{ fillHeight?: boolean }> = ({ fillHeight }) => (
  <OverviewSlide
    icon={<MdOutlineInsights />}
    title="Platform Overview"
    subtitle="Customers, adoption and growth across every tenant"
    viewAllHref="/platform-metrics"
    fillHeight={fillHeight}
  >
    <PlatformOverviewStats columns={2} tall />
  </OverviewSlide>
);

export default PlatformOverviewSlide;
