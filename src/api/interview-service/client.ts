import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
} from '@reduxjs/toolkit/query/react';
import { getLocalStorageItem } from '../../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';

const INTERVIEW_BASE_URL =
  import.meta.env.VITE_INTERVIEW_SERVICE_ENDPOINT ||
  `${import.meta.env.VITE_BACKEND_ENDPOINT}/api/v1`;

export type BookingStatus =
  | 'draft'
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'failed'
  | 'rescheduled';
export type InterviewType = 'audio' | 'audio_screening' | 'ai_video' | 'panel';
export type FeedbackRecommendation = 'strong_yes' | 'yes' | 'no' | 'strong_no';
export type InterviewAuth = 'platform' | 'public' | 'booking-link';

/** Frozen copy of the job-service round definition taken when the booking
 * was created (interview-service `create_booking`). `job_title` was threaded
 * through 2026-09 so listings/detail views can show a real title without a
 * cross-service join. Every field is best-effort — the snapshot is null when
 * the plan port didn't resolve a round. */
export interface RoundSnapshot {
  round_id?: string;
  sequence?: number;
  interview_type?: InterviewType;
  duration_minutes?: number | null;
  presentation_mode?: string | null;
  delivery_mode?: string | null;
  job_title?: string | null;
}

export interface BookingView {
  id: string;
  status: BookingStatus;
  interview_type: InterviewType;
  candidate_id: string;
  job_id: string;
  round_id: string;
  sequence_no: number;
  round_snapshot: RoundSnapshot | null;
  start_time: string | null;
  end_time: string | null;
  attendee_timezone: string | null;
  rescheduled_from_booking_id: string | null;
  cancellation_reason: string | null;
  skip_reason: string | null;
}

export interface CreateBookingRequest {
  candidate_id: string;
  job_id: string;
  round_id: string;
  sequence_no: number;
  interview_type: InterviewType;
  interviewer_id?: string | null;
  attempt_of?: string | null;
  immediate: boolean;
  candidate_phone_number?: string | null;
}

export interface PaginatedBookings {
  items: BookingView[];
  next_cursor: string | null;
}

export interface SessionTokenView {
  access_token: string;
  room: string;
  identity: string;
  expires_at: string;
  livekit_url: string;
}

export type VideoSessionStatus = 'active' | 'ended' | 'failed';

export interface CallNowView {
  booking_id: string;
  initiated_at: string;
}

/** `GET /scheduling/{token}/slots` — PANEL only. Deliberately NOT a real
 * availability computation: interview-service has no free/busy integration
 * and no panel-book endpoint, so slot picking still happens on Nylas's
 * hosted page at `booking_url`. `slots_available` is just `booking_url != null`
 * (i.e. the host calendar grant resolved and Nylas generated a page). */
export interface SchedulingSlotsView {
  interview_type: InterviewType;
  duration_minutes: number;
  status: BookingStatus;
  booking_url: string | null;
  slots_available: boolean;
}

export interface FollowUpRequestView {
  id: string;
  booking_id: string;
  note_text: string;
  requested_by: string;
  requested_at: string;
}

export interface FollowUpRequestListView {
  booking_id: string;
  requests: FollowUpRequestView[];
}

export type ParticipantType = 'candidate' | 'interviewer';

export interface ParticipantView {
  participant_type: ParticipantType;
  participant_ref_id: string;
  joined_at: string;
  left_at: string | null;
  duration_seconds: number | null;
}

export interface ParticipationView {
  booking_id: string;
  participants: ParticipantView[];
}

export type ArtifactKind = 'recording' | 'transcript' | string;
export type HandoffStatus = 'pending' | 'in_progress' | 'handed_off' | 'failed' | string;

export interface ArtifactView {
  kind: ArtifactKind;
  external_ref: string;
  handoff_status: HandoffStatus;
  handed_off_at: string | null;
  playback_token: string | null;
}

export interface BookingArtifactsView {
  booking_id: string;
  artifacts: ArtifactView[];
}

export interface SessionStateView {
  booking_id: string;
  status: VideoSessionStatus;
  participants: ParticipantView[];
  recording_active: boolean;
  egress_id: string | null;
}

