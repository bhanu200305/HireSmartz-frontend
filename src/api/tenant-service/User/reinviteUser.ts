import { api } from '../../index';

type ResendInviteRequest = {
  userId: number;
  firstName: string;
  emailId: string;
  companyId?: number;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    resendInvite: build.mutation<void, ResendInviteRequest>({
      query: ({ userId, firstName, emailId, companyId }) => ({
        url:
          companyId && Number.isFinite(companyId) && companyId > 0
            ? `/auth/resend-invite/${userId}?companyId=${companyId}`
            : `/auth/resend-invite/${userId}`,
        method: 'POST',
        body: { firstName, emailId },
      }),
    }),
  }),
});

export const { useResendInviteMutation } = extendedApi;
