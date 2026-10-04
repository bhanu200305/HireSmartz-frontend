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
  useLazyGetLoginUsersQuery,
  type LoginUserItem,
  type LoginUsersResponse,
} from '../../api/organization-service/Platform/metrics';
import { formattedDateTime } from '../../shared/utils/methods';

type UserRow = LoginUserItem & { key: string };

const WINDOW_DAYS = 30;
const DEFAULT_PAGE_SIZE = 10;

/**
 * "Monthly active users" KPI card's real drill-down — the actual list of
 * who signed in, behind the aggregate number `PlatformOverviewStats`
 * already shows via `StatDetailModal`. `GET .../logins/users` only exposes
 * an opaque `next_cursor`, not offset/total-pages, so this is "Load more"
 * (appends), never a numbered pager or a jump-to-page.
 */
const LoginUsersListModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [fetchPage, { isFetching }] = useLazyGetLoginUsersQuery();
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<UserRow[]>([]);
  const [meta, setMeta] = useState<LoginUsersResponse | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHasLoadedOnce(false);
    setLoadError(false);
    void fetchPage({ windowDays: WINDOW_DAYS, limit: pageSize })
      .unwrap()
      .then((result) => {
        if (cancelled) return;
        setRows(result.items.map((item) => ({ ...item, key: item.user_id })));
        setMeta(result);
        setHasLoadedOnce(true);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Failed to load monthly active users', error);
        setLoadError(true);
        setHasLoadedOnce(true);
      });
    return () => {
      cancelled = true;
    };
    // Re-fetches a fresh first page whenever `pageSize` changes (the "Rows
    // per page" control) — `fetchPage` is stable (RTK Query's lazy
    // trigger), and every subsequent load goes through `handleLoadMore`
    // instead, not a re-run of this effect.
  }, [pageSize]);

  const handleLoadMore = async () => {
    if (!meta?.next_cursor) return;
    try {
      const result = await fetchPage({ limit: pageSize, cursor: meta.next_cursor }).unwrap();
      setRows((prev) => [...prev, ...result.items.map((item) => ({ ...item, key: item.user_id }))]);
      setMeta(result);
    } catch (error) {
      console.error('Failed to load more monthly active users', error);
    }
  };

  // Client-side only, over rows already loaded via "Load more" — the
  // backend's own `/platform/metrics/logins/users` has no search param yet
  // (auth-service's login-event rows carry only a `user_id`; this service
  // enriches each with a name/email from its OWN directory AFTER the page
  // comes back, so a real search needs backend work: resolving a name/email
  // match against that directory FIRST, then asking auth-service to page
  // within just those ids). This searches what's on screen honestly rather
  // than pretending to search everything until that lands.
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) => row.name?.toLowerCase().includes(q) || row.email?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const columns: TableProps<UserRow>['columns'] = [
    {
      title: 'Name',
      key: 'name',
      render: (_: unknown, row: UserRow) => (
        <span className="font-semibold text-neutral-900">{row.name ?? 'Platform staff'}</span>
      ),
    },
    {
      title: 'Email',
      key: 'email',
      render: (_: unknown, row: UserRow) => (
        <span className="text-neutral-600">{row.email ?? `ID: ${row.user_id.slice(0, 8)}…`}</span>
      ),
    },
    {
      title: 'Sign-ins',
      dataIndex: 'login_count',
      key: 'login_count',
      align: 'center',
    },
    {
      title: 'Last sign-in',
      key: 'last_login_at',
      render: (_: unknown, row: UserRow) => (
        <span className="text-neutral-600">{formattedDateTime(row.last_login_at)}</span>
      ),
    },
  ];

  return (
    <AntdCommonModal
      open
      onClose={onClose}
      title="Monthly active users"
      subtitle={
        meta?.window_start && meta?.window_end
          ? `${formattedDateTime(meta.window_start)} – ${formattedDateTime(meta.window_end)}`
          : undefined
      }
      modalProps={{ width: 780, maskClosable: true }}
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
                appname="monthly active users modal"
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
            <CustomTable<UserRow>
              columns={columns}
              dataSource={filteredRows}
              scrollY="100%"
              scrollX={false}
              emptyText={
                <div className="py-10 text-center text-sm text-neutral-400">
                  {search ? 'No loaded rows match that search.' : 'No sign-ins in this window.'}
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
                appname="load more monthly active users"
                className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-700 hover:border-primary-300 hover:text-primary-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void handleLoadMore()}
                disabled={isFetching}
              >
                {isFetching ? 'Loading…' : 'Load More'}
              </Button>
            )}
          </div>
        </div>
      )}
    </AntdCommonModal>
  );
};

export default LoginUsersListModal;
