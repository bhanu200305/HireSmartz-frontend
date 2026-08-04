import api from '../..';

export type ForgotPasswordRequest = {
  emailId: string;
};

interface ForgotPasswordResponse {
  message: string;
  success: boolean;
}

const extendedApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getForgotPwd: builder.query<ForgotPasswordResponse, ForgotPasswordRequest>({
      query: (body) => ({
        url: '/auth/password/forgot',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useLazyGetForgotPwdQuery } = extendedApi;