export interface RecordingView {
  booking_id: string;
  interview_type: InterviewType;
  start_time: string | null;
  kind: ArtifactKind;
  external_ref: string;
  handoff_status: HandoffStatus;
}

export interface InterviewerCalendarStatusView {
  interviewer_id: string;
  display_name: string | null;
  email: string | null;
  calendar_connected: boolean;
}

export interface BookingInterviewerCalendarStatusView {
  booking_id: string;
  interviewers: InterviewerCalendarStatusView[];
}

export interface ApiErrorDetails {
  code?: string;
  details?: unknown;
}

export class InterviewApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: ApiErrorDetails) {
    super(message);
    this.name = 'InterviewApiError';
    this.status = status;
    this.code = details?.code;
    this.details = details?.details;
  }
}

export type InterviewErrorAction =
  | 'login'
  | 'not-authorized'
  | 'not-your-session'
  | 'not-found'
  | 'not-ready'
  | 'disable-action'
  | 'refetch-slots'
  | 'expired-link'
  | 'inline-error'
  | 'unavailable'
  | 'hide-action'
  | 'contact-us'
  | 'toast';

export const getInterviewErrorAction = (error: InterviewApiError): InterviewErrorAction => {
  if (error.status === 401) return 'login';
  if (error.status === 410) return 'expired-link';
  if (error.status === 500) return 'toast';
  if (error.status === 409) return error.code === 'SLOT_FULL' ? 'refetch-slots' : 'disable-action';
  if (error.status === 422) return 'inline-error';
  if (error.status === 404)
    return error.code === 'RECORDING_NOT_AVAILABLE' ? 'not-ready' : 'not-found';
  if (error.status === 403)
    return error.code === 'NOT_SESSION_INTERVIEWER' ? 'not-your-session' : 'not-authorized';
  return 'toast';
};

interface Envelope<T> {
  status_code: number;
  status: 'success' | 'error';
  message: string;
  data: T | null;
}

interface InterviewFetchArgs extends FetchArgs {
  auth?: InterviewAuth;
}

const createIdempotencyKey = (): string => crypto.randomUUID();

const rawInterviewQuery = fetchBaseQuery({
  baseUrl: INTERVIEW_BASE_URL,
  prepareHeaders: (headers) => {
    if (import.meta.env.VITE_ENV === 'development')
      headers.set('ngrok-skip-browser-warning', 'true');
    return headers;
  },
});

const isEnvelope = (value: unknown): value is Envelope<unknown> =>
  typeof value === 'object' && value !== null && 'status_code' in value && 'message' in value;

const interviewBaseQuery: BaseQueryFn<InterviewFetchArgs, unknown, InterviewApiError> = async (
  args,
  api,
  extraOptions
) => {
  const { auth, ...request } = args;
  const headers = { ...(request.headers as Record<string, string> | undefined) };
  if (auth === 'platform') {
    const state = api.getState() as { LoginSlice?: { loginToken?: string } };
    const token = getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) || state.LoginSlice?.loginToken;
    if (token) headers.authorization = `Bearer ${token}`;
  } else {
    delete headers.authorization;
  }
  const result = await rawInterviewQuery({ ...request, headers }, api, extraOptions);
  const payload = result.data ?? result.error?.data;

  if (result.error) {
    const status = typeof result.error.status === 'number' ? result.error.status : 0;
    if (isEnvelope(payload)) {
      return {
        error: new InterviewApiError(payload.status_code || status, payload.message, {
          code:
            typeof (payload.data as ApiErrorDetails | null)?.code === 'string'
              ? (payload.data as ApiErrorDetails).code
              : undefined,
          details: payload.data,
        }),
      };
    }
    return {
      error: new InterviewApiError(status, 'Validation failed', {
        code: status === 422 ? 'VALIDATION_ERROR' : undefined,
        details: payload,
      }),
    };
  }

  if (!isEnvelope(payload)) {
    return { error: new InterviewApiError(0, 'Interview Service returned an invalid response') };
  }
  if (payload.status !== 'success' || payload.status_code >= 400) {
    return {
      error: new InterviewApiError(payload.status_code, payload.message, { details: payload.data }),
    };
  }
  return { data: payload.data };
};

