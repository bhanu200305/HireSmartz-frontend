import { api } from '../../index';

export type LoginRequest = {
  emailId: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

const extendedApi = api.injectEndpoints({
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
