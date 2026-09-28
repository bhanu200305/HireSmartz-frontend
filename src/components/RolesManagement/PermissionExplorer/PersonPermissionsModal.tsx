import React, { useMemo } from 'react';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';
import { Badge } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import {
  useGetPermissionMatrixQuery,
  type PermissionDetail,
} from '../../../api/organization-service/Roles/permissionMatrix';
import { useGetPermissionCatalogQuery } from '../../../api/organization-service/Roles/permissionCatalog';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
import { flattenPermissionCatalog, roleDisplayName } from './permissionExplorer.helpers';

type PersonPermissionsModalProps = {
  open: boolean;
  onClose: () => void;
  tenantId?: string;
  isMaster: boolean;
  userId: string;
  userName: string;
};

const groupByCategory = (details: PermissionDetail[]): Record<string, PermissionDetail[]> => {
  const groups: Record<string, PermissionDetail[]> = {};
  details.forEach((detail) => {
    if (!groups[detail.category]) groups[detail.category] = [];
    groups[detail.category].push(detail);
  });
  return groups;
};

/**
 * "What can this person do" — opened by clicking a person matched while
 * searching the reference list. GET /v1/roles/permission-matrix?explain=true
 * for a single user, same detail shape (Permission_Details/Denied_Permissions)
 * the old standalone Person Lookup screen rendered.
 */
const PersonPermissionsModal: React.FC<PersonPermissionsModalProps> = ({
  open,
  onClose,
  tenantId,
  isMaster,
  userId,
  userName,
}) => {
  const { data, isLoading, error } = useGetPermissionMatrixQuery(
    {
      tenantId: isMaster ? tenantId : undefined,
      userId,
      explain: true,
    },
    { skip: !open }
  );

  const person = data?.Organization_User_Permissions?.[0]?.Users_Permission?.[0];
  const groups = useMemo(() => groupByCategory(person?.Permission_Details ?? []), [person]);

  const { data: catalog } = useGetPermissionCatalogQuery();
  const catalogByCode = useMemo(() => {
    const map = new Map<string, string>();
    flattenPermissionCatalog(catalog).forEach((entry) => map.set(entry.code, entry.label));
    return map;
  }, [catalog]);

  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title={`Permissions for ${userName}`}
      modalProps={{ width: 640, maskClosable: true }}
    >
      <div className="max-h-[65vh] overflow-y-auto flex flex-col gap-4">
        {isLoading ? (
          <div className="py-10 flex items-center justify-center">
            <Loader />
          </div>
        ) : error ? (
          <p className="text-sm text-danger-solid text-center py-6">
            {getOrgErrorMessage(error, "Failed to load this person's permissions.")}
          </p>
        ) : !person ? (
          <p className="text-sm text-gray-500 text-center py-6">No details found.</p>
        ) : (
          <>
            {person.Email && <p className="text-xs text-gray-500">{person.Email}</p>}

            {Object.keys(groups).length === 0 ? (
              <p className="text-sm text-gray-500">This person holds no permissions.</p>
            ) : (
              Object.keys(groups).map((category) => (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {category}
                  </h4>
                  <div className="flex flex-col divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                    {groups[category].map((detail) => (
                      <div key={detail.code} className="flex flex-col gap-1.5 px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {detail.label}
                          </span>
                          <code className="text-[11px] font-mono text-gray-400 bg-gray-50 rounded px-1.5 py-0.5">
                            {detail.code}
                          </code>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(detail.via_roles ?? []).map((role) => (
                            <Badge key={role} status="neutral" dot={false}>
                              via {roleDisplayName(role)}
                            </Badge>
                          ))}
                          {detail.direct_grant && (
                            <Badge status="info" dot={false}>
                              Individual grant
                            </Badge>
                          )}
                          <Badge status="neutral" dot={false}>
                            {detail.all_locations
                              ? 'All offices'
                              : (detail.locations ?? []).map((l) => l.label).join(', ') ||
                                'No offices'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}

            {(person.Denied_Permissions?.length ?? 0) > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-danger-text uppercase tracking-wide mb-2">
                  Taken away
                </h4>
                <div className="flex items-center gap-1.5 flex-wrap bg-danger-bg/40 border border-danger-bg rounded-xl px-4 py-3">
                  {person.Denied_Permissions?.map((code) => (
                    <Badge key={code} status="danger" dot={false}>
                      {catalogByCode.get(code) ?? code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AntdCommonModal>
  );
};

export default PersonPermissionsModal;
