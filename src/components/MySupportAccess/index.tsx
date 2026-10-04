import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MdOutlineSupportAgent } from 'react-icons/md';
import MainLayout from '../../layouts/MainLayout';
import { Typography, CustomTable, Button, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import {
  useListMySupportAccessGrantsQuery,
  type MySupportAccessGrant,
} from '../../api/organization-service/Platform/supportAccess';
import { useExpiryCountdown } from '../../hooks/useExpiryCountdown';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

type GrantRow = MySupportAccessGrant & { key: string };

const RemainingCell: React.FC<{ expiresAt: string }> = ({ expiresAt }) => {
  const { label, isExpired } = useExpiryCountdown(expiresAt);
  if (isExpired) {
    return <span className="text-gray-400 text-sm">Expired</span>;
  }
  return <span className="font-mono text-sm text-gray-700">{label}</span>;
};

/**
 * A cfp_support platform-staff member's own landing screen — before this,
 * there was no path from login to a granted tenant at all (the "Companies"
 * nav item requires tenant:read, which cfp_support doesn't hold). Lists
 * every tenant this membership currently has a live, time-limited grant
 * into, with a link straight to the same CustomerDashboard/ViewCustomer
 * page a Super Admin uses — read-only there for this role, see that
 * component's own isCfpSupportRole handling.
 */
const MySupportAccess: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useListMySupportAccessGrantsQuery();

  if (error) {
    showToast({
      message: getOrgErrorMessage(error, 'Failed to load your support access grants.'),
      type: 'error',
    });
  }

  const dataSource: GrantRow[] = (data ?? []).map((g) => ({ ...g, key: g.grant_id }));

  return (
    <MainLayout>
      <div className="w-full p-8 pt-16">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
            <MdOutlineSupportAgent size={20} />
          </span>
          <div>
            <Typography variant="h5">My Support Access</Typography>
            <Typography variant="body2" className="text-gray-400 mt-0.5">
              Tenants you currently have time-limited, read-only access to.
            </Typography>
          </div>
        </div>

        {isLoading ? (
          <Loader />
        ) : (
          <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <CustomTable<GrantRow>
              columns={[
                { title: 'Company', dataIndex: 'tenant_name', key: 'tenant_name' },
                {
                  title: 'Granted',
                  key: 'granted_at',
                  render: (_: unknown, row: GrantRow) => (
                    <span className="text-gray-500 text-sm whitespace-nowrap">
                      {new Date(row.granted_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  ),
                },
                {
                  title: 'Time Remaining',
                  key: 'remaining',
                  render: (_: unknown, row: GrantRow) => (
                    <RemainingCell expiresAt={row.expires_at} />
                  ),
                },
                {
                  title: '',
                  key: 'action',
                  render: (_: unknown, row: GrantRow) => (
                    <Button
                      className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => navigate(`/view-company?companyId=${row.tenant_id}`)}
                    >
                      View →
                    </Button>
                  ),
                },
              ]}
              dataSource={dataSource}
              emptyText="No active support access grants. Ask a Super Admin or Admin to grant you access to a company."
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MySupportAccess;
