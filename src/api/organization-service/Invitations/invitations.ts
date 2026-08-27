import { orgApi } from '../orgApi';

export type ValidateInvitationResponse = {
  valid: boolean;
  invited_email: string;
  role: string;
  organization_name: string;
  // invite.tenant_id is None on the backend — true for Super Admin/staff
  // invites, false for a Company Admin/Recruiter/Hiring Manager invite.
  // Determines whether phone_number is required to accept (see
  // AcceptInvitationRequest below).
  is_platform_invite: boolean;
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
  // Same tenant-invite-only requirement as first_name above — the backend
  // 422s a tenant accept missing either one (AcceptInvitationUseCase,
  // "country_code is required to accept a tenant invitation"). Max 5 chars
  // on the wire (Field(max_length=5) on AcceptInvitationRequest), same as
  // every other country_code field in this app — a dial code like "+971"
  // fits, a full country name would not.
  country_code?: string;
  phone_number?: string;
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
      // Deliberately NOT tagged 'TenantInvitations' — that tag also covers
      // the Team page's admin-facing pending-invitations list
      // (Tenants/teamInvitations.ts), which SHOULD refetch when
      // acceptInvitation below invalidates it. This query is different: it's
      // the public accept-invitation page's own one-shot token check, kept
      // subscribed for the page's whole lifetime. Sharing the tag meant that
      // same invalidation auto-refetched THIS query right after a successful
      // accept, using the now-already-accepted token — the refetch 409'd,
      // flipped `isError`, and (since AcceptInvitation/index.tsx checks
      // isError before isAccepted) replaced the "you're all set up" screen
      // with an "invite expired/not available" one for the ~2s before the
      // already-scheduled navigate('/login') fired.
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
