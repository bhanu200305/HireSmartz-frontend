import { api } from '../../index';
import { NYLAS_API } from '../../../constants/webAPI';

export interface NylasGrantStatus {
  connected: boolean;
  email?: string;
  configurationId?: string;
}

/**
 * Nylas Calendar Integration API endpoints.
 *
 * Handles the OAuth connect flow and calendar management.
 * The connect-url response is a plain-text redirect URL, so
 * `responseHandler: 'text'` is used for that endpoint.
 */
const nylasApi = api.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Fetches the Nylas OAuth authorization URL for the current user.
     * @returns Plain string URL — redirect the browser to begin OAuth
     */
    getNylasAuthUrl: build.query<string, void>({
      query: () => ({
        url: NYLAS_API.CONNECT_URL,
        responseHandler: (response: Response) => response.text(),
      }),
    }),

    /**
     * Returns whether the current user has an active Nylas calendar grant.
     * @returns { connected: boolean, email?: string }
     */
    getNylasGrantStatus: build.query<NylasGrantStatus, void>({
      query: () => ({
        url: NYLAS_API.GRANT_STATUS_URL,
        method: 'GET',
      }),
      providesTags: ['NylasGrantStatus'],
    }),

    /**
     * Deletes the current user's Nylas calendar grant (disconnect).
     * Response is a plain string ("Grant deleted successfully"), not JSON —
     * so `responseHandler: 'text'` is required to avoid a parse error.
     * Invalidates the grant-status cache so the UI updates immediately.
     */
    disconnectNylasGrant: build.mutation<string, void>({
      query: () => ({
        url: NYLAS_API.GRANT_URL,
        method: 'DELETE',
        responseHandler: (response: Response) => response.text(),
      }),
      invalidatesTags: ['NylasGrantStatus'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useLazyGetNylasAuthUrlQuery,
  useGetNylasGrantStatusQuery,
  useDisconnectNylasGrantMutation,
} = nylasApi;
