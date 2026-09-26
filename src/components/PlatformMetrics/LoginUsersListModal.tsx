import React, { useEffect, useState } from 'react';
import type { TableProps } from 'antd';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import CustomTable from '../shared/ui/table';
import { Loader } from '../shared/ui/loader';
import { Button } from '../shared';
import {
  useLazyGetLoginUsersQuery,
  type LoginUserItem,
  type LoginUsersResponse,
} from '../../api/organization-service/Platform/metrics';
import { formattedDateTime } from '../../shared/utils/methods';

type UserRow = LoginUserItem & { key: string };

const WINDOW_DAYS = 30;
const PAGE_LIMIT = 25;

/**
 * "Monthly active users" KPI card's real drill-down — the actual list of
 * who signed in, behind the aggregate number `PlatformOverviewStats`
 * already shows via `StatDetailModal`. `GET .../logins/users` only exposes
 * an opaque `next_cursor`, not offset/total-pages, so this is "Load more"
 * (appends), never a numbered pager or a jump-to-page.
 */
const LoginUsersListModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [fetchPage, { isFetching }] = useLazyGetLoginUsersQuery();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [meta, setMeta] = useState<LoginUsersResponse | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchPage({ windowDays: WINDOW_DAYS, limit: PAGE_LIMIT })
      .unwrap()
      .then((result) => {
        if (cancelled) return;
        setRows(result.items.map((item) => ({ ...item, key: item.user_id })));
        setMeta(result);
        setHasLoadedOnce(true);
      });
    return () => {
      cancelled = true;
    };
    // Fetches exactly once per modal open — `fetchPage` is stable (RTK
    // Query's lazy trigger), and every subsequent load goes through
    // `handleLoadMore` instead, not a re-run of this effect.
  }, []);

  const handleLoadMore = async () => {
    if (!meta?.next_cursor) return;
    const result = await fetchPage({ limit: PAGE_LIMIT, cursor: meta.next_cursor }).unwrap();
    setRows((prev) => [...prev, ...result.items.map((item) => ({ ...item, key: item.user_id }))]);
    setMeta(result);
  };

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
            <CustomTable<UserRow>
              columns={columns}
              dataSource={rows}
              emptyText={
                <div className="py-10 text-center text-sm text-neutral-400">
                  No sign-ins in this window.
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
                appname="load more monthly active users"
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

export default LoginUsersListModal;
