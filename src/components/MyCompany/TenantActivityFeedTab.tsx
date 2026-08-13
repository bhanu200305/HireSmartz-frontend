import React, { useEffect, useState } from 'react';
import { LuSquareActivity } from 'react-icons/lu';
import { Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import MasterPagination from '../shared/ui/MasterPagination';
import { useListTenantActivityQuery } from '../../api/organization-service/Tenants/profile';
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

/**
 * GET /v1/tenants/{tenant_id}/activity — this tenant's own admin activity
 * log (invites, role grants, profile/office/department edits, …). Real data
 * only: an empty page says so plainly rather than inventing a placeholder
 * entry. Same list also backs the Dashboard's "recent activity" preview
 * per docs/frontend_guide.txt — this is the full, paginated version of it.
 */
const TenantActivityFeedTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [page, setPage] = useState(0);
  const { data, isLoading, error } = useListTenantActivityQuery({
    tenantId,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  useEffect(() => {
    if (error) {
      showToast({ message: getOrgErrorMessage(error, 'Failed to load activity.'), type: 'error' });
    }
  }, [error]);

  const events = data?.events ?? [];

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <LuSquareActivity className="text-xl" />
        <Typography variant="h5">Activity</Typography>
      </div>
      <Typography variant="body2" className="mb-6 block">
        Who did what in your company, and when.
      </Typography>

      {isLoading ? (
        <Loader />
      ) : events.length === 0 ? (
        <div className="p-10 text-center text-gray-500 border border-dashed rounded-xl">
          No activity yet — actions like inviting a teammate or updating a setting will show up
          here.
        </div>
      ) : (
        <div className="divide-y border rounded-xl overflow-hidden">
          {events.map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-4 p-3">
              <div>
                <Typography variant="body1">{describeAction(event.action)}</Typography>
                <Typography variant="caption">
                  {event.target_type} · by {event.actor_id}
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
  );
};

export default TenantActivityFeedTab;
