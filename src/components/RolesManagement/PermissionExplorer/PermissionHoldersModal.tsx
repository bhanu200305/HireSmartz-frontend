import React, { useMemo } from 'react';
import type { TableProps } from 'antd';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';
import CustomTable from '../../shared/ui/table';
import { Badge } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import {
  useGetPermissionMatrixQuery,
  useGetCrossOrgPermissionMatrixQuery,
} from '../../../api/organization-service/Roles/permissionMatrix';
import { usePlatformPermissionMatrix } from './usePlatformPermissionMatrix';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
import {
  flattenMatrixResponses,
  roleDisplayName,
  type TaggedMatrixUser,
} from './permissionExplorer.helpers';

type HolderRow = TaggedMatrixUser & { key: string };

type PermissionHoldersModalProps = {
  open: boolean;
  onClose: () => void;
  tenantId?: string;
  isMaster: boolean;
  /** True when opened from the CFP-staff tier (not one client company) —
   * sources holders from CFP staff (`usePlatformPermissionMatrix`) MERGED
   * with a cross-org search of every client company
   * (`useGetCrossOrgPermissionMatrixQuery`), rather than the tenant-scoped
   * `GET /v1/roles/permission-matrix`, which a platform caller with no
   * single `tenant_id` to send would just 422 on. */
  platformScope?: boolean;
  code: string;
  label: string;
};

/**
 * "Who has this permission" — opened by clicking a permission in the
 * reference list. GET /v1/roles/permission-matrix scoped to a single code;
 * `tenantId` is only ever sent for a Super Admin session (a Company Admin's
 * own company is read off their token server-side, same rule every other
 * permission-matrix call in this app follows). Same list-in-a-modal shape as
 * `TeamMembersListModal` (a bordered `CustomTable`), rather than hand-rolled
 * rows, so this reads like the rest of the app.
 */
const PermissionHoldersModal: React.FC<PermissionHoldersModalProps> = ({
  open,
  onClose,
  tenantId,
  isMaster,
  platformScope = false,
  code,
  label,
}) => {
  const tenantResult = useGetPermissionMatrixQuery(
    {
      tenantId: isMaster ? tenantId : undefined,
      codes: [code],
      limit: 200,
    },
    { skip: !open || platformScope }
  );
  const platformStaffResult = usePlatformPermissionMatrix(
    { codes: [code] },
    !open || !platformScope
  );
  const crossOrgResult = useGetCrossOrgPermissionMatrixQuery(
    { codes: [code], limit: 200 },
    { skip: !open || !platformScope }
  );

  const isLoading = platformScope
    ? platformStaffResult.isLoading || crossOrgResult.isLoading
    : tenantResult.isLoading;
  const error = platformScope
    ? (platformStaffResult.error ?? crossOrgResult.error)
    : tenantResult.error;

  const users = useMemo(
    () =>
      platformScope
        ? flattenMatrixResponses(platformStaffResult.data, crossOrgResult.data)
        : flattenMatrixResponses(tenantResult.data),
    [platformScope, platformStaffResult.data, crossOrgResult.data, tenantResult.data]
  );
  const totalUsers = platformScope
    ? users.length
    : (tenantResult.data?.total_users ?? users.length);

  // Explicit per-column widths — see CandidatesListModal.tsx's identical
  // comment on why `scroll.x: 'max-content'` alone isn't reliable here.
  const columns: TableProps<HolderRow>['columns'] = [
    {
      title: 'Name',
      key: 'name',
      minWidth: 180,
      render: (_: unknown, row: HolderRow) => (
        <span className="font-semibold text-gray-900">{row.User_Name}</span>
      ),
    },
    // Only meaningful once results can span more than one organization —
    // a single company's own holders list has nothing to distinguish here.
    ...(platformScope
      ? [
          {
            title: 'Organization',
            key: 'organization',
            minWidth: 180,
            render: (_: unknown, row: HolderRow) => (
              <span className="text-gray-700">{row.organizationName}</span>
            ),
          },
        ]
      : []),
    {
      title: 'Email',
      dataIndex: 'Email',
      key: 'email',
      minWidth: 220,
      render: (email: string | undefined) => email ?? '-',
    },
    {
      title: 'Roles',
      key: 'roles',
      minWidth: 220,
      render: (_: unknown, row: HolderRow) => {
        const roleNames = Array.from(
          new Set((row.Location_Permission ?? []).flatMap((lp) => lp.Roles ?? []))
        );
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {roleNames.length === 0 ? (
              <span className="text-gray-300">-</span>
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
      title: 'Status',
      key: 'status',
      minWidth: 130,
      render: (_: unknown, row: HolderRow) => (
        <Badge status={row.Is_Active ? 'success' : 'neutral'}>
          {row.Is_Active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  const dataSource: HolderRow[] = users.map((user) => ({
    ...user,
    key: `${user.organizationId}-${user.User_Id}`,
  }));

  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title={`Who has "${label}"`}
      subtitle={<code className="text-xs font-mono text-gray-400">{code}</code>}
      modalProps={{ width: 720, maskClosable: true }}
      fillHeight
    >
      {isLoading ? (
        <div className="py-10 flex items-center justify-center">
          <Loader />
        </div>
      ) : error ? (
        <p className="text-sm text-danger-solid text-center py-6">
          {getOrgErrorMessage(error, 'Failed to load who has this permission.')}
        </p>
      ) : (
        <div className="flex min-h-0 flex-auto flex-col gap-2">
          <p className="shrink-0 text-xs text-gray-400">
            {totalUsers} {totalUsers === 1 ? 'person' : 'people'}
          </p>
          <div className="w-full min-h-0 flex-auto overflow-hidden rounded-xl border border-gray-200 bg-white flex">
            <CustomTable<HolderRow>
              columns={columns}
              dataSource={dataSource}
              scrollY="100%"
              emptyText={
                <div className="py-8 text-center text-sm text-gray-400">
                  Nobody currently has this.
                </div>
              }
            />
          </div>
        </div>
      )}
    </AntdCommonModal>
  );
};

export default PermissionHoldersModal;
