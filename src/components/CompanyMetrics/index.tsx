import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MdOutlineInsights } from 'react-icons/md';
import MainLayout from '../../layouts/MainLayout';
import { Typography, LiveBadge } from '../shared';
import { RootState } from '../../redux/provider/store';
import HiringOverviewStats from './HiringOverviewStats';
import HiringOverviewCharts from './HiringOverviewCharts';
import DeliveryAccessSection from './DeliveryAccessSection';
import OpenJobsSection from './OpenJobsSection';

/**
 * A company admin's own equivalent of the Super Admin's Platform Metrics —
 * "Hiring overview" (KPI stat cards) and its charts, every number scoped to
 * THIS tenant via job-service/candidate-service's own RLS, never the
 * platform-wide aggregate a company admin has no business seeing. Kept as a
 * separate page/route rather than reusing PlatformMetrics — that page is
 * gated on PLATFORM_VIEW specifically because only a no-tenant (platform)
 * principal can ever hold it (see Authorities.PLATFORM_VIEW's comment). The
 * Team/Job Openings/Feature Settings/Recent Activity tiles that used to sit
 * below this were pulled: redundant with (or, for "Job Openings", strictly
 * worse than — it never had real data behind it) the KPIs now above them.
 */
const CompanyMetrics: React.FC = () => {
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);

  if (!tenantId) {
    // A platform caller (Super Admin / internal staff) has no tenant of
    // their own — this screen has nothing to show them.
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout>
      <div className="w-full p-8 pt-12">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center space-x-2">
            <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
              <MdOutlineInsights size={18} />
            </span>
            <div>
              <h2 className="text-xl font-semibold leading-tight">Company Metrics</h2>
              <Typography variant="caption" className="text-neutral-400">
                Team, hiring and job openings — this company only
              </Typography>
            </div>
          </div>
          <LiveBadge />
        </div>

        <section className="mb-6">
          <Typography variant="subtitle1" className="mb-2 font-semibold text-neutral-900">
            Hiring overview
          </Typography>
          <HiringOverviewStats />
        </section>

        <section className="mb-6">
          <HiringOverviewCharts />
        </section>

        <section className="mb-6">
          <Typography variant="subtitle1" className="mb-2 font-semibold text-neutral-900">
            Delivery &amp; access
          </Typography>
          <DeliveryAccessSection />
        </section>

        <section>
          <Typography variant="subtitle1" className="mb-2 font-semibold text-neutral-900">
            Open jobs
          </Typography>
          <OpenJobsSection />
        </section>
      </div>
    </MainLayout>
  );
};

export default CompanyMetrics;
