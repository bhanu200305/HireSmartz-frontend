import React, { useEffect, useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import { CustomTable, Badge, Search, Select } from '../../shared';
import MasterPagination from '../../shared/ui/MasterPagination';
import { Loader } from '../../shared/ui/loader';
import { useDebouncedEffect } from '../../../hooks/useDebouncedEffect';
import {
  useGetPermissionMatrixQuery,
  type MatrixUser,
} from '../../../api/organization-service/Roles/permissionMatrix';
import { useGetPermissionCatalogQuery } from '../../../api/organization-service/Roles/permissionCatalog';
import { getOrgErrorCode, getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
import { flattenPermissionCatalog, roleDisplayName } from './permissionExplorer.helpers';
import PermissionChipSelect from './PermissionChipSelect';

type AccessRow = MatrixUser & { key: string };
type AccessColumn = NonNullable<TableProps<AccessRow>['columns']>[number];

const PAGE_LIMIT = 20;

type WhoHasAccessTabProps = {
  tenantId?: string;
  isMaster: boolean;
  availableLocations: { id: string; name: string }[];
  /** Pre-selected from Permission Usage's "click a row" action. Consumed once. */
  initialCode?: string;
};

/**
 * The narrowing search: pick one or more permission chips, All/Any, an
 * office, and a name/email filter, and see exactly who matches — GET
 * /v1/roles/permission-matrix with `code=`/`match=`/`location_id=`/`q=`.
 */
const WhoHasAccessTab: React.FC<WhoHasAccessTabProps> = ({
  tenantId,
  isMaster,
  availableLocations,
  initialCode,
}) => {
  const { data: catalog } = useGetPermissionCatalogQuery();
  const chipOptions = useMemo(
    () =>
      flattenPermissionCatalog(catalog).map((entry) => ({ code: entry.code, label: entry.label })),
    [catalog]
  );

  const [selectedCodes, setSelectedCodes] = useState<string[]>(initialCode ? [initialCode] : []);
  const [match, setMatch] = useState<'all' | 'any'>('all');
  const [locationId, setLocationId] = useState<string | undefined>(undefined);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (initialCode) setSelectedCodes([initialCode]);
    // Only meant to seed the initial selection once, on arrival from Screen 2.
  }, [initialCode]);

  useDebouncedEffect(
    () => {
      setDebouncedQ(q);
      setPage(0);
    },
    [q],
    300
  );

  const skip = (isMaster && !tenantId) || selectedCodes.length === 0;

  const { data, isLoading, isFetching, error } = useGetPermissionMatrixQuery(
    {
      tenantId,
      codes: selectedCodes,
      match,
      locationId,
      q: debouncedQ || undefined,
      limit: PAGE_LIMIT,
      offset: page * PAGE_LIMIT,
    },
    { skip }
  );

  const errorCode = getOrgErrorCode(error);
  useEffect(() => {
    if (errorCode === 'PERMISSION_NOT_FOUND' && selectedCodes.length > 0) {
      // Drop the offending chip and let the next render retry with what's left.
      setSelectedCodes((prev) => prev.slice(0, -1));
    } else if (error && (error as { status?: unknown }).status === 404 && locationId) {
      setLocationId(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorCode]);

  const users = useMemo(
    () => data?.Organization_User_Permissions.flatMap((org) => org.Users_Permission) ?? [],
    [data]
  );

  const columns: AccessColumn[] = [
    {
      title: 'Name',
      key: 'name',
      render: (_: unknown, row: AccessRow) => (
        <span className="text-sm font-semibold text-gray-900">{row.User_Name}</span>
      ),
    },
    {
      title: 'Email',
      key: 'email',
      render: (_: unknown, row: AccessRow) => (
        <span className="text-sm text-gray-600">{row.Email ?? '-'}</span>
      ),
    },
    {
      title: 'Roles',
      key: 'roles',
      render: (_: unknown, row: AccessRow) => {
        const roleNames = Array.from(new Set(row.Location_Permission.flatMap((lp) => lp.Roles)));
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {roleNames.length === 0 ? (
              <span className="text-gray-300 text-sm">-</span>
            ) : (
              roleNames.map((name) => (
                <Badge key={name} status="neutral" dot={false}>
                  {roleDisplayName(name)}
                </Badge>
              ))
            )}
          </div>
        );
      },
    },
    {
      title: 'Active',
      key: 'active',
      render: (_: unknown, row: AccessRow) => (
        <Badge status={row.Is_Active ? 'success' : 'neutral'}>
          {row.Is_Active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  const dataSource: AccessRow[] = users.map((user) => ({ ...user, key: user.User_Id }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 bg-gray-50/50 border border-gray-200 rounded-xl p-4">
        <PermissionChipSelect
          options={chipOptions}
          selected={selectedCodes}
          onChange={(next) => {
            setSelectedCodes(next);
            setPage(0);
          }}
          counts={data?.permission_counts}
          placeholder="Add a permission to narrow the search…"
        />

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => {
                setMatch('all');
                setPage(0);
              }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md cursor-pointer ${
                match === 'all' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'
              }`}
            >
              Holds all
            </button>
            <button
              type="button"
              onClick={() => {
                setMatch('any');
                setPage(0);
              }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md cursor-pointer ${
                match === 'any' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'
              }`}
            >
              Holds any
            </button>
          </div>

          <div className="w-52">
            <Select
              appname="access office filter"
              placeholder="All offices"
              value={locationId}
              options={availableLocations.map((location) => ({
                label: location.name,
                value: location.id,
              }))}
              onChange={(value) => {
                setLocationId(value || undefined);
                setPage(0);
              }}
            />
          </div>

          <Search
            appname="access name search"
            placeholder="Name or email…"
            value={q}
            allowClear
            onSearch={setQ}
            className="flex-1 min-w-[200px]"
          />
        </div>
      </div>

      {selectedCodes.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
          <p className="text-sm text-gray-500">
            Add at least one permission above to see who holds it.
          </p>
        </div>
      ) : isLoading || isFetching ? (
        <div className="py-16 flex items-center justify-center">
          <Loader />
        </div>
      ) : error && errorCode !== 'PERMISSION_NOT_FOUND' ? (
        <div className="py-16 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
          <p className="text-sm text-danger-solid">
            {getOrgErrorMessage(error, 'Failed to load matching people.')}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold text-gray-700">
            {data?.total_users ?? 0} {data?.total_users === 1 ? 'person' : 'people'}
          </p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <CustomTable<AccessRow>
              columns={columns}
              dataSource={dataSource}
              emptyText={
                <div className="py-8 text-center text-sm text-gray-400">
                  No one matches these filters.
                </div>
              }
            />
          </div>
          <MasterPagination
            current={page + 1}
            pageSize={PAGE_LIMIT}
            total={data?.total_users ?? 0}
            itemLabel="people"
            onPageChange={(nextPage) => setPage(nextPage - 1)}
          />
        </>
      )}
    </div>
  );
};

export default WhoHasAccessTab;
