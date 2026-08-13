import { authApi, noContentResponseHandler } from '../authApi';
import type { MfaMethodType } from '../Login/login';

// /api/v1/mfa/* — all authenticated, all act on the CALLER's own factors
// only (resolved from the verified token's `sub`, never a path/body
// parameter). See docs/API_CONTRACT.md §6.

export type MfaMethodView = {
  mfa_method_id: string;
  method_type: MfaMethodType;
  is_default: boolean;
  /** Armed — false between /enable and a successful /confirm. */
  is_enabled: boolean;
  /** e.g. "+•••••••3210" / "r••••@acme.com" — null for totp. */
  masked_destination: string | null;
  created_at: string;
};

export type MfaEnrolmentStatus = {
  methods: MfaMethodView[];
  is_complete: boolean;
  minimum_required: number;
  available_to_add: MfaMethodType[];
};

export type MfaEnableRequest = {
  method_type: MfaMethodType;
  /** Required, E.164 (e.g. "+919876543210"), only for method_type "sms". */
  phone_number?: string;
};

/**
 * 201 response to /enable. `secret` / `provisioning_uri` are populated only
 * for `totp`, and only here — there is deliberately no endpoint to fetch a
 * TOTP secret again once this response has been read.
 */
export type MfaEnrolmentView = {
  mfa_method_id: string;
  method_type: MfaMethodType;
  secret: string | null;
  provisioning_uri: string | null;
  /** Masked destination a delivered (sms/email) code was just sent to. */
  delivery_hint: string | null;
};

export type MfaConfirmRequest = {
  mfa_method_id: string;
  /** 4–10 chars. */
  code: string;
};

export type MfaResendRequest = {
  mfa_method_id: string;
};

export type MfaSetDefaultRequest = {
  mfa_method_id: string;
};

export type MfaDisableRequest = {
  mfa_method_id: string;
  /** Turning off a second factor is a security downgrade — requires re-proving the password. */
  current_password: string;
};

const extendedApi = authApi.injectEndpoints({
  endpoints: (build) => ({
    getMfaStatus: build.query<MfaEnrolmentStatus, void>({
      query: () => ({ url: '/mfa', method: 'GET' }),
      providesTags: ['MfaMethods'],
    }),
    enableMfaMethod: build.mutation<MfaEnrolmentView, MfaEnableRequest>({
      query: (body) => ({ url: '/mfa/enable', method: 'POST', body }),
      invalidatesTags: ['MfaMethods'],
    }),
    confirmMfaMethod: build.mutation<MfaMethodView, MfaConfirmRequest>({
      query: (body) => ({ url: '/mfa/confirm', method: 'POST', body }),
      invalidatesTags: ['MfaMethods'],
    }),
    resendMfaEnrolmentCode: build.mutation<MfaMethodView, MfaResendRequest>({
      query: (body) => ({ url: '/mfa/resend', method: 'POST', body }),
    }),
    setDefaultMfaMethod: build.mutation<MfaMethodView, MfaSetDefaultRequest>({
      query: (body) => ({ url: '/mfa/default', method: 'POST', body }),
      invalidatesTags: ['MfaMethods'],
    }),
    disableMfaMethod: build.mutation<undefined, MfaDisableRequest>({
      query: (body) => ({
        url: '/mfa/disable',
        method: 'POST',
        body,
        responseHandler: noContentResponseHandler,
      }),
      invalidatesTags: ['MfaMethods'],
    }),
  }),
});

export const {
  useGetMfaStatusQuery,
  useEnableMfaMethodMutation,
  useConfirmMfaMethodMutation,
  useResendMfaEnrolmentCodeMutation,
  useSetDefaultMfaMethodMutation,
  useDisableMfaMethodMutation,
} = extendedApi;
