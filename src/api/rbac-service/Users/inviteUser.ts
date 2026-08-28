import { api } from '../../index';
import { isDevAuthBypassEnabled } from '../../../shared/utils/auth/devAuthBypass';
import {
  devUserStore,
  DevUserStoreError,
  InvitedUser,
} from '../../../shared/utils/dev/devUserStore';

export type InviteUserRequest = {
  firstName: string;
  lastName?: string;
  email: string;
  roleId: string;
  locationId: string | null;
};

export type InviteUserResponse = {
  data: InvitedUser;
  success: boolean;
  message: string;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    // There's no real invite-provisioning endpoint wired up yet (no email
    // pipeline, no /internal/v1 caller — see the API docs' known gaps), so
    // this only actually works in dev-bypass mode today: it generates a
    // temporary password locally instead of pretending to send an email
    // that would never arrive. The generated credentials work with the
    // login page immediately (see Login/index.tsx).
    inviteUser: build.mutation<InviteUserResponse, InviteUserRequest>({
      queryFn: async (body) => {
        if (isDevAuthBypassEnabled()) {
          try {
            const user = devUserStore.invite(body);
            return { data: { data: user, success: true, message: 'Invite created.' } };
          } catch (err) {
            const message =
              err instanceof DevUserStoreError ? err.message : 'Failed to create invite.';
            return { error: { status: 400, data: { message } } as any };
          }
        }

        return {
          error: {
            status: 501,
            data: { message: 'Inviting users requires a connected backend.' },
          } as any,
        };
      },
      invalidatesTags: [{ type: 'Roles', id: 'INVITES' }],
    }),
    getInvitedUsers: build.query<{ data: InvitedUser[] }, void>({
      queryFn: async () => {
        if (isDevAuthBypassEnabled()) {
          return { data: { data: devUserStore.list() } };
        }
        return { data: { data: [] } };
      },
      providesTags: [{ type: 'Roles', id: 'INVITES' }],
    }),
  }),
});

export const { useInviteUserMutation, useGetInvitedUsersQuery } = extendedApi;
