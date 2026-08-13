import { authApi, noContentResponseHandler } from '../authApi';

// POST /api/v1/auth/reset-password — anonymous; the token in the body IS the
// authorisation (docs/API_CONTRACT.md §5 "POST /reset-password"). Signs the
// user out of every device including whichever one is completing the reset.
export type ResetPasswordRequest = {
  token: string;
  new_password: string;
};

const extendedApi = authApi.injectEndpoints({
  endpoints: (build) => ({
    resetPassword: build.mutation<undefined, ResetPasswordRequest>({
      query: (body) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body,
        responseHandler: noContentResponseHandler,
      }),
    }),
  }),
});

export const { useResetPasswordMutation } = extendedApi;
