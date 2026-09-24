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
  // The phone number already collected when this invite was created — the
  // company's own admin_contact for a Company Admin invite, e.g. — so the
  // accept form can prefill it instead of asking the same person to type a
  // number that was already collected once. E.164 (`+<country><digits>`,
  // split back into the form's separate country-code/digits fields via
  // splitE164). Null when no contact phone was ever recorded for this
  // invite.
  contact_phone: string | null;
  // Same prefill idea as contact_phone, for whoever an admin already typed a
  // name for when creating this invite (e.g. the "Add user" flow). Optional
  // because older backends / invite paths that don't capture a name yet
  // simply omit these keys rather than send null — treat both "missing" and
  // null the same as "nothing to prefill".
  first_name?: string | null;
  last_name?: string | null;
};

// Wire shape of every error this endpoint (and validateInvitation) returns —
// {error_code, message, request_id, details?} from cfp_platform's shared
// exception handler. `error.data` on an RTK Query error is this shape.
export type InvitationErrorCode =
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_ALREADY_ACCEPTED'
  | 'VALIDATION_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  // authentication-service's InvalidMfaCodeError.code, unchanged as it
  // crosses organization-service (see InvalidInvitationMfaCodeError's own
  // docstring on that side) — lowercase, unlike every other code here,
  // because it is authentication-service's own error code reused verbatim
  // rather than one of organization-service's INVITATION_* codes.
  | 'invalid_mfa_code';

export type InvitationErrorBody = {
  error_code: InvitationErrorCode | string;
  message: string;
  request_id: string | null;
  details?: Record<string, unknown>;
};

export type MfaMethodType = 'totp' | 'email' | 'sms';

export type AcceptInvitationRequest = {
  token: string;
  password: string;
  method_type: MfaMethodType;
  // Only meaningful for "totp" — the client-generated secret shown on
  // screen. Absent for "email"/"sms", which verify against a code
  // sendInviteMfaCode already delivered.
  mfa_secret?: string;
  // The 6-digit code proving the chosen factor actually works. REQUIRED now
  // — MFA verification happens before the account is created, and a
  // missing/wrong code fails the whole request instead of leaving MFA
  // quietly disabled. See AcceptInvitationSchema.ts's mfaCode field.
  mfa_code: string;
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
  // No mfa_enabled field: MFA is mandatory now, so a 200 here already means
  // the chosen factor is armed. A missing/wrong code means this call
  // rejects instead (error_code "invalid_mfa_code"), and nothing is
  // created at all — see AcceptedInvitationView on the backend.
};

export type SendInviteMfaCodeRequest = {
  token: string;
  method_type: Extract<MfaMethodType, 'email' | 'sms'>;
  // Required, and only meaningful, when method_type is "sms". E.164 —
  // country code + digits, no separators (e.g. "+919876543210").
  phone_number?: string;
};

export type SendInviteMfaCodeResponse = {
  method_type: string;
  // Masked destination, safe to show on screen — e.g. "jo••••@example.com"
  // or "+•••••1234".
  delivery_hint: string;
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
    // Step one of the two-step "email"/"sms" flow: mint and deliver a code
    // BEFORE the account exists. Not called for "totp", which has no
    // delivery step — the code comes from the app the user already has.
    sendInviteMfaCode: build.mutation<SendInviteMfaCodeResponse, SendInviteMfaCodeRequest>({
      query: ({ token, ...body }) => ({
        url: `/v1/invitations/${token}/mfa/send-code`,
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useLazyValidateInvitationQuery,
  useAcceptInvitationMutation,
  useSendInviteMfaCodeMutation,
} = extendedApi;
