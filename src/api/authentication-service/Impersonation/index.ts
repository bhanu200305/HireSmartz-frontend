import { api } from '../../index';

export interface ImpersonateRequest {
  userId: number;
  reason: string;
}

export interface ImpersonateUser {
  id: number;
  userId: number;
  emailId: string;
  companyId: number;
  roleTypeMappingId: number;
  isEnabled: boolean;
  isVerified: boolean;
  firstName: string;
  lastName: string;
  roleName: string;
}

export interface ImpersonateResponse {
  success: boolean;
  message: string;
  data: {
    impersonationToken: string;
    tokenType: string;
    expiresIn: number;
    orgId: number;
    orgName: string;
    role: string;
    roleName: string;
    roleType: string;
    roleDisplayName: string;
    startedAt: string;
    expiresAt: string;
    auditId: number;
    impersonating: boolean;
  };
}

export interface ImpersonateExitResponse {
  success: boolean;
  message: string;
  data: null;
}

export interface ImpersonateByUserResponse {
  success: boolean;
  message: string;
  data?: ImpersonateUser[];
}

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    impersonate: build.mutation<ImpersonateResponse, ImpersonateRequest>({
      query: (body) => ({
        url: '/auth/impersonate',
        method: 'POST',
        body,
      }),
    }),

    impersonateExit: build.mutation<ImpersonateExitResponse, void>({
      query: () => ({
        url: '/auth/impersonate/exit',
        method: 'POST',
      }),
    }),

    impersonateByUser: build.mutation<ImpersonateByUserResponse, number>({
      query: (userId) => ({
        url: `/auth/impersonate/users/${userId}`,
        method: 'GET',
      }),
    }),
  }),
});

export const { useImpersonateMutation, useImpersonateExitMutation, useImpersonateByUserMutation } =
  extendedApi;
