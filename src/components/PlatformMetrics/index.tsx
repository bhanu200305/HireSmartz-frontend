import React from 'react';
import { MdOutlineInsights } from 'react-icons/md';
import MainLayout from '../../layouts/MainLayout';
import { Typography, LiveBadge } from '../shared';
import PlatformOverviewStats from './PlatformOverviewStats';
import GrowthAdoptionCharts from './GrowthAdoptionCharts';

/**
 * Super Admin dashboard — "Platform overview" (KPI stat cards) and "Growth &
 * adoption" (charts), each fetching its own metrics independently so one
 * slow/unavailable call never blocks the rest. The Health/Security/
 * Finances/Cost tiles that used to sit below this were pulled: those four
 * depend on billing-service/authentication-service surfaces that don't
 * exist yet (each rendered "Not available yet." unconditionally) — dead
 * weight on the page until there's real data behind them, not KPIs from the
 * dashboard-inventory doc this page is otherwise wired to.
 */
const PlatformMetrics: React.FC = () => {
  return (
    <MainLayout>
      <div className="w-full p-8 pt-12">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center space-x-2">
            <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
              <MdOutlineInsights size={18} />
            </span>
            <div>
              <h2 className="text-xl font-semibold leading-tight">Platform Metrics</h2>
              <Typography variant="caption" className="text-neutral-400">
                Customers, adoption and growth, platform-wide
              </Typography>
            </div>
          </div>
          <LiveBadge />
        </div>

        <section className="mb-6">
          <Typography variant="subtitle1" className="mb-2 font-semibold text-neutral-900">
            Platform overview
          </Typography>
          <PlatformOverviewStats />
        </section>

        <section>
          <Typography variant="subtitle1" className="mb-2 font-semibold text-neutral-900">
            Growth &amp; adoption
          </Typography>
          <GrowthAdoptionCharts />
        </section>
      </div>
    </MainLayout>
  );
};

export default PlatformMetrics;
