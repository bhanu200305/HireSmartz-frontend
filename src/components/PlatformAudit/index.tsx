import React, { useEffect, useMemo, useState } from 'react';
import { Select } from 'antd';
import { LuSquareActivity } from 'react-icons/lu';
import MainLayout from '../../layouts/MainLayout';
import { Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import MasterPagination from '../shared/ui/MasterPagination';
import { useListAuditEventsQuery } from '../../api/organization-service/Platform/audit';
import { useListPlatformTenantsQuery } from '../../api/organization-service/Platform/tenants';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

const PAGE_SIZE = 25;
// Purely to populate the Action filter's option list with real, actually-
// observed values (see the note below on why this isn't a hardcoded enum) —
// not a page anyone scrolls through, so it can afford to look back further
// than PAGE_SIZE without adding a second visible pagination control.
const ACTION_CATALOG_SAMPLE_SIZE = 200;

const describeAction = (action: string): string =>
  action
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/**
 * GET /v1/platform/audit/events — Super Admin's own action audit trail.
 * The action catalog is explicitly open-ended and grows over time
 * (docs/frontend_guide.txt), so labels are humanized generically rather
 * than mapped from a fixed list — nothing here breaks on a new value.
 *
 * Filters: Tenant and Action are both real, backend-accepted query params
 * (`tenant_id`, `action` on this same endpoint) — not client-side
 * approximations. There is deliberately no Role filter: an audit entry has
 * no role field at all (only `actor_id` — a raw user id — and `actor_type`,
 * neither of which the backend accepts as a filter param today), so a Role
 * filter here would have nothing real to filter by.
 *
 * The Action dropdown's OPTIONS are drawn from a real sample of this same
 * endpoint (`ACTION_CATALOG_SAMPLE_SIZE` recent events, unfiltered) instead
 * of a hardcoded list of the backend's `AuditAction` enum — that enum's own
 * docstring says it's "grown incrementally... not meant to be exhaustive on
 * day one", so a frontend copy of it would just be one more place to keep
 * in sync every time a new action gets wired up. Sourcing the list from
 * what's actually been logged self-updates instead, at the cost of not
 * offering an action to filter by until it's happened at least once —
 * which is also, not coincidentally, the only time filtering by it is
 * useful.
 *
 * Each row shows a tenant NAME (resolved from the same tenant list the
 * filter dropdown fetches, best-effort — see `tenantNameById` below) AND
 * the actor's name — `event.actor_name`, resolved server-side from
 * `actor_id` against platform staff (see `AuditLogEntryView`'s own
 * docstring in org-service). Falls back to the raw `actor_id` only when
 * that resolution comes back `null` (the membership no longer exists),
 * same fallback shape `TenantActivityFeedTab` uses for the same reason.
 */
const PlatformAudit: React.FC = () => {
  const [page, setPage] = useState(0);
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState<string | undefined>(undefined);
  const [actionFilter, setActionFilter] = useState<string | undefined>(undefined);

  const { data, isLoading, isFetching, error } = useListAuditEventsQuery({
    tenantId: tenantFilter,
    action: actionFilter,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const { data: tenantResults, isFetching: isSearchingTenants } = useListPlatformTenantsQuery({
    q: tenantSearch.trim() || undefined,
    limit: 50,
  });
  // Best-effort id -> name lookup for the event rows below, reusing the
  // exact same fetch the Tenant filter dropdown already needs — no extra
  // request, no backend change. "Best-effort" because it only covers
  // whichever 50 tenants are currently loaded into that dropdown (all of
  // them, once matching the search box's current text, or the most recent
  // 50 with it empty) — an event naming a tenant outside that window still
  // shows its raw id, which is what `tenantName` falls back to below.
  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenantResults?.tenants ?? []).forEach((tenant) =>
      map.set(tenant.tenant_id, tenant.company_name)
    );
    return map;
  }, [tenantResults]);

  const { data: actionSample } = useListAuditEventsQuery({ limit: ACTION_CATALOG_SAMPLE_SIZE });
  const actionOptions = useMemo(() => {
    const seen = new Set<string>();
    (actionSample?.events ?? []).forEach((event) => seen.add(event.action));
    // The currently-selected filter stays selectable even if it fell out of
    // the sample (e.g. it's now the only filter applied and nothing else
    // matches within the sample window) — losing your own selection out
    // from under you reads as the filter silently resetting.
    if (actionFilter) seen.add(actionFilter);
    return Array.from(seen)
      .sort((a, b) => a.localeCompare(b))
      .map((action) => ({ label: describeAction(action), value: action }));
  }, [actionSample, actionFilter]);

  useEffect(() => {
    if (error) {
      showToast({ message: getOrgErrorMessage(error, 'Failed to load audit log.'), type: 'error' });
    }
  }, [error]);

  const events = data?.events ?? [];
  const hasActiveFilters = Boolean(tenantFilter || actionFilter);

  const clearFilters = () => {
    setTenantFilter(undefined);
    setTenantSearch('');
    setActionFilter(undefined);
    setPage(0);
  };

  return (
    <MainLayout>
      <div className="w-full p-8 pt-16">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
              <LuSquareActivity size={18} />
            </span>
            <h2 className="font-display text-xl font-bold text-gray-900">Audit Log</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              placeholder="Filter by tenant"
              allowClear
              showSearch
              className="w-56"
              value={tenantFilter}
              onChange={(value) => {
                setTenantFilter(value);
                setPage(0);
              }}
              onSearch={setTenantSearch}
              filterOption={false}
              loading={isSearchingTenants}
              notFoundContent={isSearchingTenants ? 'Searching…' : 'No companies found'}
              options={(tenantResults?.tenants ?? []).map((tenant) => ({
                label: tenant.company_name,
                value: tenant.tenant_id,
              }))}
            />
            <Select
              placeholder="Filter by action"
              allowClear
              showSearch
              className="w-56"
              value={actionFilter}
              onChange={(value) => {
                setActionFilter(value);
                setPage(0);
              }}
              filterOption={(input, option) =>
                String(option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={actionOptions}
            />
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="cursor-pointer text-xs font-semibold text-primary-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <Loader />
        ) : events.length === 0 ? (
          <div className="p-10 text-center text-gray-500 border border-dashed border-neutral-200 rounded-xl bg-neutral-50">
            {hasActiveFilters
              ? 'No Super Admin actions match these filters.'
              : 'No Super Admin actions recorded yet.'}
          </div>
        ) : (
          <div
            className={`divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden bg-white transition-opacity ${
              isFetching ? 'opacity-60' : ''
            }`}
          >
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-primary-50 transition-colors"
              >
                <div>
                  <Typography variant="body1" className="font-medium">
                    {describeAction(event.action)}
                  </Typography>
                  <Typography variant="caption">
                    {event.target_type} · by {event.actor_name || event.actor_id}
                    {event.tenant_id
                      ? ` · ${tenantNameById.get(event.tenant_id) ?? `tenant ${event.tenant_id}`}`
                      : ''}
                  </Typography>
                </div>
                <Typography variant="caption" className="whitespace-nowrap">
                  {event.created_at ? new Date(event.created_at).toLocaleString() : '-'}
                </Typography>
              </div>
            ))}
          </div>
        )}

        {(data?.total ?? 0) > PAGE_SIZE && (
          <MasterPagination
            current={page + 1}
            pageSize={PAGE_SIZE}
            total={data?.total ?? 0}
            itemLabel="Events"
            onPageChange={(p) => setPage(p - 1)}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default PlatformAudit;
