import { authApi } from '../authApi';

// POST /api/v1/auth/verify-email — anonymous, followed from an emailed link,
// no session at all (docs/API_CONTRACT.md §5 "POST /verify-email").
export type VerifyEmailRequest = {
  token: string;
  /** Optional — sets the account's first password in the same call. */
  password?: string;
};

export type VerifyEmailResponse = {
  user_id: string;
  email: string;
  password_set: boolean;
  verified_at: string;
};

const extendedApi = authApi.injectEndpoints({
  endpoints: (build) => ({
    verifyEmail: build.mutation<VerifyEmailResponse, VerifyEmailRequest>({
      query: (body) => ({
        url: '/auth/verify-email',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useVerifyEmailMutation } = extendedApi;
