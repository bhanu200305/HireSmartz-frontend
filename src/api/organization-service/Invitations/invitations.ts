import { api } from '../../index';

export type ValidateInvitationResponse = {
  valid: boolean;
  invited_email: string;
  role: string;
  organization_name: string;
};

export type AcceptInvitationRequest = {
  token: string;
  password: string;
  mfa_secret: string;
};

export type AcceptInvitationResponse = {
  user_id: string;
  status: 'active' | string;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    validateInvitation: build.query<ValidateInvitationResponse, string>({
      query: (token) => ({
        url: `/v1/invitations/${token}`,
        method: 'GET',
      }),
      providesTags: ['TenantInvitations'],
    }),
    acceptInvitation: build.mutation<AcceptInvitationResponse, AcceptInvitationRequest>({
      query: ({ token, ...body }) => ({
        url: `/v1/invitations/${token}/accept`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TenantInvitations'],
    }),
  }),
});

export const { useLazyValidateInvitationQuery, useAcceptInvitationMutation } = extendedApi;
