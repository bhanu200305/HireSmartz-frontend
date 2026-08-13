import { authApi } from '../authApi';
import type { LoginTokenResponse, MfaRequiredResponse } from '../Login/login';

// Both anonymous — authenticated by the interim `mfa_token` itself, not a
// bearer token (docs/API_CONTRACT.md §5, "POST /mfa/verify" / "POST /mfa/challenge").
// A user mid-MFA-challenge holds no access token and never will unless
// these are reachable without one.

export type MfaVerifyRequest = {
  mfa_token: string;
  /** 4–10 chars — TOTP is 6, some SMS/email providers use longer codes. */
  code: string;
};

export type MfaChallengeRequest = {
  mfa_token: string;
  /** Omit to resend on the same factor the challenge was issued for. */
  mfa_method_id?: string;
};

const extendedApi = authApi.injectEndpoints({
  endpoints: (build) => ({
    /** Completes the login. 200 -> the same TokenResponse a no-MFA login returns. */
    mfaLoginVerify: build.mutation<LoginTokenResponse, MfaVerifyRequest>({
      query: (body) => ({
        url: '/auth/mfa/verify',
        method: 'POST',
        body,
      }),
    }),
    /**
     * Resends the outstanding challenge, or re-issues it on another armed
     * factor. Returns a NEW mfa_token — the old one no longer refers to a
     * live challenge, so callers must swap it in before the next verify/
     * challenge call.
     */
    mfaLoginChallenge: build.mutation<MfaRequiredResponse, MfaChallengeRequest>({
      query: (body) => ({
        url: '/auth/mfa/challenge',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useMfaLoginVerifyMutation, useMfaLoginChallengeMutation } = extendedApi;
