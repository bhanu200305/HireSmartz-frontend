import { authApi } from '../authApi';

// Matches authentication-service's real POST /api/v1/auth/login exactly —
// {email, password}. See docs/API_CONTRACT.md §5.
export type LoginRequest = {
  email: string;
  password: string;
};

/** 200 — no second factor armed. TokenResponse, wire shape verbatim. */
export type LoginTokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  session_id: string;
  issued_at: string;
  status: 'authenticated';
};

export type MfaMethodType = 'totp' | 'sms' | 'email';

export type MfaAvailableMethod = {
  mfa_method_id: string;
  method_type: MfaMethodType;
  is_default: boolean;
  /** e.g. "+•••••••3210" or "r••••@acme.com" — null for a method with nothing to mask (totp). */
  masked_destination: string | null;
};

/**
 * 200 — the account has a second factor armed. Discriminate on `status`,
 * never on which fields are present (API_CONTRACT.md §5 "POST /login").
 * `mfa_token` is a short-lived interim credential, NOT an access token —
 * it authorises exactly two calls: POST /auth/mfa/verify and
 * POST /auth/mfa/challenge.
 */
export type MfaRequiredResponse = {
  mfa_token: string;
  method_type: MfaMethodType;
  mfa_method_id: string;
  expires_at: string;
  delivery_hint: string | null;
  available_methods: MfaAvailableMethod[];
  status: 'mfa_required';
};

export type LoginResponse = LoginTokenResponse | MfaRequiredResponse;

export const isMfaRequiredResponse = (res: LoginResponse): res is MfaRequiredResponse =>
  res.status === 'mfa_required';

const extendedApi = authApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useLoginMutation } = extendedApi;
