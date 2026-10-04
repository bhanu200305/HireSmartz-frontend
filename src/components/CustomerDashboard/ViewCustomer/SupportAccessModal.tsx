import React, { useState } from 'react';
import { Select, InputNumber } from 'antd';
import type { TableProps } from 'antd';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';
import CustomTable from '../../shared/ui/table';
import { Button, Typography, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import { useListPlatformStaffQuery } from '../../../api/organization-service/Platform/staff';
import {
  useListSupportAccessGrantsQuery,
  useGrantSupportAccessMutation,
  useRevokeSupportAccessMutation,
  type SupportAccessGrant,
} from '../../../api/organization-service/Platform/supportAccess';
import { useExpiryCountdown } from '../../../hooks/useExpiryCountdown';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';

const DEFAULT_HOURS = 72;
const MAX_HOURS = 720;

type GrantRow = SupportAccessGrant & { key: string };

const RemainingCell: React.FC<{ expiresAt: string }> = ({ expiresAt }) => {
  const { label, isExpired } = useExpiryCountdown(expiresAt);
  return isExpired ? (
    <span className="text-gray-400 text-sm">Expired</span>
  ) : (
    <span className="font-mono text-sm text-gray-700">{label}</span>
  );
};

/**
 * Super Admin/cfp_admin's control for granting a cfp_support staff member
 * time-limited, read-only access into this one tenant — org-service now
 * authorizes a live grant against the platform-mirror routes (profile,
 * departments, offices, users, dashboard, activity, audio-questions,
 * qr-code); this is the UI to create/list/revoke one. Opened from a header
 * button on ViewCustomer, same pattern as CorrectAdminEmailModal/
 * ConfirmationModal there.
 */
const SupportAccessModal: React.FC<{
  tenantId: string;
  companyName: string;
  onClose: () => void;
}> = ({ tenantId, companyName, onClose }) => {
  const [membershipId, setMembershipId] = useState<string | undefined>();
  const [hours, setHours] = useState<number>(DEFAULT_HOURS);

  const { data: grants, isLoading: isLoadingGrants } = useListSupportAccessGrantsQuery(tenantId);
  const { data: staff, isLoading: isLoadingStaff } = useListPlatformStaffQuery();
  const [grantAccess, { isLoading: isGranting }] = useGrantSupportAccessMutation();
  const [revokeAccess, { isLoading: isRevoking }] = useRevokeSupportAccessMutation();

  const supportStaff = (staff ?? []).filter((s) => s.role === 'cfp_support');
  // Someone already holding a live grant here isn't offered again — granting
  // a second one for the same person is never the intent, it's re-extending
  // (revoke the old one first, same as everywhere else in this app "extend"
  // isn't its own operation).
  const alreadyGrantedIds = new Set((grants ?? []).map((g) => g.membership_id));
  const staffOptions = supportStaff
    .filter((s) => !alreadyGrantedIds.has(s.membership_id))
    .map((s) => ({ value: s.membership_id, label: s.email }));

  const handleGrant = async () => {
    if (!membershipId) return;
    try {
      await grantAccess({ tenantId, membership_id: membershipId, hours }).unwrap();
      showToast({ message: 'Support access granted.', type: 'success' });
      setMembershipId(undefined);
      setHours(DEFAULT_HOURS);
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to grant access.'), type: 'error' });
    }
  };

  const handleRevoke = async (grantId: string) => {
    try {
      await revokeAccess({ tenantId, grantId }).unwrap();
      showToast({ message: 'Access revoked.', type: 'success' });
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to revoke access.'), type: 'error' });
    }
  };

  const columns: TableProps<GrantRow>['columns'] = [
    {
      title: 'Support Staff',
      key: 'email',
      render: (_: unknown, row: GrantRow) => (
        <span className="text-gray-800">{row.email ?? row.membership_id}</span>
      ),
    },
    {
      title: 'Time Remaining',
      key: 'remaining',
      render: (_: unknown, row: GrantRow) => <RemainingCell expiresAt={row.expires_at} />,
    },
    {
      title: '',
      key: 'revoke',
      render: (_: unknown, row: GrantRow) => (
        <Button
          className="rounded-full border border-red-300 text-red-600 px-4 py-1 text-sm hover:bg-red-50"
          disabled={isRevoking}
          onClick={() => handleRevoke(row.grant_id)}
        >
          Revoke
        </Button>
      ),
    },
  ];

  const dataSource: GrantRow[] = (grants ?? []).map((g) => ({ ...g, key: g.grant_id }));

  return (
    <AntdCommonModal
      open
      onClose={onClose}
      title="Support Access"
      subtitle={companyName}
      modalProps={{ width: 620, maskClosable: true }}
    >
      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <Typography variant="body2" className="text-gray-600 mb-3 block">
            Grant a cfp_support staff member time-limited, read-only access to this company.
          </Typography>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label htmlFor="support-access-staff" className="text-xs text-gray-500 mb-1 block">
                Support Staff Member
              </label>
              <Select
                id="support-access-staff"
                className="w-full"
                placeholder={isLoadingStaff ? 'Loading…' : 'Select a support staff member'}
                loading={isLoadingStaff}
                value={membershipId}
                onChange={setMembershipId}
                options={staffOptions}
                showSearch
                optionFilterProp="label"
                notFoundContent={
                  supportStaff.length === 0
                    ? 'No cfp_support staff members exist yet.'
                    : 'Everyone with the cfp_support role already has a live grant here.'
                }
              />
            </div>
            <div>
              <label htmlFor="support-access-hours" className="text-xs text-gray-500 mb-1 block">
                Hours (default 72)
              </label>
              <InputNumber
                id="support-access-hours"
                className="w-28"
                min={1}
                max={MAX_HOURS}
                value={hours}
                onChange={(value) => setHours(value ?? DEFAULT_HOURS)}
              />
            </div>
            <Button
              className="rounded-full bg-button text-white px-5 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!membershipId || isGranting}
              onClick={handleGrant}
            >
              {isGranting ? 'Granting…' : 'Grant Access'}
            </Button>
          </div>
        </div>

        <div>
          <Typography variant="h6" className="mb-2 block">
            Current Grants
          </Typography>
          {isLoadingGrants ? (
            <Loader />
          ) : (
            <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
              <CustomTable<GrantRow>
                columns={columns}
                dataSource={dataSource}
                emptyText="No one currently has support access to this company."
              />
            </div>
          )}
        </div>
      </div>
    </AntdCommonModal>
  );
};

export default SupportAccessModal;
