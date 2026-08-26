import React, { useState } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { MdApartment } from 'react-icons/md';
import { Badge, BadgeStatus } from '../shared/ui/badge';
import { Loader } from '../shared/ui/loader';
import {
  useListPlatformTenantsQuery,
  type PlatformTenantSummary,
} from '../../api/organization-service/Platform/tenants';
import TenantAnalyticsModal from './TenantAnalyticsModal';

const STATUS_BADGE: Record<string, BadgeStatus> = {
  draft: 'neutral',
  pre_approved: 'warning',
  active: 'success',
  suspended: 'danger',
};

const formatStatusLabel = (status: string): string =>
  status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const formatDate = (isoDate: string | null): string =>
  isoDate
    ? new Date(isoDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

/**
 * Super Admin's "CFP Company" Dashboard slide, replaced to point at real
 * data. It used to call `/orguserservice/companies/dashboard/customers/
 * filters` (CFPDashboard.ts) — a pre-microservices monolith path with no
 * backend behind it anywhere in this repo (confirmed: not one of the ten
 * real services implements it), so it always rendered "0 CFP Company".
 * This pulls the same `GET /v1/platform/tenants` the real Companies page
 * already uses, same 5-rows-plus-"View all" shape as every other preview
 * slide in this carousel.
 *
 * Clicking a company opens its analytics in a modal (`TenantAnalyticsModal`)
 * rather than navigating to `/view-company` — that page-load/route-change
 * is exactly the friction this was asked to remove; the modal renders the
 * same content in place, instantly. An earlier hover-preview popover on
 * each row was pulled — this click-through modal replaced it outright.
 */
const TenantsPreviewCard: React.FC<{ fillHeight?: boolean }> = ({ fillHeight }) => {
  const navigate = useNavigate();
  const { data, isLoading } = useListPlatformTenantsQuery({ limit: 5 });
  const tenants = data?.tenants ?? [];

  const [selectedTenant, setSelectedTenant] = useState<PlatformTenantSummary | null>(null);

  return (
    <div
      className={clsx(
        'w-full rounded-xl border bg-white p-6 shadow-xs',
        fillHeight && 'flex h-full flex-col'
      )}
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-lg text-primary-600">
          <MdApartment />
        </div>
        <h2 className="font-display text-lg font-semibold text-neutral-900">
          <button
            type="button"
            className="transition-colors hover:text-primary"
            onClick={() => navigate('/company')}
          >
            CFP Company
          </button>
        </h2>
      </div>

      <div
        className={clsx(
          'mt-4 max-w-full overflow-x-auto overflow-y-auto',
          fillHeight ? 'min-h-0 flex-1' : 'max-h-[400px]'
        )}
      >
        {isLoading ? (
          <Loader />
        ) : (
          <table className="min-w-[500px] w-full text-left text-sm">
            <thead className="sticky top-0 m-0 bg-neutral-50 p-0">
              <tr className="text-neutral-500">
                <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                  Company
                </th>
                <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                  Status
                </th>
                <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                  Admin email
                </th>
                <th className="py-2.5 px-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {tenants.map((tenant) => (
                <tr key={tenant.tenant_id} className="transition-colors hover:bg-neutral-50">
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      className="font-semibold text-primary transition-colors hover:text-primary-700"
                      onClick={() => setSelectedTenant(tenant)}
                    >
                      {tenant.company_name}
                    </button>
                  </td>
                  <td className="py-3 px-3">
                    <Badge status={STATUS_BADGE[tenant.status] ?? 'neutral'}>
                      {formatStatusLabel(tenant.status)}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-neutral-600">{tenant.admin_email || '—'}</td>
                  <td className="py-3 px-3 text-neutral-600">{formatDate(tenant.created_at)}</td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-neutral-400">
                    No companies yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex shrink-0 items-center justify-between border-t border-neutral-100 pt-4 text-sm text-neutral-500">
        <span>
          Showing latest {tenants.length} of {data?.total ?? 0} companies
        </span>
        <button
          type="button"
          onClick={() => navigate('/company')}
          className="group flex items-center gap-1 text-xs font-semibold tracking-wide text-primary uppercase transition-colors hover:text-primary-700"
        >
          View all
          <span className="text-accent-400 transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </button>
      </div>

      {selectedTenant && (
        <TenantAnalyticsModal tenant={selectedTenant} onClose={() => setSelectedTenant(null)} />
      )}
    </div>
  );
};

export default TenantsPreviewCard;
