import React, { useMemo } from 'react';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';
import { Badge } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import { useGetPermissionMatrixQuery } from '../../../api/organization-service/Roles/permissionMatrix';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
import { roleDisplayName } from './permissionExplorer.helpers';

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
 * permission-matrix call in this app follows).
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
    () => data?.Organization_User_Permissions.flatMap((org) => org.Users_Permission) ?? [],
    [data]
  );

  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title={`Who has "${label}"`}
      subtitle={<code className="text-xs font-mono text-gray-400">{code}</code>}
    >
      <div className="max-h-[60vh] overflow-y-auto">
        {isLoading ? (
          <div className="py-10 flex items-center justify-center">
            <Loader />
          </div>
        ) : error ? (
          <p className="text-sm text-danger-solid text-center py-6">
            {getOrgErrorMessage(error, 'Failed to load who has this permission.')}
          </p>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">Nobody currently has this.</p>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3">
              {data?.total_users ?? users.length}{' '}
              {(data?.total_users ?? users.length) === 1 ? 'person' : 'people'}
            </p>
            <div className="flex flex-col divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
              {users.map((user) => {
                const roleNames = Array.from(
                  new Set(user.Location_Permission.flatMap((lp) => lp.Roles))
                );
                return (
                  <div
                    key={user.User_Id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {user.User_Name}
                      </div>
                      {user.Email && (
                        <div className="text-xs text-gray-500 truncate">{user.Email}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {roleNames.map((name) => (
                        <Badge key={name} status="neutral" dot={false}>
                          {roleDisplayName(name)}
                        </Badge>
                      ))}
                      <Badge status={user.Is_Active ? 'success' : 'neutral'}>
                        {user.Is_Active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AntdCommonModal>
  );
};

export default PermissionHoldersModal;
