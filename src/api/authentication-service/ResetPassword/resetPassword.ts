import { authApi } from '../authApi';

// POST /api/v1/auth/reset-password — anonymous; the token in the body IS the
// authorisation (docs/API_CONTRACT.md §5 "POST /reset-password"). Signs the
// user out of every device including whichever one is completing the reset.
//
// Returns 200 { email } (the address the token belonged to) rather than 204
// — after rawAuthBaseQuery unwraps the envelope this endpoint sees just
// `{ email }` — so the caller can hand the address to the login page for a
// prefill. account-recovery/complete is a separate endpoint and still
// returns 204 with no body; don't apply this change there.
export type ResetPasswordRequest = {
  token: string;
  new_password: string;
};

export type ResetPasswordResponse = {
  email: string;
};

const extendedApi = authApi.injectEndpoints({
  endpoints: (build) => ({
    resetPassword: build.mutation<ResetPasswordResponse, ResetPasswordRequest>({
      query: (body) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useResetPasswordMutation } = extendedApi;
