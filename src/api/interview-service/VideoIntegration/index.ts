import { jwtDecode } from 'jwt-decode';
import { useCreateInAppSessionTokenMutation, useEndSessionMutation } from '../client';

type LegacyInterviewToken = {
  bookingId?: string;
  booking_id?: string;
  interviewBookingId?: string;
};

const bookingIdFrom = (token: string): string => {
  const claims = jwtDecode<LegacyInterviewToken>(token);
  const bookingId = claims.bookingId ?? claims.booking_id ?? claims.interviewBookingId;
  if (!bookingId) throw new Error('The interview link does not contain a booking id');
  return bookingId;
};

/**
 * Compatibility boundary for the legacy LiveKit screen. New code must import
 * the typed session hooks from `interview-service/client` directly.
 */
export const useGenerateLiveKitTokenMutation = (): [any] => {
  const [mintToken] = useCreateInAppSessionTokenMutation();
  return [
    ({
      interviewToken,
      participantName,
      participantIdentity,
      role,
    }: {
      interviewToken: string;
      participantName: string;
      participantIdentity: string;
      role: 'CANDIDATE' | 'RECRUITER' | 'INTERVIEWER';
    }) => ({
      unwrap: async () => {
        const bookingId = bookingIdFrom(interviewToken);
        const session = await mintToken(bookingId).unwrap();
        return {
          token: session.access_token,
          serverUrl: session.livekit_url,
          roomName: session.room,
          participantIdentity: session.identity || participantIdentity,
          participantName,
          role,
          bookingId,
          sessionId: session.room,
        };
      },
    }),
  ];
};

export const useStopRecordingMutation = (): [any] => [
  () => ({
    unwrap: async () => {
      throw new Error('Recording is managed by the Interview Service session');
    },
  }),
];

export const useEndInterviewForAllMutation = (): [any] => {
  const [endSession] = useEndSessionMutation();
  return [
    ({ interviewToken }: { interviewToken: string }) => ({
      unwrap: async () => endSession(bookingIdFrom(interviewToken)).unwrap(),
    }),
  ];
};
