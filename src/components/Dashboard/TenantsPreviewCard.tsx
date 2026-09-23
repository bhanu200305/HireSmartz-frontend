import React, { useState } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { MdApartment } from 'react-icons/md';
import { Select } from 'antd';
import { Badge } from '../shared/ui/badge';
import { Loader } from '../shared/ui/loader';
import MasterPagination from '../shared/ui/MasterPagination';
import { usePersistedPageSize } from '../../hooks/usePersistedPageSize';
import {
  useListPlatformTenantsQuery,
  type PlatformTenantSummary,
} from '../../api/organization-service/Platform/tenants';
import TenantAnalyticsModal from './TenantAnalyticsModal';
import {
  TENANT_STATUS_BADGE,
  formatTenantStatusLabel,
  formatTenantDate,
} from './tenantDisplay.helpers';

const PAGE_SIZE_OPTIONS = [5, 10, 20];

/**
 * Super Admin's "CFP Company" Dashboard slide, replaced to point at real
 * data. It used to call `/orguserservice/companies/dashboard/customers/
 * filters` (CFPDashboard.ts) — a pre-microservices monolith path with no
 * backend behind it anywhere in this repo (confirmed: not one of the ten
 * real services implements it), so it always rendered "0 CFP Company".
 * This pulls the same `GET /v1/platform/tenants` the real Companies page
 * already uses.
 *
 * PAGINATED IN PLACE, not just a "top 5 + View all" static preview: the
 * endpoint already supports `limit`/`offset` (the full `/company` page has
 * used it for filtering/paging from the start — see `CustomerTable`), so
 * this card gets the same browsing without leaving the dashboard. Rows per
 * page is a `usePersistedPageSize` choice — a per-browser convenience, not
 * a setting stored anywhere on the backend.
 *
 * Clicking a company opens its analytics in a modal (`TenantAnalyticsModal`)
 * rather than navigating to `/view-company` — that page-load/route-change
 * is exactly the friction this was asked to remove; the modal renders the
 * same content in place, instantly. An earlier hover-preview popover on
 * each row was pulled — this click-through modal replaced it outright.
 * "View all" still links to `/company` for the status/search filters this
 * compact card has no room for.
 */
const TenantsPreviewCard: React.FC<{ fillHeight?: boolean }> = ({ fillHeight }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('tenants_preview_card', 5);

  const { data, isLoading } = useListPlatformTenantsQuery({
    limit: pageSize,
    offset: page * pageSize,
  });
  const tenants = data?.tenants ?? [];
  const total = data?.total ?? 0;

  const [selectedTenant, setSelectedTenant] = useState<PlatformTenantSummary | null>(null);

  return (
    <div
      className={clsx(
        'w-full rounded-xl border bg-white p-6 shadow-xs',
        fillHeight && 'flex h-full flex-col'
      )}
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-lg text-primary-600">
            <MdApartment />
          </div>
          <h2 className="font-display text-lg font-semibold text-neutral-900">
            <button
              type="button"
              className="transition-colors hover:text-primary cursor-pointer"
              onClick={() => navigate('/company')}
            >
              CFP Company
            </button>
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
          <span>Rows</span>
          <Select
            size="small"
            value={pageSize}
            className="w-16"
            options={PAGE_SIZE_OPTIONS.map((size) => ({ label: size, value: size }))}
            onChange={(size) => {
              setPageSize(size);
              setPage(0);
            }}
          />
        </div>
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
                      className="font-semibold text-primary transition-colors hover:text-primary-700 cursor-pointer"
                      onClick={() => setSelectedTenant(tenant)}
                    >
                      {tenant.company_name}
                    </button>
                  </td>
                  <td className="py-3 px-3">
                    <Badge status={TENANT_STATUS_BADGE[tenant.status] ?? 'neutral'}>
                      {formatTenantStatusLabel(tenant.status)}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-neutral-600">{tenant.admin_email || '-'}</td>
                  <td className="py-3 px-3 text-neutral-600">
                    {formatTenantDate(tenant.created_at)}
                  </td>
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

      <div className="mt-4 shrink-0 border-t border-neutral-100 pt-3">
        <MasterPagination
          current={page + 1}
          pageSize={pageSize}
          total={total}
          itemLabel="companies"
          onPageChange={(nextPage) => setPage(nextPage - 1)}
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/company')}
            className="group flex items-center gap-1 text-xs font-semibold tracking-wide text-primary uppercase transition-colors hover:text-primary-700 cursor-pointer"
          >
            View all / filter
            <span className="text-accent-400 transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </button>
        </div>
      </div>

      {selectedTenant && (
        <TenantAnalyticsModal tenant={selectedTenant} onClose={() => setSelectedTenant(null)} />
      )}
    </div>
  );
};

export default TenantsPreviewCard;
