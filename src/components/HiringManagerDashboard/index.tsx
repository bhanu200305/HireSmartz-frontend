import React from 'react';
import { MdOutlineInsights } from 'react-icons/md';
import MainLayout from '../../layouts/MainLayout';
import { Typography } from '../shared';
import HiringManagerStatCards from './HiringManagerStatCards';
import HiringManagerCharts from './HiringManagerCharts';
import QualifiedCandidatePoolSection from './QualifiedCandidatePoolSection';
import PendingDecisionsSection from './PendingDecisionsSection';

/**
 * Hiring Manager's home dashboard — the "Hiring Manager KPIs" table from
 * the KPI-addition spec: My open jobs / Candidates in review / Pending
 * Decision / Panel Interview (scheduled) per job / Avg AI score (per job) /
 * Hiring by location / Qualified candidate pool / Pending decisions.
 *
 * Every widget is scoped to this hiring manager's own assigned jobs
 * server-side (job-service's `assigned_to_me`, candidate-service's
 * `resolve_stats_job_scope` auto-scope) — nothing here passes a
 * `job_opening_id` or an "assigned to me" toggle of its own, unlike
 * `RecruiterDashboard`/`CompanyMetrics` which stay org-wide.
 */
const HiringManagerDashboard: React.FC = () => {
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
                {greeting}. Your assigned jobs and candidates at a glance.
              </Typography>
            </div>
          </div>
        </div>

        <section className="mb-6">
          <HiringManagerStatCards />
        </section>

        <section className="mb-6">
          <HiringManagerCharts />
        </section>

        <section className="mb-6">
          <QualifiedCandidatePoolSection />
        </section>

        <section>
          <PendingDecisionsSection />
        </section>
      </div>
    </MainLayout>
  );
};

export default HiringManagerDashboard;
