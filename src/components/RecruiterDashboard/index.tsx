import React from 'react';
import { MdOutlineInsights } from 'react-icons/md';
import MainLayout from '../../layouts/MainLayout';
import { Typography, LiveBadge } from '../shared';
import RecruiterStatCards from './RecruiterStatCards';
import RecruiterCharts from './RecruiterCharts';
import OpenJobsSection from '../CompanyMetrics/OpenJobsSection';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';

/**
 * Recruiter's home dashboard — the "Recruiter KPIs" table from the
 * KPI-addition spec: Total applications / Active job openings (my open
 * jobs) / Applications over time / Interviews by Status & Type / Jobs by
 * status / Open jobs list / AI score distribution (global, for triage).
 *
 * Every widget's own permission gate (JOB_OPENING_VIEW / CANDIDATE_VIEW)
 * already lives in `RecruiterStatCards`/`RecruiterCharts` — same
 * per-card/per-chart pattern as `CompanyMetrics`, so a location override
 * that narrows this recruiter's grants still hides exactly the right
 * pieces rather than the whole page. `JOB_OPENING_VIEW` gates the page
 * shell itself only because "Open jobs list" has no card-level fallback of
 * its own to hide behind.
 */
const RecruiterDashboard: React.FC = () => {
  const canViewJobs = useHasAccess(Authorities.JOB_OPENING_VIEW);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <MainLayout>
      <div className="w-full px-5 py-4 pt-8 sm:px-8 sm:py-5 sm:pt-12">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
              <MdOutlineInsights size={18} />
            </span>
            <div>
              <h2 className="text-xl font-semibold leading-tight">Dashboard</h2>
              <Typography variant="caption" className="text-neutral-400">
                {greeting}. Your applications, jobs and interviews at a glance.
              </Typography>
            </div>
          </div>
          <LiveBadge />
        </div>

        <section className="mb-6">
          <RecruiterStatCards />
        </section>

        <section className="mb-6">
          <RecruiterCharts />
        </section>

        {canViewJobs && (
          <section>
            <Typography variant="subtitle1" className="mb-2 font-semibold text-neutral-900">
              Open jobs
            </Typography>
            <OpenJobsSection status="published" />
          </section>
        )}
      </div>
    </MainLayout>
  );
};

export default RecruiterDashboard;
