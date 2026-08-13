import { authApi } from '../authApi';

// POST /api/v1/auth/resend-verification — anonymous. 202, uniform regardless
// of whether the address exists — same account-enumeration reasoning as
// forgot-password (docs/API_CONTRACT.md §5 "POST /resend-verification").
export type ResendVerificationRequest = {
  email: string;
};

export type ResendVerificationResponse = {
  accepted: true;
};

const extendedApi = authApi.injectEndpoints({
  endpoints: (build) => ({
    resendVerification: build.mutation<ResendVerificationResponse, ResendVerificationRequest>({
      query: (body) => ({
        url: '/auth/resend-verification',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useResendVerificationMutation } = extendedApi;
