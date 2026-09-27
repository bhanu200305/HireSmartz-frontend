import React, { useMemo, useState } from 'react';
import { Tooltip } from 'antd';
import {
  MdOutlineMailOutline,
  MdOutlineRefresh,
  MdOutlineBlock,
  MdOutlineEdit,
} from 'react-icons/md';
import { Typography, showToast, Button, Input } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import {
  useListTenantInvitationsQuery,
  useResendTenantInvitationMutation,
  useRevokeTenantInvitationMutation,
} from '../../../api/organization-service/Tenants/teamInvitations';
import {
  useListUsersQuery,
  useUpdateUserMutation,
} from '../../../api/organization-service/Users/users';
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
  const {
    data,
    isLoading,
    refetch: refetchInvitations,
  } = useListTenantInvitationsQuery({
    tenantId,
  });
  const [resend, { isLoading: isResending }] = useResendTenantInvitationMutation();
  const [revoke, { isLoading: isRevoking }] = useRevokeTenantInvitationMutation();
  // `InvitationSummaryView` (this list) carries no user_id — CreateUserUseCase
  // writes the `users` row and the `Invite` together, in one transaction, at
  // invite time, but this endpoint only ever surfaces the invite's own
  // fields. The matching OrgUser (same email, `has_set_password: false` —
  // see that field's own doc comment) already carries the real user_id
  // PATCH /v1/users/{user_id} needs, so it's resolved here by email against
  // the tenant's own directory instead of adding a new backend field.
  const { data: usersData } = useListUsersQuery(undefined);
  const [updateUser, { isLoading: isChangingEmail }] = useUpdateUserMutation();
  const userIdByEmail = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of usersData?.items ?? []) {
      map.set(user.email.trim().toLowerCase(), user.user_id);
    }
    return map;
  }, [usersData]);
  const [changingEmailFor, setChangingEmailFor] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');

  const startChangeEmail = (invitationId: string, currentEmail: string) => {
    setChangingEmailFor(invitationId);
    setNewEmail(currentEmail);
  };

  const cancelChangeEmail = () => {
    setChangingEmailFor(null);
    setNewEmail('');
  };

  const handleChangeEmail = async (userId: string) => {
    const trimmed = newEmail.trim();
    if (!trimmed) return;
    try {
      const res = await updateUser({ userId, email: trimmed }).unwrap();
      showToast({
        message: res.invite_resent
          ? 'Email updated — a fresh invite was sent to the new address.'
          : 'Email updated.',
        type: 'success',
      });
      cancelChangeEmail();
      // updateUser only invalidates the user directory ('OrgUsers') — this
      // invitation row's own `invited_email` (organization-service redirects
      // the pending invite to the new address as part of the same PATCH) is
      // a separate cache entry that needs its own refetch to show the change.
      void refetchInvitations();
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to update email.'), type: 'error' });
    }
  };

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
        {data.invitations.map((invitation) => {
          const matchedUserId = userIdByEmail.get(invitation.invited_email.trim().toLowerCase());
          return (
            <div
              key={invitation.invitation_id}
              className="flex flex-col gap-3 p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between gap-3">
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
                        className={`inline-flex items-center rounded-full text-xs font-semibold uppercase tracking-wide px-1.5 py-0.5 ${
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
                    {matchedUserId && (
                      <Tooltip
                        title={
                          changingEmailFor === invitation.invitation_id ? 'Cancel' : 'Change email'
                        }
                      >
                        <button
                          type="button"
                          aria-label="Change email"
                          className="p-2 rounded-full text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          disabled={isChangingEmail}
                          onClick={() =>
                            changingEmailFor === invitation.invitation_id
                              ? cancelChangeEmail()
                              : startChangeEmail(invitation.invitation_id, invitation.invited_email)
                          }
                        >
                          <MdOutlineEdit size={16} />
                        </button>
                      </Tooltip>
                    )}
                    <Tooltip title="Resend invitation">
                      <button
                        type="button"
                        aria-label="Resend invitation"
                        className="p-2 rounded-full text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        disabled={isResending}
                        onClick={() => handleResend(invitation.invitation_id)}
                      >
                        <MdOutlineRefresh size={16} />
                      </button>
                    </Tooltip>
                    <Tooltip title="Revoke invitation">
                      <button
                        type="button"
                        aria-label="Revoke invitation"
                        className="group p-2 rounded-full bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        disabled={isRevoking}
                        onClick={() => handleRevoke(invitation.invitation_id)}
                      >
                        <MdOutlineBlock
                          size={16}
                          className="text-gray-600 transition-colors group-hover:text-red-600"
                        />
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>

              {changingEmailFor === invitation.invitation_id && matchedUserId && (
                <div className="flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row">
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Corrected email address"
                    className="h-9 flex-1 rounded-lg border border-gray-300 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => void handleChangeEmail(matchedUserId)}
                      disabled={!newEmail.trim() || isChangingEmail}
                      className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isChangingEmail ? 'Saving…' : 'Save'}
                    </Button>
                    <Button
                      type="button"
                      onClick={cancelChangeEmail}
                      disabled={isChangingEmail}
                      className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeamInvitationsList;
