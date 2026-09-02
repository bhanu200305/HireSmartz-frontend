import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// candidate-service's genuinely public (no login) candidate-facing surface —
// public_router.py, mounted at /public/v1. Separate `createApi` instance,
// same reasoning as candidateApi.ts's own comment on why the authenticated
// recruiter/admin surface can't share a client with this one: different
// auth (none here — rate-limited per IP instead, CAPTCHA-gated on the
// routes that create data), different base path, different error shapes
// (FRONTEND_INTEGRATION_DETAILS.md §1). Registered in redux/reducers +
// redux/provider/store like every other service-specific API client.
//
// Every endpoint here returns the SAME response envelope
// (`{status, status_code, message, data}`, API_CONTRACT.md's "Response
// envelope") but — unlike candidateApi.ts — this client does NOT unwrap it
// centrally: callers get the full envelope back from `.unwrap()` so they can
// show the backend's own `message` directly (see CareersApplyPage's
// `toast.success(res.message)`), and read `res.data.<field>` for the actual
// payload. Keep that convention for every new endpoint added here.
const PUBLIC_BASE_URL = `${import.meta.env.VITE_CANDIDATE_SERVICE_ENDPOINT}/public/v1`;

export type CandidatePublicEnvelope<T> = {
  status: 'success' | 'error';
  status_code: number;
  message: string;
  data: T;
};

// ---------------------------------------------------------------------------
// Path A — QR / resume-first apply (FRONTEND_INTEGRATION_DETAILS.md §5.1)
// ---------------------------------------------------------------------------

export type PublicApplyRequest = {
  organizationId: string;
  jobOpeningId: string;
  file: File;
  firstName?: string;
  lastName?: string;
  emailId?: string;
  contactNo?: string;
  /** Which of the job's locations this candidate applied under, if it has more than one. */
  appliedJobLocationId?: string;
  termsAccepted: boolean;
  smsConsent: boolean;
  captchaToken: string;
};

// `QrPublicApplyResultView` — `intake_call_booking_token` is `null` when the
// job has no Intake Call round configured, OR when interview-service was
// unreachable at apply time (a degraded, non-error outcome — see §6
// "Degraded booking": the candidate record still exists either way, there
// is currently no retry endpoint). Never a raw candidate/booking id — every
// public link this service hands out is a signed, self-expiring token.
export type PublicApplyResult = {
  id: string;
  intake_call_booking_token: string | null;
};

export type PublicApplyResponse = CandidatePublicEnvelope<PublicApplyResult>;

// ---------------------------------------------------------------------------
// Path B — instant call, no resume yet (FRONTEND_INTEGRATION_DETAILS.md §5.2)
// ---------------------------------------------------------------------------

export type StartIntakeCallRequest = {
  organizationId: string;
  jobOpeningId: string;
  firstName?: string;
  lastName?: string;
  emailId?: string;
  /** Required here (unlike Path A) — interview-service needs a number to place the call. */
  contactNo: string;
  appliedJobLocationId?: string;
  termsAccepted: boolean;
  smsConsent: boolean;
  captchaToken: string;
};

// `StartIntakeCallResultView` — `call_placed: false` does NOT mean the apply
// failed; the candidate record exists either way. It means the call itself
// couldn't be placed (interview-service unreachable) — no retry endpoint
// exists for this yet either (§6).
export type StartIntakeCallResult = {
  id: string;
  call_placed: boolean;
};

export type StartIntakeCallResponse = CandidatePublicEnvelope<StartIntakeCallResult>;

export type ResumeUploadLinkDetails = {
  candidate_id: string;
  job_opening_id: string;
  first_name: string;
  last_name: string | null;
  email_id: string | null;
};

export type ResumeUploadLinkDetailsResponse = CandidatePublicEnvelope<ResumeUploadLinkDetails>;

export type SubmitResumeUploadRequest = {
  /** The signed, self-expiring token from the emailed resume-upload link — never a raw candidate id. */
  token: string;
  file: File;
  captchaToken: string;
};

export type SubmitResumeUploadResult = { id: string };
export type SubmitResumeUploadResponse = CandidatePublicEnvelope<SubmitResumeUploadResult>;

// ---------------------------------------------------------------------------
// Intake Call slot picker (Path A, once a booking token exists)
// ---------------------------------------------------------------------------

export type IntakeCallSlot = {
  start_time: string;
  end_time: string;
  remaining: number;
};

export type IntakeCallSlots = {
  duration_minutes: number;
  slots: IntakeCallSlot[];
};

export type IntakeCallSlotsResponse = CandidatePublicEnvelope<IntakeCallSlots>;

export type GetIntakeCallSlotsArgs = {
  /** The `intake_call_booking_token` from the apply response — signed, self-expiring. */
  token: string;
  /** YYYY-MM-DD */
  date: string;
  /** IANA timezone, e.g. "America/Chicago" */
  timezone: string;
};

export type BookIntakeCallSlotRequest = {
  token: string;
  start_time: string;
  timezone: string;
};

// This call reaches interview-service SYNCHRONOUSLY — the response only
// comes back once the slot is actually locked, there's no separate
// "confirm later" step (§5.1 step 4).
export type BookIntakeCallSlotResult = {
  start_time: string;
  end_time: string;
};

export type BookIntakeCallSlotResponse = CandidatePublicEnvelope<BookIntakeCallSlotResult>;

// ---------------------------------------------------------------------------
// ID.me verification callback (§5.3) — this is a redirect TARGET (ID.me
// sends the candidate's browser here after their identity-proofing flow),
// not something a form ever calls directly. Included here for the landing
// page to read once it's on that URL.
// ---------------------------------------------------------------------------