const platform = (request: Omit<InterviewFetchArgs, 'auth'>): InterviewFetchArgs => ({
  ...request,
  auth: 'platform',
});
const publicRequest = (request: Omit<InterviewFetchArgs, 'auth'>): InterviewFetchArgs => ({
  ...request,
  auth: 'public',
});
const bookingLink = (request: Omit<InterviewFetchArgs, 'auth'>): InterviewFetchArgs => ({
  ...request,
  auth: 'booking-link',
});

export const interviewApi = createApi({
  reducerPath: 'interviewApi',
  baseQuery: interviewBaseQuery,
  tagTypes: ['Booking', 'Calendar', 'Dashboard', 'Interviewer', 'Timezone', 'Session'],
  endpoints: (build) => ({
    getCalendarConnectUrl: build.query<{ connect_url: string }, void>({
      query: () => platform({ url: '/calendar/connect-url' }),
    }),
    getCalendarGrantStatus: build.query<{ connected: boolean; email: string | null }, void>({
      query: () => platform({ url: '/calendar/grant-status' }),
      providesTags: ['Calendar'],
    }),
    disconnectCalendar: build.mutation<null, void>({
      query: () => platform({ url: '/calendar/disconnect', method: 'DELETE' }),
      invalidatesTags: ['Calendar'],
    }),
    createBooking: build.mutation<
      BookingView,
      { body: CreateBookingRequest; idempotencyKey?: string }
    >({
      query: ({ body, idempotencyKey }) =>
        platform({
          url: '/bookings',
          method: 'POST',
          body,
          headers: { 'Idempotency-Key': idempotencyKey ?? createIdempotencyKey() },
        }),
      invalidatesTags: ['Booking', 'Dashboard'],
    }),
    getBooking: build.query<BookingView, string>({
      query: (bookingId) => platform({ url: `/bookings/${bookingId}` }),
      providesTags: (_result, _error, id) => [{ type: 'Booking', id }],
    }),
    listBookings: build.query<
      PaginatedBookings,
      Partial<{
        candidate_id: string;
        job_id: string;
        round_id: string;
        status_filter: BookingStatus;
        interview_type: InterviewType;
        limit: number;
        cursor: string;
      }>
    >({ query: (params) => platform({ url: '/bookings', params }), providesTags: ['Booking'] }),
    cancelBooking: build.mutation<BookingView, { bookingId: string; reason?: string | null }>({
      query: ({ bookingId, reason }) =>
        platform({ url: `/bookings/${bookingId}/cancel`, method: 'POST', body: { reason } }),
      invalidatesTags: (_r, _e, { bookingId }) => [
        'Booking',
        'Dashboard',
        { type: 'Booking', id: bookingId },
      ],
    }),
    skipBooking: build.mutation<BookingView, { bookingId: string; reason?: string | null }>({
      query: ({ bookingId, reason }) =>
        platform({ url: `/bookings/${bookingId}/skip`, method: 'POST', body: { reason } }),
      invalidatesTags: (_r, _e, { bookingId }) => [
        'Booking',
        'Dashboard',
        { type: 'Booking', id: bookingId },
      ],
    }),
    substituteInterviewer: build.mutation<
      BookingView,
      { bookingId: string; new_interviewer_id: string }
    >({
      query: ({ bookingId, new_interviewer_id }) =>
        platform({
          url: `/bookings/${bookingId}/substitute-interviewer`,
          method: 'POST',
          body: { new_interviewer_id },
        }),
      invalidatesTags: (_r, _e, { bookingId }) => ['Booking', { type: 'Booking', id: bookingId }],
    }),
    updateBookingStatus: build.mutation<
      BookingView,
      { bookingId: string; target_status: BookingStatus; reason?: string | null }
    >({
      query: ({ bookingId, ...body }) =>
        platform({ url: `/bookings/${bookingId}/status`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { bookingId }) => [
        'Booking',
        'Dashboard',
        { type: 'Booking', id: bookingId },
      ],
    }),
    bulkUpdateBookingStatus: build.mutation<
      { results: Array<{ booking_id: string; success: boolean; error?: string }> },
      { items: Array<{ booking_id: string; target_status: BookingStatus; reason?: string | null }> }
    >({
      query: (body) => platform({ url: '/bookings/bulk-status', method: 'POST', body }),
      invalidatesTags: ['Booking', 'Dashboard'],
    }),
    bulkCreateBookings: build.mutation<
      {
        results: Array<{
          index: number;
          success: boolean;
          booking: BookingView | null;
          error: string | null;
        }>;
      },
      { items: CreateBookingRequest[] }
    >({
      query: (body) => platform({ url: '/bookings/bulk', method: 'POST', body }),
      invalidatesTags: ['Booking', 'Dashboard'],
    }),
    requestFollowUp: build.mutation<FollowUpRequestView, { bookingId: string; note_text: string }>({
      query: ({ bookingId, note_text }) =>
        platform({ url: `/bookings/${bookingId}/follow-up`, method: 'POST', body: { note_text } }),
      invalidatesTags: (_r, _e, { bookingId }) => [{ type: 'Booking', id: bookingId }],
    }),
    getFollowUps: build.query<FollowUpRequestListView, string>({
      query: (bookingId) => platform({ url: `/bookings/${bookingId}/follow-up` }),
      providesTags: (_r, _e, id) => [{ type: 'Booking', id }],
    }),
    getParticipation: build.query<ParticipationView, string>({
      query: (bookingId) => platform({ url: `/bookings/${bookingId}/participation` }),
    }),
    getArtifacts: build.query<BookingArtifactsView, string>({
      query: (bookingId) => platform({ url: `/bookings/${bookingId}/artifacts` }),
    }),
    getInterviewerCalendarStatus: build.query<BookingInterviewerCalendarStatusView, string>({
      query: (bookingId) => platform({ url: `/bookings/${bookingId}/interviewer-calendar-status` }),
      providesTags: (_r, _e, id) => [{ type: 'Booking', id }],
    }),
    attachRecording: build.mutation<ArtifactView, { bookingId: string; external_ref: string }>({
      query: ({ bookingId, external_ref }) =>
        platform({
          url: `/bookings/${bookingId}/recording`,
          method: 'POST',
          body: { external_ref },
        }),
      invalidatesTags: (_r, _e, { bookingId }) => [{ type: 'Booking', id: bookingId }],
    }),
    submitFeedback: build.mutation<
      unknown,
      { bookingId: string; recommendation: FeedbackRecommendation; notes: string }
    >({
      query: ({ bookingId, ...body }) =>
        platform({ url: `/bookings/${bookingId}/feedback`, method: 'POST', body }),
    }),
    getSchedulingLink: build.query<
      {
        interview_type: InterviewType;
        duration_minutes: number;
        status: BookingStatus;
        booking_url: string | null;
      },
      string
    >({ query: (token) => bookingLink({ url: `/scheduling/${token}` }) }),
    getSchedulingSlots: build.query<SchedulingSlotsView, string>({
      query: (token) => bookingLink({ url: `/scheduling/${token}/slots` }),
    }),
    getAiSlots: build.query<
      {
        interview_type: InterviewType;
        duration_minutes: number;
        slots: Array<{ start_time: string; end_time: string; remaining: number }>;
      },
      { token: string; date: string; timezone: string }
    >({
      query: ({ token, ...params }) =>
        bookingLink({ url: `/scheduling/${token}/ai-slots`, params }),
    }),
    bookAiSlot: build.mutation<
      { booking_id: string; start_time: string; end_time: string },
      { token: string; start_time: string; timezone: string }
    >({
      query: ({ token, ...body }) =>
        bookingLink({ url: `/scheduling/${token}/ai-slots/book`, method: 'POST', body }),
    }),
    callNow: build.mutation<CallNowView, string>({
      query: (token) => bookingLink({ url: `/scheduling/${token}/call-now`, method: 'POST' }),
    }),
    // Candidate's own post-round feedback link (GET /feedback/{token} +
    // POST). Token-only, no bearer — the candidate is not logged in.
    getCandidateFeedbackLink: build.query<{ interview_type: InterviewType }, string>({
      query: (token) => bookingLink({ url: `/feedback/${token}` }),
    }),
    submitCandidateFeedback: build.mutation<
      { booking_id: string; submitted_at: string },
      { token: string; rating: number; feedback_text: string }
    >({
      query: ({ token, ...body }) =>
        bookingLink({ url: `/feedback/${token}`, method: 'POST', body }),
    }),
    // Candidate self-withdrawal link. The bare GET is deliberately inert
    // (email clients pre-fetch links) — only submitWithdrawal's POST acts.
    getWithdrawalLink: build.query<{ organization_name: string | null }, string>({
      query: (token) => bookingLink({ url: `/withdraw/${token}` }),
    }),
    submitWithdrawal: build.mutation<{ booking_id: string; submitted_at: string }, string>({
      query: (token) => bookingLink({ url: `/withdraw/${token}`, method: 'POST' }),
    }),
    getRecording: build.query<RecordingView, string>({
      query: (token) => bookingLink({ url: `/recordings/${token}` }),
    }),
    joinSession: build.query<SessionTokenView, string>({
      query: (token) => bookingLink({ url: `/sessions/join/${token}` }),
    }),
    joinSessionAsInterviewer: build.query<SessionTokenView, string>({
      query: (token) => bookingLink({ url: `/sessions/join-as-interviewer/${token}` }),
    }),
    createInAppSessionToken: build.mutation<SessionTokenView, string>({
      query: (bookingId) => platform({ url: `/sessions/${bookingId}/token`, method: 'POST' }),
    }),
    getSessionState: build.query<SessionStateView, string>({
      query: (bookingId) => platform({ url: `/sessions/${bookingId}` }),
      providesTags: (_result, _error, id) => [{ type: 'Session', id }],
    }),
    endSession: build.mutation<BookingView, string>({
      query: (bookingId) => platform({ url: `/sessions/${bookingId}/end`, method: 'POST' }),
      invalidatesTags: ['Booking', 'Session', 'Dashboard'],
    }),
    getDashboardSummary: build.query<
      {
        job_id: string;
        total_bookings: number;
        status_counts: Partial<Record<BookingStatus, number>>;
        no_show_rate: number | null;
        completion_rate: number | null;
        completed_by_type: Partial<Record<InterviewType, number>>;
      },
      string
    >({
      query: (jobId) => platform({ url: '/dashboard/summary', params: { job_id: jobId } }),
      providesTags: ['Dashboard'],
    }),
    getInterviewers: build.query<
      { interviewers: Array<{ id: string; display_name: string; email: string }> },
      void
    >({ query: () => platform({ url: '/interviewers' }), providesTags: ['Interviewer'] }),
    getTimezones: build.query<{ timezones: Array<{ id: string; utc_offset: string }> }, void>({
      query: () => publicRequest({ url: '/timezones' }),
      providesTags: ['Timezone'],
    }),
  }),
});

export { createIdempotencyKey };
export const {
  useGetCalendarConnectUrlQuery,
  useLazyGetCalendarConnectUrlQuery,
  useGetCalendarGrantStatusQuery,
  useDisconnectCalendarMutation,
  useCreateBookingMutation,
  useGetBookingQuery,
  useListBookingsQuery,
  useCancelBookingMutation,
  useSkipBookingMutation,
  useSubstituteInterviewerMutation,
  useUpdateBookingStatusMutation,
  useBulkUpdateBookingStatusMutation,
  useBulkCreateBookingsMutation,
  useRequestFollowUpMutation,
  useGetFollowUpsQuery,
  useGetParticipationQuery,
  useGetArtifactsQuery,
  useGetInterviewerCalendarStatusQuery,
  useAttachRecordingMutation,
  useSubmitFeedbackMutation,
  useGetSchedulingLinkQuery,
  useGetSchedulingSlotsQuery,
  useGetAiSlotsQuery,
  useLazyGetAiSlotsQuery,
  useBookAiSlotMutation,
  useCallNowMutation,
  useGetCandidateFeedbackLinkQuery,
  useSubmitCandidateFeedbackMutation,
  useGetWithdrawalLinkQuery,
  useSubmitWithdrawalMutation,
  useGetRecordingQuery,
  useJoinSessionQuery,
  useJoinSessionAsInterviewerQuery,
  useCreateInAppSessionTokenMutation,
  useGetSessionStateQuery,
  useEndSessionMutation,
  useGetDashboardSummaryQuery,
  useGetInterviewersQuery,
  useGetTimezonesQuery,
} = interviewApi;
