import { authApi, noContentResponseHandler } from '../authApi';

// POST /api/v1/auth/change-password — authenticated. See
// docs/API_CONTRACT.md §5 "POST /change-password". Signs out every OTHER
// device; the session making this call stays signed in.
export type ChangePasswordRequest = {
  current_password: string;
  new_password: string;
};

const extendedApi = authApi.injectEndpoints({
  endpoints: (build) => ({
    changePassword: build.mutation<undefined, ChangePasswordRequest>({
      query: (body) => ({
        url: '/auth/change-password',
        method: 'POST',
        body,
        responseHandler: noContentResponseHandler,
      }),
      invalidatesTags: ['Sessions'],
    }),
  }),
});

export const { useChangePasswordMutation } = extendedApi;
