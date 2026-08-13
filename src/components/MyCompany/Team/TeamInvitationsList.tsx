import React from 'react';
import { Typography, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import {
  useListTenantInvitationsQuery,
  useResendTenantInvitationMutation,
  useRevokeTenantInvitationMutation,
} from '../../../api/organization-service/Tenants/teamInvitations';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-amber-600',
  accepted: 'text-[#008A2E]',
  expired: 'text-gray-400',
  revoked: 'text-red-500',
};

/** §D — GET .../invitations, every status, paginated (kept to the first page
 * here; this tab isn't the place for full pagination controls). */
const TeamInvitationsList: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data, isLoading } = useListTenantInvitationsQuery({ tenantId });
  const [resend, { isLoading: isResending }] = useResendTenantInvitationMutation();
  const [revoke, { isLoading: isRevoking }] = useRevokeTenantInvitationMutation();

  const handleResend = async (invitationId: string) => {
    try {
      await resend({ tenantId, invitationId }).unwrap();
      showToast({ message: 'Invitation resent — expiry pushed out 48 hours.', type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to resend invitation.'),
        type: 'error',
      });
    }
  };

  const handleRevoke = async (invitationId: string) => {
    try {
      await revoke({ tenantId, invitationId }).unwrap();
      showToast({ message: 'Invitation revoked.', type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to revoke invitation.'),
        type: 'error',
      });
    }
  };

  if (isLoading) return <Loader />;
  if (!data?.invitations.length) {
    return <p className="text-sm text-gray-400 mt-4">No invitations sent yet.</p>;
  }

  return (
    <div className="mt-6">
      <Typography variant="subtitle1" className="mb-2 block">
        Invitations
      </Typography>
      <div className="divide-y border rounded-xl overflow-hidden">
        {data.invitations.map((invitation) => (
          <div key={invitation.invitation_id} className="flex items-center justify-between p-3">
            <div>
              <Typography variant="body2">{invitation.invited_email}</Typography>
              <Typography variant="caption">
                {invitation.role} ·{' '}
                <span className={STATUS_COLORS[invitation.status] || 'text-gray-500'}>
                  {invitation.status}
                </span>{' '}
                · expires {new Date(invitation.expires_at).toLocaleDateString()}
              </Typography>
            </div>
            {invitation.status === 'pending' && (
              <div className="flex gap-3 text-sm">
                <button
                  type="button"
                  className="text-primary hover:underline cursor-pointer disabled:opacity-50"
                  disabled={isResending}
                  onClick={() => handleResend(invitation.invitation_id)}
                >
                  Resend
                </button>
                <button
                  type="button"
                  className="text-red-500 hover:underline cursor-pointer disabled:opacity-50"
                  disabled={isRevoking}
                  onClick={() => handleRevoke(invitation.invitation_id)}
                >
                  Revoke
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamInvitationsList;
