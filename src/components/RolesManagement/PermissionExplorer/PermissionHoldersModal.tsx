import React, { useMemo } from 'react';
import type { TableProps } from 'antd';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';
import CustomTable from '../../shared/ui/table';
import { Badge } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import {
  useGetPermissionMatrixQuery,
  type MatrixUser,
} from '../../../api/organization-service/Roles/permissionMatrix';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
import { roleDisplayName } from './permissionExplorer.helpers';

type HolderRow = MatrixUser & { key: string };

type PermissionHoldersModalProps = {
  open: boolean;
  onClose: () => void;
  tenantId?: string;
  isMaster: boolean;
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
  code,
  label,
}) => {
  const { data, isLoading, error } = useGetPermissionMatrixQuery(
    {
      tenantId: isMaster ? tenantId : undefined,
      codes: [code],
      limit: 200,
    },
    { skip: !open }
  );

  const users = useMemo(
    () => data?.Organization_User_Permissions?.flatMap((org) => org.Users_Permission ?? []) ?? [],
    [data]
  );

  const columns: TableProps<HolderRow>['columns'] = [
    {
      title: 'Name',
      key: 'name',
      render: (_: unknown, row: HolderRow) => (
        <span className="font-semibold text-gray-900">{row.User_Name}</span>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'Email',
      key: 'email',
      render: (email: string | undefined) => email ?? '-',
    },
    {
      title: 'Roles',
      key: 'roles',
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
      render: (_: unknown, row: HolderRow) => (
        <Badge status={row.Is_Active ? 'success' : 'neutral'}>
          {row.Is_Active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  const dataSource: HolderRow[] = users.map((user) => ({ ...user, key: user.User_Id }));

  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title={`Who has "${label}"`}
      subtitle={<code className="text-xs font-mono text-gray-400">{code}</code>}
      modalProps={{ width: 720, maskClosable: true }}
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
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-400">
            {data?.total_users ?? users.length}{' '}
            {(data?.total_users ?? users.length) === 1 ? 'person' : 'people'}
          </p>
          <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
            <CustomTable<HolderRow>
              columns={columns}
              dataSource={dataSource}
              scrollY="45vh"
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
