import { authApi } from '../authApi';

// POST /api/v1/auth/forgot-password — anonymous. See
// docs/API_CONTRACT.md §5 "POST /forgot-password".
export type ForgotPasswordRequest = {
  email: string;
};

// 202, always — whether or not the address exists. Deliberately uniform:
// a distinguishable response turns this endpoint into an account-enumeration
// oracle (API_CONTRACT.md §4.1). Never show a different message for "sent"
// vs "not found" based on this — there is no "not found" case to show.
export type ForgotPasswordResponse = {
  accepted: true;
};

const extendedApi = authApi.injectEndpoints({
  endpoints: (build) => ({
    forgotPassword: build.mutation<ForgotPasswordResponse, ForgotPasswordRequest>({
      query: (body) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useForgotPasswordMutation } = extendedApi;
