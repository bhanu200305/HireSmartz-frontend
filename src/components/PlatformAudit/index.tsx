import React, { useEffect, useState } from 'react';
import { LuSquareActivity } from 'react-icons/lu';
import MainLayout from '../../layouts/MainLayout';
import { Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import MasterPagination from '../shared/ui/MasterPagination';
import { useListAuditEventsQuery } from '../../api/organization-service/Platform/audit';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

const PAGE_SIZE = 25;

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
 */
const PlatformAudit: React.FC = () => {
  const [page, setPage] = useState(0);
  const { data, isLoading, error } = useListAuditEventsQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  useEffect(() => {
    if (error) {
      showToast({ message: getOrgErrorMessage(error, 'Failed to load audit log.'), type: 'error' });
    }
  }, [error]);

  const events = data?.events ?? [];

  return (
    <MainLayout>
      <div className="w-full p-8 pt-16">
        <div className="flex items-center space-x-2 mb-6">
          <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
            <LuSquareActivity size={18} />
          </span>
          <h2 className="font-display text-xl font-bold text-gray-900">Audit Log</h2>
        </div>

        {isLoading ? (
          <Loader />
        ) : events.length === 0 ? (
          <div className="p-10 text-center text-gray-500 border border-dashed border-neutral-200 rounded-xl bg-neutral-50">
            No Super Admin actions recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden bg-white">
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
                    {event.target_type} · by {event.actor_id}
                    {event.tenant_id ? ` · tenant ${event.tenant_id}` : ''}
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
