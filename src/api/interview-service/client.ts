import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
} from '@reduxjs/toolkit/query/react';
import { getLocalStorageItem } from '../../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';

const INTERVIEW_BASE_URL = `${import.meta.env.VITE_BACKEND_ENDPOINT}/api/v1`;

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

export interface BookingView {
  id: string;
  status: BookingStatus;
  interview_type: InterviewType;
  candidate_id: string;
  job_id: string;
  round_id: string;
  sequence_no: number;
  round_snapshot: Record<string, unknown> | null;
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
      invalidatesTags: ['Booking', 'Dashboard'],
    }),
    skipBooking: build.mutation<BookingView, { bookingId: string; reason?: string | null }>({
      query: ({ bookingId, reason }) =>
        platform({ url: `/bookings/${bookingId}/skip`, method: 'POST', body: { reason } }),
      invalidatesTags: ['Booking', 'Dashboard'],
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
      invalidatesTags: ['Booking'],
    }),
    updateBookingStatus: build.mutation<
      BookingView,
      { bookingId: string; target_status: BookingStatus; reason?: string | null }
    >({
      query: ({ bookingId, ...body }) =>
        platform({ url: `/bookings/${bookingId}/status`, method: 'POST', body }),
      invalidatesTags: ['Booking', 'Dashboard'],
    }),
    bulkUpdateBookingStatus: build.mutation<
      { results: Array<{ booking_id: string; success: boolean; error?: string }> },
      { items: Array<{ booking_id: string; target_status: BookingStatus; reason?: string | null }> }
    >({
      query: (body) => platform({ url: '/bookings/bulk-status', method: 'POST', body }),
      invalidatesTags: ['Booking', 'Dashboard'],
    }),
    bulkCreateBookings: build.mutation<
      { results: Array<{ success: boolean; booking?: BookingView; error?: string }> },
      { items: CreateBookingRequest[] }
    >({
      query: (body) => platform({ url: '/bookings/bulk', method: 'POST', body }),
      invalidatesTags: ['Booking', 'Dashboard'],
    }),
    requestFollowUp: build.mutation<unknown, { bookingId: string; note_text: string }>({
      query: ({ bookingId, note_text }) =>
        platform({ url: `/bookings/${bookingId}/follow-up`, method: 'POST', body: { note_text } }),
    }),
    getFollowUps: build.query<unknown, string>({
      query: (bookingId) => platform({ url: `/bookings/${bookingId}/follow-up` }),
    }),
    getParticipation: build.query<unknown, string>({
      query: (bookingId) => platform({ url: `/bookings/${bookingId}/participation` }),
    }),
    getArtifacts: build.query<unknown, string>({
      query: (bookingId) => platform({ url: `/bookings/${bookingId}/artifacts` }),
    }),
    attachRecording: build.mutation<unknown, { bookingId: string; external_ref: string }>({
      query: ({ bookingId, external_ref }) =>
        platform({
          url: `/bookings/${bookingId}/recording`,
          method: 'POST',
          body: { external_ref },
        }),
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
    getSchedulingSlots: build.query<unknown, string>({
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
    callNow: build.mutation<unknown, string>({
      query: (token) => bookingLink({ url: `/scheduling/${token}/call-now`, method: 'POST' }),
    }),
    getRecording: build.query<{ booking_id: string; external_ref: string }, string>({
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
    getSessionState: build.query<unknown, string>({
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
  useAttachRecordingMutation,
  useSubmitFeedbackMutation,
  useGetSchedulingLinkQuery,
  useGetSchedulingSlotsQuery,
  useGetAiSlotsQuery,
  useLazyGetAiSlotsQuery,
  useBookAiSlotMutation,
  useCallNowMutation,
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
