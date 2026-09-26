import React, { useEffect, useState } from 'react';
import type { TableProps } from 'antd';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import CustomTable from '../shared/ui/table';
import { Loader } from '../shared/ui/loader';
import { Button } from '../shared';
import {
  useLazyGetSessionsListQuery,
  type SessionListItem,
  type SessionsListResponse,
} from '../../api/organization-service/Platform/metrics';
import { formattedDateTime, formatEnumString } from '../../shared/utils/methods';

type SessionRow = SessionListItem & { key: string };

const PAGE_LIMIT = 25;

/**
 * "Active sessions" KPI card's real drill-down — the actual list of live
 * sessions, behind the aggregate number `PlatformOverviewStats` already
 * shows via `StatDetailModal`. Same cursor-based "Load more" shape as
 * `LoginUsersListModal` — see that file's own docstring for why there's no
 * numbered pager here.
 */
const ActiveSessionsListModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [fetchPage, { isFetching }] = useLazyGetSessionsListQuery();
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [meta, setMeta] = useState<SessionsListResponse | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchPage({ limit: PAGE_LIMIT })
      .unwrap()
      .then((result) => {
        if (cancelled) return;
        setRows(result.items.map((item) => ({ ...item, key: item.session_id })));
        setMeta(result);
        setHasLoadedOnce(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoadMore = async () => {
    if (!meta?.next_cursor) return;
    const result = await fetchPage({ limit: PAGE_LIMIT, cursor: meta.next_cursor }).unwrap();
    setRows((prev) => [
      ...prev,
      ...result.items.map((item) => ({ ...item, key: item.session_id })),
    ]);
    setMeta(result);
  };

  const columns: TableProps<SessionRow>['columns'] = [
    {
      title: 'Name',
      key: 'name',
      render: (_: unknown, row: SessionRow) => (
        <span className="font-semibold text-neutral-900">{row.name ?? 'Platform staff'}</span>
      ),
    },
    {
      title: 'Email',
      key: 'email',
      render: (_: unknown, row: SessionRow) => (
        <span className="text-neutral-600">{row.email ?? `ID: ${row.user_id.slice(0, 8)}…`}</span>
      ),
    },
    {
      title: 'Device',
      key: 'device',
      render: (_: unknown, row: SessionRow) => (
        <span className="text-neutral-600">
          {formatEnumString(row.device_type)} · {row.browser} · {row.operating_system}
        </span>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      render: (_: unknown, row: SessionRow) => (
        <span className="text-neutral-600">
          {[row.city, row.country].filter(Boolean).join(', ') || '-'}
        </span>
      ),
    },
    {
      title: 'Last activity',
      key: 'last_activity_at',
      render: (_: unknown, row: SessionRow) => (
        <span className="text-neutral-600">{formattedDateTime(row.last_activity_at)}</span>
      ),
    },
  ];

  return (
    <AntdCommonModal
      open
      onClose={onClose}
      title="Active sessions"
      modalProps={{ width: 880, maskClosable: true }}
    >
      {!hasLoadedOnce ? (
        <Loader />
      ) : meta && !meta.available ? (
        <div className="py-10 text-center text-sm text-neutral-400">
          This data is currently unavailable.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="w-full overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <CustomTable<SessionRow>
              columns={columns}
              dataSource={rows}
              emptyText={
                <div className="py-10 text-center text-sm text-neutral-400">
                  No active sessions right now.
                </div>
              }
            />
          </div>

          <div className="flex items-center justify-between text-sm text-neutral-500">
            <span>
              Showing {rows.length} of {meta?.total ?? 0}
            </span>
            {meta?.next_cursor && (
              <Button
                appname="load more active sessions"
                className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-700 hover:border-primary-300 hover:text-primary-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void handleLoadMore()}
                disabled={isFetching}
              >
                {isFetching ? 'Loading…' : 'Load more'}
              </Button>
            )}
          </div>
        </div>
      )}
    </AntdCommonModal>
  );
};

export default ActiveSessionsListModal;
