import { authApi } from '../authApi';

// POST /api/v1/auth/confirm-recovery-email — anonymous, followed from the
// link sent to the CANDIDATE recovery address. The token in the body IS the
// authorisation, same as /verify-email.
export type ConfirmRecoveryEmailRequest = {
  token: string;
};

export type ConfirmRecoveryEmailResponse = {
  email: string;
  verified_at: string;
};

const extendedApi = authApi.injectEndpoints({
  endpoints: (build) => ({
    confirmRecoveryEmail: build.mutation<ConfirmRecoveryEmailResponse, ConfirmRecoveryEmailRequest>(
      {
        query: (body) => ({
          url: '/auth/confirm-recovery-email',
          method: 'POST',
          body,
        }),
      }
    ),
  }),
});

export const { useConfirmRecoveryEmailMutation } = extendedApi;
