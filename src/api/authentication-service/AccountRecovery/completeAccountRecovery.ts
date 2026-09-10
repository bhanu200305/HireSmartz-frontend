import { authApi, noContentResponseHandler } from '../authApi';

// POST /api/v1/auth/account-recovery/complete — anonymous; the token in the
// body IS the authorisation, same as /reset-password. Resets the password
// AND disables every enrolled MFA method, and signs the account out
// everywhere — the whole point of this endpoint is "I lost both factors."
export type CompleteAccountRecoveryRequest = {
  token: string;
  new_password: string;
};

const extendedApi = authApi.injectEndpoints({
  endpoints: (build) => ({
    completeAccountRecovery: build.mutation<undefined, CompleteAccountRecoveryRequest>({
      query: (body) => ({
        url: '/auth/account-recovery/complete',
        method: 'POST',
        body,
        responseHandler: noContentResponseHandler,
      }),
    }),
  }),
});

export const { useCompleteAccountRecoveryMutation } = extendedApi;
