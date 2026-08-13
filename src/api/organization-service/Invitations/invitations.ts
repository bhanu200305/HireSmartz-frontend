import { orgApi } from '../orgApi';

export type ValidateInvitationResponse = {
  valid: boolean;
  invited_email: string;
  role: string;
  organization_name: string;
};

// Wire shape of every error this endpoint (and validateInvitation) returns —
// {error_code, message, request_id, details?} from cfp_platform's shared
// exception handler. `error.data` on an RTK Query error is this shape.
export type InvitationErrorCode =
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_ALREADY_ACCEPTED'
  | 'VALIDATION_ERROR'
  | 'EXTERNAL_SERVICE_ERROR';

export type InvitationErrorBody = {
  error_code: InvitationErrorCode | string;
  message: string;
  request_id: string | null;
  details?: Record<string, unknown>;
};

export type AcceptInvitationRequest = {
  token: string;
  password: string;
  mfa_secret: string;
  // Required for every tenant invite — see AcceptInvitationSchema.ts's
  // comment. Optional on the wire because a platform invite (never accepted
  // through this frontend flow) doesn't need one.
  first_name: string;
  last_name?: string;
};

export type AcceptInvitationResponse = {
  user_id: string;
  status: 'active' | string;
};

const extendedApi = orgApi.injectEndpoints({
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
