import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select } from 'antd';
import { LuSquareActivity } from 'react-icons/lu';
import { MdOutlineArrowBack } from 'react-icons/md';
import MainLayout from '../../layouts/MainLayout';
import { Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import MasterPagination from '../shared/ui/MasterPagination';
import { RowsPerPageSelect } from '../shared/ui/RowsPerPageSelect';
import { usePersistedPageSize } from '../../hooks/usePersistedPageSize';
import { PAGE_SIZE_OPTIONS } from '../../constants/app.constants';
import { useListAuditEventsQuery } from '../../api/organization-service/Platform/audit';
import { useListPlatformTenantsQuery } from '../../api/organization-service/Platform/tenants';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

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

// Sentinel value for the Tenant Select's pinned "Platform / Super Admin
// only" option — never a real tenant_id, so it can't collide with one.
// Picking it selects `platformOnly` instead of a `tenantId`; the two are
// mutually exclusive server-side (422 if both are sent), so the onChange
// handler always clears one when it sets the other.
const PLATFORM_ONLY_VALUE = '__platform_only__';

/**
 * GET /v1/platform/audit/events — Super Admin's own action audit trail.
 * The action catalog is explicitly open-ended and grows over time
 * (docs/frontend_guide.txt), so labels are humanized generically rather
 * than mapped from a fixed list — nothing here breaks on a new value.
 *
 * Filters: Tenant, Action, and "Platform / Super Admin only" are all real,
 * backend-accepted query params (`tenant_id`, `action`, `platform_only` on
 * this same endpoint) — not client-side approximations. The last is folded
 * into the Tenant dropdown as a pinned option (`PLATFORM_ONLY_VALUE`) rather
 * than a separate control, since it answers the same underlying question —
 * "which organization is this?" — just with "none, it's platform-level" as
 * the answer; `tenant_id` and `platform_only` are mutually exclusive
 * server-side (422 if both are sent), which is exactly what picking one
 * option in one dropdown already guarantees. There is deliberately no Role
 * filter: an audit entry has no role field at all (only `actor_id` — a raw
 * user id — and `actor_type`, neither of which the backend accepts as a
 * filter param today), so a Role filter here would have nothing real to
 * filter by.
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
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('platform_audit', 25);
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState<string | undefined>(undefined);
  const [platformOnlyFilter, setPlatformOnlyFilter] = useState(false);
  const [actionFilter, setActionFilter] = useState<string | undefined>(undefined);

  const { data, isLoading, isFetching, error } = useListAuditEventsQuery({
    tenantId: tenantFilter,
    platformOnly: platformOnlyFilter,
    action: actionFilter,
    limit: pageSize,
    offset: page * pageSize,
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
  const hasActiveFilters = Boolean(tenantFilter || platformOnlyFilter || actionFilter);

  const clearFilters = () => {
    setTenantFilter(undefined);
    setPlatformOnlyFilter(false);
    setTenantSearch('');
    setActionFilter(undefined);
    setPage(0);
  };

  return (
    <MainLayout>
      <div className="w-full p-8 pt-16">
        <button
          onClick={() => navigate('/')}
          className="mb-4 flex w-fit items-center text-gray-600 hover:text-gray-800 cursor-pointer"
        >
          <MdOutlineArrowBack className="mr-2" />
          <span>Back</span>
        </button>
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
              value={platformOnlyFilter ? PLATFORM_ONLY_VALUE : tenantFilter}
              onChange={(value) => {
                if (value === PLATFORM_ONLY_VALUE) {
                  setPlatformOnlyFilter(true);
                  setTenantFilter(undefined);
                } else {
                  setTenantFilter(value);
                  setPlatformOnlyFilter(false);
                }
                setPage(0);
              }}
              onSearch={setTenantSearch}
              filterOption={false}
              loading={isSearchingTenants}
              notFoundContent={isSearchingTenants ? 'Searching…' : 'No companies found'}
              options={[
                { label: 'Platform / Super Admin Only', value: PLATFORM_ONLY_VALUE },
                ...(tenantResults?.tenants ?? []).map((tenant) => ({
                  label: tenant.company_name,
                  value: tenant.tenant_id,
                })),
              ]}
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
                Clear Filters
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
          <>
            <RowsPerPageSelect
              pageSize={pageSize}
              options={PAGE_SIZE_OPTIONS}
              onChange={(size) => {
                setPageSize(size);
                setPage(0);
              }}
            />
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
                    {event.created_at
                      ? new Date(event.created_at).toLocaleString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      : '-'}
                  </Typography>
                </div>
              ))}
            </div>
          </>
        )}

        {(data?.total ?? 0) > pageSize && (
          <MasterPagination
            current={page + 1}
            pageSize={pageSize}
            total={data?.total ?? 0}
            itemLabel="events"
            onPageChange={(p) => setPage(p - 1)}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default PlatformAudit;