export type VerificationCallbackResult = { verified: boolean };
export type VerificationCallbackResponse = CandidatePublicEnvelope<VerificationCallbackResult>;

export const publicApplyApi = createApi({
  reducerPath: 'publicApplyApi',
  baseQuery: fetchBaseQuery({ baseUrl: PUBLIC_BASE_URL }),
  endpoints: (build) => ({
    // POST /public/v1/apply
    submitPublicApplication: build.mutation<PublicApplyResponse, PublicApplyRequest>({
      query: ({
        organizationId,
        jobOpeningId,
        file,
        firstName,
        lastName,
        emailId,
        contactNo,
        appliedJobLocationId,
        termsAccepted,
        smsConsent,
        captchaToken,
      }) => {
        // Backend reads these as Form(...) fields, not JSON — multipart is
        // the only shape that carries both the file and the rest of the
        // fields in one request.
        const body = new FormData();
        body.append('organization_id', organizationId);
        body.append('job_opening_id', jobOpeningId);
        body.append('file', file);
        if (firstName) body.append('first_name', firstName);
        if (lastName) body.append('last_name', lastName);
        if (emailId) body.append('email_id', emailId);
        if (contactNo) body.append('contact_no', contactNo);
        if (appliedJobLocationId) body.append('applied_job_location_id', appliedJobLocationId);
        body.append('terms_accepted', String(termsAccepted));
        body.append('sms_consent', String(smsConsent));
        body.append('captcha_token', captchaToken);

        return { url: '/apply', method: 'POST', body };
      },
    }),

    // POST /public/v1/apply/instant-call — same multipart shape as `apply`,
    // minus the file, with `contact_no` promoted to required.
    startIntakeCall: build.mutation<StartIntakeCallResponse, StartIntakeCallRequest>({
      query: ({
        organizationId,
        jobOpeningId,
        firstName,
        lastName,
        emailId,
        contactNo,
        appliedJobLocationId,
        termsAccepted,
        smsConsent,
        captchaToken,
      }) => {
        const body = new FormData();
        body.append('organization_id', organizationId);
        body.append('job_opening_id', jobOpeningId);
        if (firstName) body.append('first_name', firstName);
        if (lastName) body.append('last_name', lastName);
        if (emailId) body.append('email_id', emailId);
        body.append('contact_no', contactNo);
        if (appliedJobLocationId) body.append('applied_job_location_id', appliedJobLocationId);
        body.append('terms_accepted', String(termsAccepted));
        body.append('sms_consent', String(smsConsent));
        body.append('captcha_token', captchaToken);

        return { url: '/apply/instant-call', method: 'POST', body };
      },
    }),

    // GET /public/v1/apply/resume-upload?token=... — page details for the
    // emailed resume-upload link's landing page (greet by name, confirm the
    // right job) before the candidate actually submits a file.
    getResumeUploadLinkDetails: build.query<ResumeUploadLinkDetailsResponse, string>({
      query: (token) => ({
        url: '/apply/resume-upload',
        params: { token },
      }),
    }),

    // POST /public/v1/apply/resume-upload — multipart: token, file,
    // captcha_token. Can 409 (CANDIDATE_ALREADY_HAS_RESUME) or 422
    // (RESUME_UPLOAD_WINDOW_EXPIRED, past the 24h window) — both need a
    // "this link no longer works" message, not a generic error (§5.2 step 4).
    submitResumeUpload: build.mutation<SubmitResumeUploadResponse, SubmitResumeUploadRequest>({
      query: ({ token, file, captchaToken }) => {
        const body = new FormData();
        body.append('token', token);
        body.append('file', file);
        body.append('captcha_token', captchaToken);
        return { url: '/apply/resume-upload', method: 'POST', body };
      },
    }),

    // GET /public/v1/apply/intake-call-slots?token=&date=&timezone=
    getIntakeCallSlots: build.query<IntakeCallSlotsResponse, GetIntakeCallSlotsArgs>({
      query: ({ token, date, timezone }) => ({
        url: '/apply/intake-call-slots',
        params: { token, date, timezone },
      }),
    }),

    // POST /public/v1/apply/intake-call-slots/book — JSON body, reaches
    // interview-service synchronously (see BookIntakeCallSlotResult's comment).
    bookIntakeCallSlot: build.mutation<BookIntakeCallSlotResponse, BookIntakeCallSlotRequest>({
      query: (body) => ({
        url: '/apply/intake-call-slots/book',
        method: 'POST',
        body,
      }),
    }),

    // GET /public/v1/verification/callback?code=&state= — a redirect target,
    // not something a form submits to. The landing page component calls this
    // query itself (its route params ARE `code`/`state`, round-tripped by
    // ID.me) purely to read `{verified}` and render a confirmation/failure
    // screen; never construct this URL client-side (§5.3).
    getVerificationCallback: build.query<
      VerificationCallbackResponse,
      { code: string; state: string }
    >({
      query: ({ code, state }) => ({
        url: '/verification/callback',
        params: { code, state },
      }),
    }),
  }),
});

export const {
  useSubmitPublicApplicationMutation,
  useStartIntakeCallMutation,
  useGetResumeUploadLinkDetailsQuery,
  useSubmitResumeUploadMutation,
  useGetIntakeCallSlotsQuery,
  useLazyGetIntakeCallSlotsQuery,
  useBookIntakeCallSlotMutation,
  useGetVerificationCallbackQuery,
} = publicApplyApi;
