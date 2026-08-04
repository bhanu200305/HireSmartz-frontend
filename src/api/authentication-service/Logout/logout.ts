import { api } from '../../index';

export type LogoutResponse = {
  message: string;
};

const logoutApi = api.injectEndpoints({
  endpoints: (build) => ({
    logout: build.mutation<LogoutResponse, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
  }),
});

export const { useLogoutMutation } = logoutApi;
