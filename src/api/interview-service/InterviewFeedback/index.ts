/**
 * Interview Feedback API
 *
 * Handles post-interview feedback prompt flow:
 * - Check whether to show feedback prompt (deduplication)
 * - Submit quick feedback (rating + notes)
 * - Log skip action
 */

import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { getLocalStorageItem } from '../../../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../../../constants/webAPI';
import { get } from 'lodash-es';
import { handleRefreshToken } from '../../../services/AuthService';

const BASE_URL = `${import.meta.env.VITE_BACKEND_ENDPOINT}${import.meta.env.VITE_BACKEND_PREFIX}`;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState, endpoint }) => {
    const state = getState();
    const token: string | undefined =
      getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) || get(state, 'LoginSlice.loginToken');
    if (import.meta.env.VITE_ENV === 'development') {
      headers.set('ngrok-skip-browser-warning', 'true');
    }
    if (!['login', 'forgot-password'].includes(endpoint) && token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const isAuthError = (result: any) => {
  if (!result) return false;

  // Check result.error
  if (result.error) {
    if (result.error.status === 401) return true;
    const errorData = result.error.data as any;
    if (errorData) {
      if (errorData.status === 'UNAUTHORIZED' || errorData.code === 'AUTH_ERROR') return true;
      if (typeof errorData.message === 'string' && errorData.message.includes('token has expired'))
        return true;
    }
  }

  // Check result.data (in case backend returns 200 with error body)
  if (result.data) {
    const data = result.data as any;
    if (data.status === 'UNAUTHORIZED' || data.code === 'AUTH_ERROR') return true;
    if (typeof data.message === 'string' && data.message.includes('token has expired')) return true;
  }

  return false;
};

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (isAuthError(result)) {
    console.log('[InterviewFeedbackApi] Detected auth/expired token error. Refreshing token...');
    const refreshed = await handleRefreshToken();
    console.log('[InterviewFeedbackApi] Refresh token result:', refreshed);

    if (refreshed) {
      // Retry with new token
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  return result;
};

/**
 * Interview feedback API service using RTK Query
 *
 * All endpoints automatically include Authorization header via base query
 * Base URL: ${VITE_BACKEND_ENDPOINT}/v1
 */
export const interviewFeedbackApi = createApi({
  reducerPath: 'interviewFeedbackApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['FeedbackPrompt'],
  endpoints: (builder) => ({
    /**
     * 4.7 GET /should-prompt — Prompt Deduplication Check
     *
     * Determines whether the feedback prompt should be displayed.
     * Returns true when feedback has not been started, is partially completed,
     * or was previously skipped (and not dismissed).
     *
     * @param bookingId - The interview booking ID
     */
    shouldPromptFeedback: builder.query<
      {
        success: boolean;
        message: string;
        data: {
          shouldShowPrompt: boolean;
          currentStatus: string;
          feedbackId: number | null;
          reason: string;
        };
      },
      { bookingId: number }
    >({
      query: ({ bookingId }) => ({
        url: '/interview-feedback/should-prompt',
        params: { bookingId },
      }),
      providesTags: (_, __, { bookingId }) => [{ type: 'FeedbackPrompt', id: bookingId }],
    }),

    /**
     * 4.3 POST /quick-submit — Quick Feedback Submission
     *
     * Create or update lightweight interviewer feedback.
     * Supports save-as-draft (PARTIAL) and final submission (COMPLETED)
     * via the markAsCompleted flag.
     *
     * @param body - Quick feedback data
     * @returns Success response
     */
    quickSubmitFeedback: builder.mutation<
      { success: boolean; message: string },
      {
        bookingId: number;
        rating: number;
        notes?: string;
        decision?: 'STRONG_YES' | 'YES' | 'NEUTRAL' | 'NO' | 'STRONG_NO';
        actionSource?: string;
        markAsCompleted?: boolean;
      }
    >({
      query: (body) => ({
        url: '/interview-feedback/quick-submit',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_, __, { bookingId }) => [{ type: 'FeedbackPrompt', id: bookingId }],
    }),

    /**
     * 4.5 POST /skip — Log Skip Action
     *
     * Log that the interviewer chose to skip feedback.
     * Records the action source, timestamps the skip,
     * marks prompt as dismissed, and generates a FEEDBACK_PENDING notification.
     *
     * @param body - Skip action data
     * @returns Success response
     */
    skipFeedback: builder.mutation<
      { success: boolean; message: string },
      {
        bookingId: number;
        actionSource: string;
      }
    >({
      query: (body) => ({
        url: '/interview-feedback/skip',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_, __, { bookingId }) => [{ type: 'FeedbackPrompt', id: bookingId }],
    }),
  }),
});

/**
 * Auto-generated hooks from RTK Query
 */
export const {
  useLazyShouldPromptFeedbackQuery,
  useQuickSubmitFeedbackMutation,
  useSkipFeedbackMutation,
} = interviewFeedbackApi;

export default interviewFeedbackApi;
