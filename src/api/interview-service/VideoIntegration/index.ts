/**
 * LiveKit Video Integration API
 *
 * Replaces Agora API with LiveKit equivalents
 * Handles: token generation, recording management, status tracking
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  LiveKitTokenResponse,
  StartRecordingRequest,
  StartRecordingResponse,
  StopRecordingRequest,
  StopRecordingResponse,
  RecordingStatusResponse,
} from '../../../types/LiveKit';
import { getLocalStorageItem } from '../../../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../../../constants/webAPI';
import { get } from 'lodash-es';

const BASE_URL = `${import.meta.env.VITE_BACKEND_ENDPOINT}${import.meta.env.VITE_BACKEND_PREFIX}`;

/**
 * Video integration API service using RTK Query
 *
 * All endpoints automatically include Authorization header via base query
 * Base URL: ${VITE_BACKEND_ENDPOINT}/api/v1
 */
export const videoIntegrationApi = createApi({
  reducerPath: 'videoIntegrationApi',
  baseQuery: fetchBaseQuery({
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
  }),
  tagTypes: ['VideoToken', 'Recording', 'RecordingStatus'],
  endpoints: (builder) => ({
    /**
     * Generate LiveKit access token for interview
     *
     * Replaces: POST /agora/generate-agora-token
     *
     * @param interviewToken - JWT token from interview booking
     * @returns LiveKit token + room details
     */
    generateLiveKitToken: builder.mutation<
      LiveKitTokenResponse,
      {
        interviewToken: string;
        participantName: string;
        participantIdentity: string;
        role: 'CANDIDATE' | 'RECRUITER' | 'INTERVIEWER';
      }
    >({
      query: (body) => ({
        url: '/livekit/generate-token',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['VideoToken'],
    }),

    /**
     * Start server-side recording via LiveKit Egress
     *
     * Replaces: POST /interview/start-upload (conceptually)
     * Now backend handles everything via LiveKit API
     *
     * @param roomName - Interview room name
     * @param bookingId - Interview booking ID
     * @returns Egress ID for tracking + monitoring
     */
    startRecording: builder.mutation<StartRecordingResponse, StartRecordingRequest>({
      query: (body) => ({
        url: '/livekit/recording/start',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Recording'],
    }),

    /**
     * Stop active recording
     *
     * Replaces: POST /interview/merge-chunks (old chunked upload)
     * LiveKit Egress automatically uploads to S3
     *
     * @param interviewToken - Interview JWT token
     * @returns Stop confirmation message
     */
    stopRecording: builder.mutation<StopRecordingResponse, StopRecordingRequest>({
      query: (body) => ({
        url: '/livekit/recording/stop',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Recording'],
    }),

    /**
     * Check recording status (optional)
     *
     * Used for monitoring active recordings
     * Useful for long interviews to track progress
     *
     * @param egressId - ID of recording to check
     * @returns Current recording status + metadata
     */
    getRecordingStatus: builder.query<RecordingStatusResponse, string>({
      query: (egressId) => ({
        url: '/livekit/recordings/status',
        params: { egressId },
      }),
      providesTags: (_, __, egressId) => [{ type: 'RecordingStatus', id: egressId }],
    }),

    /**
     * Finalize recording after stop (triggers AI analysis)
     *
     * Called by: Interview component after stopRecording
     * Backend uses this to trigger AI analysis pipeline
     *
     * @param recordingUrl - S3 URL returned from stopRecording
     * @param bookingId - Interview booking ID
     */
    finalizeRecording: builder.mutation<
      { success: boolean; message: string },
      {
        recordingUrl: string;
        bookingId: string;
        sessionId: string;
        participantNames: string[];
      }
    >({
      query: (body) => ({
        url: '/interview/finalize-recording',
        method: 'POST',
        body,
      }),
    }),

    /**
     * End interview for everyone (drop the call)
     *
     * Ends the LiveKit room session and disconnects all participants
     * Called by recruiter/interviewer to terminate call for all attendees
     *
     * @param interviewToken - Interview JWT token
     * @returns Response with bookingId, roomName, status, recordingStopped, roomEnded, message
     */
    endInterviewForAll: builder.mutation<
      {
        bookingId: number;
        roomName: string;
        status: string;
        recordingStopped: boolean;
        roomEnded: boolean;
        message: string;
      },
      {
        interviewToken: string;
      }
    >({
      query: (body) => ({
        url: '/livekit/end-interview',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['VideoToken', 'Recording'],
    }),
  }),
});

/**
 * Auto-generated hooks from RTK Query
 * Usage in components:
 *
 * const [generateToken] = useGenerateLiveKitTokenMutation();
 * const { data: token, isLoading } = useGetRecordingStatusQuery(egressId);
 */
export const {
  useGenerateLiveKitTokenMutation,
  useStartRecordingMutation,
  useStopRecordingMutation,
  useGetRecordingStatusQuery,
  useFinalizeRecordingMutation,
  useEndInterviewForAllMutation,
} = videoIntegrationApi;

export default videoIntegrationApi;
