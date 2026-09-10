import { authApi, noContentResponseHandler } from '../authApi';

// /api/v1/auth/recovery-email — authenticated, acts on the CALLER's own
// account only (resolved from the verified token's `sub`). A recovery email
// is an account-takeover primitive if it's ever set silently, so both write
// endpoints re-authenticate with `current_password` — same shape as
// /mfa/disable and /change-password.

export type RecoveryEmailStatus = {
  /** Already masked by the backend (e.g. "j***e@example.com") — null when unset. */
  recovery_email: string | null;
  is_verified: boolean;
};

export type SetRecoveryEmailRequest = {
  current_password: string;
  recovery_email: string;
};

export type SetRecoveryEmailResponse = {
  accepted: true;
  expires_at: string;
};

export type RemoveRecoveryEmailRequest = {
  current_password: string;
};

const extendedApi = authApi.injectEndpoints({
  endpoints: (build) => ({
    getRecoveryEmailStatus: build.query<RecoveryEmailStatus, void>({
      query: () => ({ url: '/auth/recovery-email', method: 'GET' }),
      providesTags: ['RecoveryEmail'],
    }),
    setRecoveryEmail: build.mutation<SetRecoveryEmailResponse, SetRecoveryEmailRequest>({
      query: (body) => ({ url: '/auth/recovery-email', method: 'POST', body }),
      invalidatesTags: ['RecoveryEmail'],
    }),
    removeRecoveryEmail: build.mutation<undefined, RemoveRecoveryEmailRequest>({
      query: (body) => ({
        url: '/auth/recovery-email',
        method: 'DELETE',
        body,
        responseHandler: noContentResponseHandler,
      }),
      invalidatesTags: ['RecoveryEmail'],
    }),
  }),
});

export const {
  useGetRecoveryEmailStatusQuery,
  useSetRecoveryEmailMutation,
  useRemoveRecoveryEmailMutation,
} = extendedApi;
