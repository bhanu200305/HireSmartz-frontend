import React, { useEffect, useState } from 'react';
import type { TableProps } from 'antd';
import { LuSquareActivity } from 'react-icons/lu';
import { Badge, CustomTable, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import MasterPagination from '../shared/ui/MasterPagination';
import {
  useListTenantActivityQuery,
  ActivityLogEntry,
} from '../../api/organization-service/Tenants/profile';
import { useListPlatformTenantActivityQuery } from '../../api/organization-service/Platform/tenantActivity';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

const PAGE_SIZE = 20;

// Known values of organization-service's ActivityAction enum, for a nicer
// label — but the catalog is explicitly open-ended and grows over time
// (docs/frontend_guide.txt: "don't build anything that breaks on seeing a
// new one"), so anything not in this map falls back to a humanized version
// of the raw string rather than erroring or showing nothing.
const ACTION_LABELS: Record<string, string> = {
  profile_updated: 'Company profile updated',
  office_added: 'Office added',
  office_updated: 'Office updated',
  office_deleted: 'Office removed',
  department_created: 'Department created',
  department_deleted: 'Department deleted',
  entitlements_updated: 'Feature settings updated',
  scoring_config_updated: 'Scoring weights updated',
  qr_code_generated: 'QR code generated',
  user_invited: 'Team member invited',
  invitation_resent: 'Invitation resent',
  invitation_revoked: 'Invitation revoked',
  user_offboarded: 'User deactivated',
  role_assigned: 'Role granted',
  role_revoked: 'Role revoked',
};

const describeAction = (action: string): string =>
  ACTION_LABELS[action] ??
  action
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

type ActivityRow = ActivityLogEntry & { key: string };

/**
 * GET /v1/tenants/{tenant_id}/activity — this tenant's own admin activity
 * log (invites, role grants, profile/office/department edits, …). Real data
 * only: an empty page says so plainly rather than inventing a placeholder
 * entry. Same list also backs the Dashboard's "recent activity" preview
 * per docs/frontend_guide.txt — this is the full, paginated version of it.
 *
 * Icon-badge header + table treatment matches the rest of this page
 * (Locations, Departments, Feature Settings) — pagination stays server-side
 * (`limit`/`offset`) via MasterPagination below the table rather than
 * CustomTable's own client-side pagination, since the full activity log
 * isn't fetched at once.
 *
 * `isMaster` switches to GET /v1/platform/tenants/{tenant_id}/activity —
 * same shape, ORGANIZATION_READ guard instead of require_own_tenant — so
 * Super Admin's ViewCustomer tabs can reuse this exact component instead of
 * reimplementing it.
 */
const TenantActivityFeedTab: React.FC<{ tenantId: string; isMaster?: boolean }> = ({
  tenantId,
  isMaster = false,
}) => {
  const [page, setPage] = useState(0);
  // Both hooks are always called (rules of hooks); only one is ever skipped.
  const tenantResult = useListTenantActivityQuery(
    { tenantId, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
    { skip: isMaster }
  );
  const platformResult = useListPlatformTenantActivityQuery(
    { tenantId, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
    { skip: !isMaster }
  );
  const { data, isLoading, error } = isMaster ? platformResult : tenantResult;

  useEffect(() => {
    if (error) {
      showToast({ message: getOrgErrorMessage(error, 'Failed to load activity.'), type: 'error' });
    }
  }, [error]);

  const events = data?.events ?? [];

  if (isLoading) return <Loader />;

  const columns: TableProps<ActivityRow>['columns'] = [
    {
      title: 'Event',
      dataIndex: 'action',
      key: 'action',
      render: (_: unknown, event: ActivityRow) => (
        <span className="font-semibold text-gray-900">{describeAction(event.action)}</span>
      ),
    },
    {
      title: 'Target',
      dataIndex: 'target_type',
      key: 'target_type',
      render: (_: unknown, event: ActivityRow) => (
        <Badge status="neutral" dot={false}>
          {event.target_type}
        </Badge>
      ),
    },
    {
      title: 'By',
      dataIndex: 'actor_id',
      key: 'actor_id',
      render: (_: unknown, event: ActivityRow) => (
        <span className="text-gray-500 text-sm font-mono">{event.actor_id}</span>
      ),
    },
    {
      title: 'When',
      key: 'created_at',
      render: (_: unknown, event: ActivityRow) => (
        <span className="text-gray-500 text-sm whitespace-nowrap">
          {event.created_at ? new Date(event.created_at).toLocaleString() : '-'}
        </span>
      ),
    },
  ];

  const dataSource: ActivityRow[] = events.map((event) => ({ ...event, key: event.id }));

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-primary-600 to-accent-500 text-white flex items-center justify-center shadow-sm">
          <LuSquareActivity size={18} />
        </span>
        <div>
          <Typography variant="h5">Activity</Typography>
          <Typography variant="body2" className="text-gray-400 mt-0.5">
            Who did what in your company, and when.
          </Typography>
        </div>
      </div>

<<<<<<< HEAD
      {isLoading ? (
        <Loader />
      ) : events.length === 0 ? (
        <div className="p-10 text-center text-gray-500 border border-dashed border-gray-200 rounded-xl">
          No activity yet — actions like inviting a teammate or updating a setting will show up
          here.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="w-9 h-9 shrink-0 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                  <LuSquareActivity size={16} />
                </span>
                <div className="min-w-0">
                  <Typography variant="body1" className="font-medium text-gray-900">
                    {describeAction(event.action)}
                  </Typography>
                  <Typography variant="caption" className="text-gray-400 truncate block">
                    {event.target_type} · by{' '}
                    <span className="font-mono">{event.actor_id}</span>
                  </Typography>
                </div>
              </div>
              <Typography
                variant="caption"
                className="whitespace-nowrap text-gray-400 shrink-0 pl-4"
              >
                {event.created_at ? new Date(event.created_at).toLocaleString() : '-'}
              </Typography>
            </div>
          ))}
        </div>
      )}
=======
      <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <CustomTable<ActivityRow>
          columns={columns}
          dataSource={dataSource}
          rowClassName={isLoading ? undefined : undefined}
          emptyText="No activity yet — actions like inviting a teammate or updating a setting will show up here."
        />
      </div>
>>>>>>> 5d48ed00e8cb97930fa1441a5492ad09f6452257

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
  );
};

export default TenantActivityFeedTab;
