import React, { useEffect, useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import CustomTable from '../shared/ui/table';
import { Loader } from '../shared/ui/loader';
import { Button } from '../shared';
import { Search } from '../shared/ui/search';
import { RowsPerPageSelect } from '../shared/ui/RowsPerPageSelect';
import { PAGE_SIZE_OPTIONS } from '../../constants/app.constants';
import {
  useLazyGetSessionsListQuery,
  type SessionListItem,
  type SessionsListResponse,
} from '../../api/organization-service/Platform/metrics';
import { formattedDateTime, formatEnumString } from '../../shared/utils/methods';

type SessionRow = SessionListItem & { key: string };

const DEFAULT_PAGE_SIZE = 10;

/**
 * "Active sessions" KPI card's real drill-down — the actual list of live
 * sessions, behind the aggregate number `PlatformOverviewStats` already
 * shows via `StatDetailModal`. Same cursor-based "Load more" shape as
 * `LoginUsersListModal` — see that file's own docstring for why there's no
 * numbered pager here.
 */
const ActiveSessionsListModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [fetchPage, { isFetching }] = useLazyGetSessionsListQuery();
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [meta, setMeta] = useState<SessionsListResponse | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHasLoadedOnce(false);
    setLoadError(false);
    void fetchPage({ limit: pageSize })
      .unwrap()
      .then((result) => {
        if (cancelled) return;
        setRows(result.items.map((item) => ({ ...item, key: item.session_id })));
        setMeta(result);
        setHasLoadedOnce(true);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Failed to load active sessions', error);
        setLoadError(true);
        setHasLoadedOnce(true);
      });
    return () => {
      cancelled = true;
    };
    // Re-fetches a fresh first page whenever `pageSize` changes (the "Rows
    // per page" control) — every subsequent load goes through
    // `handleLoadMore` instead, not a re-run of this effect.
  }, [pageSize]);

  const handleLoadMore = async () => {
    if (!meta?.next_cursor) return;
    try {
      const result = await fetchPage({ limit: pageSize, cursor: meta.next_cursor }).unwrap();
      setRows((prev) => [
        ...prev,
        ...result.items.map((item) => ({ ...item, key: item.session_id })),
      ]);
      setMeta(result);
    } catch (error) {
      console.error('Failed to load more active sessions', error);
    }
  };

  // Client-side only, over rows already loaded — same backend limitation
  // and same reasoning as `LoginUsersListModal`'s own `filteredRows` (see
  // its comment): `/platform/metrics/sessions/list` has no search param
  // yet either.
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) => row.name?.toLowerCase().includes(q) || row.email?.toLowerCase().includes(q)
    );
  }, [rows, search]);

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
      fillHeight
    >
      {!hasLoadedOnce ? (
        <Loader />
      ) : loadError ? (
        <div className="py-10 text-center text-sm text-neutral-400">
          Something went wrong loading this data. Please try again.
        </div>
      ) : meta && !meta.available ? (
        <div className="py-10 text-center text-sm text-neutral-400">
          This data is currently unavailable.
        </div>
      ) : (
        <div className="flex min-h-0 flex-auto flex-col gap-3">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Search
                appname="active sessions modal"
                placeholder="Search loaded rows..."
                value={search}
                allowClear
                onSearch={setSearch}
              />
            </div>
          </div>

          <div className="shrink-0">
            <RowsPerPageSelect
              pageSize={pageSize}
              options={PAGE_SIZE_OPTIONS}
              onChange={setPageSize}
            />
          </div>

          <div className="w-full min-h-0 flex-auto overflow-hidden rounded-xl border border-neutral-200 bg-white flex">
            <CustomTable<SessionRow>
              columns={columns}
              dataSource={filteredRows}
              scrollY="100%"
              scrollX={false}
              emptyText={
                <div className="py-10 text-center text-sm text-neutral-400">
                  {search ? 'No loaded rows match that search.' : 'No active sessions right now.'}
                </div>
              }
            />
          </div>

          <div className="flex shrink-0 items-center justify-between text-sm text-neutral-500">
            <span>
              {search
                ? `Showing ${filteredRows.length} of ${rows.length} loaded`
                : `Showing ${rows.length} of ${meta?.total ?? 0}`}
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
