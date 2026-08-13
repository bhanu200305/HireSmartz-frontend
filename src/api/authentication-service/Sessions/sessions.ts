import { authApi, noContentResponseHandler } from '../authApi';

// /api/v1/sessions — both authenticated. See docs/API_CONTRACT.md §7.

export type SessionStatus = 'active' | 'logged_out' | 'expired' | 'revoked' | 'locked';

export type SessionView = {
  session_id: string;
  device_type: string | null;
  browser: string | null;
  operating_system: string | null;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  login_time: string;
  last_activity: string;
  expires_at: string;
  status: SessionStatus;
  is_current: boolean;
};

export type SessionListResponse = {
  total: number;
  items: SessionView[];
};

const extendedApi = authApi.injectEndpoints({
  endpoints: (build) => ({
    getSessions: build.query<SessionListResponse, void>({
      query: () => ({ url: '/sessions', method: 'GET' }),
      providesTags: ['Sessions'],
    }),
    /**
     * Revokes immediately via Redis, not at token expiry — the session
     * disappears from the caller's own list right away and the next request
     * made with that session's access token is rejected before it reaches
     * any route handler.
     */
    revokeSession: build.mutation<undefined, string>({
      query: (sessionId) => ({
        url: `/sessions/${sessionId}`,
        method: 'DELETE',
        responseHandler: noContentResponseHandler,
      }),
      invalidatesTags: ['Sessions'],
    }),
  }),
});

export const { useGetSessionsQuery, useRevokeSessionMutation } = extendedApi;
