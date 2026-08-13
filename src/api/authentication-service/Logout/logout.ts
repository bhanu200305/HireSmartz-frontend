import { authApi, noContentResponseHandler } from '../authApi';

// POST /api/v1/auth/logout and /auth/logout-all — both authenticated.
// See docs/API_CONTRACT.md §5 "POST /logout" / "POST /logout-all".

export type LogoutRequest = {
  /** Defaults to the current session (read from the access token) when omitted. */
  session_id?: string;
};

export type LogoutAllRequest = {
  /**
   * true (default): revoke every OTHER session, keep the one making this
   * call. false: also write the user not-before epoch, killing every token
   * fleet-wide including this one.
   */
  keep_current_session?: boolean;
};

export type LogoutAllResponse = {
  revoked_count: number;
};

const logoutApi = authApi.injectEndpoints({
  endpoints: (build) => ({
    // 204 No Content — there is no `message` field on the real response;
    // callers should show their own copy, not read one off this result.
    logout: build.mutation<undefined, LogoutRequest | void>({
      query: (body) => ({
        url: '/auth/logout',
        method: 'POST',
        body: body ?? {},
        responseHandler: noContentResponseHandler,
      }),
      invalidatesTags: ['Sessions'],
    }),
    logoutAll: build.mutation<LogoutAllResponse, LogoutAllRequest | void>({
      query: (body) => ({
        url: '/auth/logout-all',
        method: 'POST',
        body: { keep_current_session: true, ...body },
      }),
      invalidatesTags: ['Sessions'],
    }),
  }),
});

export const { useLogoutMutation, useLogoutAllMutation } = logoutApi;
