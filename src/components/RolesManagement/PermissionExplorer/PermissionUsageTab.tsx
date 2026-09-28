import React, { useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import { CustomTable, Badge, Select } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import { useGetPermissionMatrixQuery } from '../../../api/organization-service/Roles/permissionMatrix';
import type { PermissionUsage } from '../../../api/organization-service/Roles/permissionMatrix';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
import { roleDisplayName } from './permissionExplorer.helpers';

type UsageRow = PermissionUsage & { key: string };
type UsageColumn = NonNullable<TableProps<UsageRow>['columns']>[number];

type PermissionUsageTabProps = {
  tenantId?: string;
  isMaster: boolean;
  availableLocations: { id: string; name: string }[];
  /** Jump to the Who Has Access tab with this code pre-selected. */
  onViewHolders: (code: string) => void;
};

/**
 * "How many people have each permission" — GET /v1/roles/permission-matrix
 * with `include_usage=true`. `limit=1` per the spec: this screen only needs
 * `permission_usage`/`permission_counts`, not the people list itself.
 */
const PermissionUsageTab: React.FC<PermissionUsageTabProps> = ({
  tenantId,
  isMaster,
  availableLocations,
  onViewHolders,
}) => {
  const [locationId, setLocationId] = useState<string | undefined>(undefined);
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const [onlySensitive, setOnlySensitive] = useState(false);

  const skip = isMaster && !tenantId;
  const { data, isLoading, error } = useGetPermissionMatrixQuery(
    { tenantId, includeUsage: true, locationId, limit: 1 },
    { skip }
  );

  const usage = useMemo(() => data?.permission_usage ?? [], [data]);

  const filtered = useMemo(
    () =>
      usage.filter(
        (row) => (!onlyEmpty || row.holder_count === 0) && (!onlySensitive || row.sensitive)
      ),
    [usage, onlyEmpty, onlySensitive]
  );

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.holder_count - a.holder_count),
    [filtered]
  );

  const columns: UsageColumn[] = [
    {
      title: 'Permission',
      key: 'label',
      render: (_: unknown, row: UsageRow) => (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900">{row.label}</span>
          <code className="text-[11px] font-mono text-gray-400 bg-gray-50 rounded px-1.5 py-0.5">
            {row.code}
          </code>
          {row.sensitive && (
            <Badge status="warning" dot={false}>
              Sensitive
            </Badge>
          )}
        </div>
      ),
    },
    {
      title: 'Holders',
      key: 'holder_count',
      render: (_: unknown, row: UsageRow) => (
        <button
          type="button"
          onClick={() => onViewHolders(row.code)}
          className="text-sm font-semibold text-primary-600 hover:underline cursor-pointer disabled:no-underline disabled:cursor-default disabled:text-gray-400"
          disabled={row.holder_count === 0}
        >
          {row.holder_count}
        </button>
      ),
    },
    {
      title: 'Granted by',
      key: 'roles',
      render: (_: unknown, row: UsageRow) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          {row.roles.length === 0 ? (
            <span className="text-gray-300 text-sm">-</span>
          ) : (
            row.roles.map((role) => (
              <Badge key={role.role_id} status="neutral" dot={false}>
                {roleDisplayName(role.name)} ({role.holder_count})
              </Badge>
            ))
          )}
        </div>
      ),
    },
    {
      title: 'Individual grants',
      key: 'direct_grant_count',
      render: (_: unknown, row: UsageRow) => (
        <span className="text-sm text-gray-600">{row.direct_grant_count}</span>
      ),
    },
  ];

  const dataSource: UsageRow[] = sorted.map((row) => ({ ...row, key: row.code }));

  if (skip) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
        <p className="text-sm text-gray-500">Select a company above to see permission usage.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
        <p className="text-sm text-danger-solid">
          {getOrgErrorMessage(error, 'Failed to load permission usage.')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setOnlyEmpty((prev) => !prev)}
          className={`text-xs font-semibold rounded-full px-3 py-1.5 cursor-pointer transition-colors ${
            onlyEmpty ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Nobody has this
        </button>
        <button
          type="button"
          onClick={() => setOnlySensitive((prev) => !prev)}
          className={`text-xs font-semibold rounded-full px-3 py-1.5 cursor-pointer transition-colors ${
            onlySensitive
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Sensitive
        </button>

        <div className="ml-auto w-52">
          <Select
            appname="usage office filter"
            placeholder="All offices"
            value={locationId}
            options={availableLocations.map((location) => ({
              label: location.name,
              value: location.id,
            }))}
            onChange={(value) => setLocationId(value || undefined)}
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <CustomTable<UsageRow>
          columns={columns}
          dataSource={dataSource}
          emptyText={
            <div className="py-8 text-center text-sm text-gray-400">
              No permissions match these filters.
            </div>
          }
        />
      </div>
    </div>
  );
};

export default PermissionUsageTab;
