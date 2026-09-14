import React from 'react';
import { MdOutlineMailOutline, MdOutlineRefresh, MdOutlineBlock } from 'react-icons/md';
import { Typography, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import {
  useListTenantInvitationsQuery,
  useResendTenantInvitationMutation,
  useRevokeTenantInvitationMutation,
} from '../../../api/organization-service/Tenants/teamInvitations';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';

const STATUS_BADGE_BG: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600',
  accepted: 'bg-primary-50 text-primary-600',
  expired: 'bg-gray-100 text-gray-400',
  revoked: 'bg-red-50 text-red-500',
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
      showToast({ message: 'Invitation resent, expiry pushed out 48 hours.', type: 'success' });
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
    return (
      <div className="mt-6 p-8 text-gray-500 text-center border border-dashed border-gray-200 rounded-xl">
        No invitations sent yet.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <Typography variant="subtitle1" className="mb-2 block">
        Invitations
      </Typography>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.invitations.map((invitation) => (
          <div
            key={invitation.invitation_id}
            className="flex items-center justify-between gap-3 p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-3 min-w-0">
              <span className="w-9 h-9 shrink-0 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                <MdOutlineMailOutline size={18} />
              </span>
              <div className="min-w-0">
                <Typography variant="body1" className="font-medium text-gray-900 truncate">
                  {invitation.invited_email}
                </Typography>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-xs text-gray-400">{invitation.role}</span>
                  <span
                    className={`inline-flex items-center rounded-full text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 ${
                      STATUS_BADGE_BG[invitation.status] || 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {invitation.status}
                  </span>
                  <span className="text-xs text-gray-400">
                    · expires {new Date(invitation.expires_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            {invitation.status === 'pending' && (
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  aria-label="Resend invitation"
                  className="p-2 rounded-full text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors disabled:opacity-50"
                  disabled={isResending}
                  onClick={() => handleResend(invitation.invitation_id)}
                >
                  <MdOutlineRefresh size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Revoke invitation"
                  className="p-2 rounded-full text-red-500 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                  disabled={isRevoking}
                  onClick={() => handleRevoke(invitation.invitation_id)}
                >
                  <MdOutlineBlock size={16} />
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
