import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ChartCard } from '../shared';
import { RootState } from '../../redux/provider/store';
import {
  useListSuppressedInviteAddressesQuery,
  useListRecentlyOffboardedMembersQuery,
} from '../../api/organization-service/Tenants/deliveryAccess';

const formatDate = (isoDate: string | null): string =>
  isoDate
    ? new Date(isoDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '-';

/**
 * 2.3 "Delivery & access" — Bounced/suppressed invite addresses and
 * recently offboarded members, both real (`GET /v1/tenants/{tenant_id}
 * /invitations/suppressed` and `/users/recently-offboarded`), scoped to
 * this tenant via the caller's own JWT — same pattern as everything else
 * on this page.
 */
const DeliveryAccessSection: React.FC = () => {
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);
  const { data: suppressed, isLoading: isSuppressedLoading } =
    useListSuppressedInviteAddressesQuery(tenantId ?? '', { skip: !tenantId });
  const { data: offboarded, isLoading: isOffboardedLoading } =
    useListRecentlyOffboardedMembersQuery(tenantId ?? '', { skip: !tenantId });

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <ChartCard
        title="Bounced or Suppressed Invite Addresses"
        subtitle="Invite emails that could not be delivered, or should no longer be emailed"
        isLoading={isSuppressedLoading}
        available={Boolean(suppressed?.addresses.length)}
        unavailableLabel="No bounced or suppressed addresses."
      >
        <div className="max-h-[190px] overflow-y-auto overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-neutral-400">
                <th className="pb-2 text-xs font-semibold tracking-wide">Email</th>
                <th className="pb-2 text-xs font-semibold tracking-wide">Reason</th>
                <th className="pb-2 text-xs font-semibold tracking-wide">Suppressed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {suppressed?.addresses.map((row) => (
                <tr key={row.recipient}>
                  <td className="py-2 truncate text-neutral-700">{row.recipient}</td>
                  <td className="py-2 text-neutral-500">{row.reason}</td>
                  <td className="py-2 text-neutral-500">{formatDate(row.suppressed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <ChartCard
        title="Recently Offboarded Members"
        subtitle="Members whose access was recently removed or deactivated"
        isLoading={isOffboardedLoading}
        available={Boolean(offboarded?.members.length)}
        unavailableLabel="No recent offboarding."
      >
        <div className="max-h-[190px] overflow-y-auto overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-neutral-400">
                <th className="pb-2 text-xs font-semibold tracking-wide">Member</th>
                <th className="pb-2 text-xs font-semibold tracking-wide">Email</th>
                <th className="pb-2 text-xs font-semibold tracking-wide">Removed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {offboarded?.members.map((member) => (
                <tr key={member.user_id}>
                  <td className="py-2 truncate">
                    <Link
                      to={`/view-organisation-user?orgUserId=${member.user_id}`}
                      className="text-neutral-700 hover:text-primary-600 hover:underline"
                    >
                      {member.full_name}
                    </Link>
                  </td>
                  <td className="py-2 truncate text-neutral-500">{member.email}</td>
                  <td className="py-2 text-neutral-500">{formatDate(member.offboarded_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
};

export default DeliveryAccessSection;
