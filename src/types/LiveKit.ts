/**
 * LiveKit Type Definitions
 *
 * Replaces AgoraTokenResponse and related types
 * Used throughout the interview video system for type safety
 */

/**
 * LiveKit room configuration
 */
export interface LiveKitRoom {
  name: string;
  metadata?: string;
}

/**
 * LiveKit participant information
 */
export interface LiveKitParticipant {
  identity: string;
  name: string;
  sid: string;
  metadata?: string;
}

/**
 * Response from token generation endpoint
 * Returned by: POST /livekit/generate-token
 */
export interface LiveKitTokenResponse {
  /** LiveKit access token (JWT) */
  token: string;
  /** LiveKit server WebSocket URL */
  serverUrl: string;
  /** Interview room name */
  roomName: string;
  /** Participant identity/ID */
  participantIdentity: string;
  /** Participant display name */
  participantName: string;
  /** User role in interview */
  role: 'CANDIDATE' | 'RECRUITER' | 'INTERVIEWER';
  /** Interview booking ID (for recording metadata) */
  bookingId: string;
  /** Interview session ID (for recording metadata) */
  sessionId: string;
  /** Interview round ID */
  interviewRoundId?: string;
  /** Candidate ID */
  candidateId?: number | string;
  /** Categorized AI questions (if applicable) */
  categorizedQuestions?: Record<string, unknown>;
  /** Error message if token generation failed */
  error?: string;
}

/**
 * Request to start recording
 * Sent to: POST /livekit/recording/start
 */
export interface StartRecordingRequest {
  /** Interview token (JWT) */
  interviewToken: string;
}

/**
 * Response from start recording endpoint
 * Returned by: POST /livekit/recording/start
 */
export interface StartRecordingResponse {
  /** Unique egress recording job ID (null if recording starts asynchronously) */
  egressId: string | null;
  /** Room name being recorded */
  roomName: string;
  /** Recording status */
  recordingInProgress: boolean;
}

/**
 * Request to stop recording
 * Sent to: POST /livekit/recording/stop
 */
export interface StopRecordingRequest {
  /** Interview token (JWT) */
  interviewToken: string;
}

/**
 * Response from stop recording endpoint
 * Returned by: POST /livekit/recording/stop
 */
export interface StopRecordingResponse {
  /** Whether stop was initiated successfully */
  stopInitiated: boolean;
  /** Success message */
  message: string;
}

/**
 * Response from get recording status endpoint
 * Returned by: GET /livekit/recordings/status?egressId={id}
 */
export interface RecordingStatusResponse {
  /** Egress ID */
  egressId: string;
  /** Recording status: RUNNING | COMPLETED | FAILED */
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  /** Room being recorded */
  roomName: string;
  /** Bytes recorded so far */
  bytesRecorded: number;
  /** Duration in seconds */
  duration: number;
  /** S3 URL if completed */
  recordingUrl?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Interview configuration passed to components
 */
export interface InterviewConfig {
  /** Interview token from backend */
  token: LiveKitTokenResponse | null;
  /** Interview is in progress */
  isActive: boolean;
  /** Recording is active */
  isRecording: boolean;
  /** Egress ID for recording (null if not recording) */
  egressId: string | null;
}

/**
 * WebSocket message for participant status updates
 * Used by: SharedTimer, Interview components
 */
export interface ParticipantStatusMessage {
  type:
    | 'participant_joined'
    | 'participant_left'
    | 'mic_toggled'
    | 'camera_toggled'
    | 'screen_share_toggled';
  roomName: string;
  participantId: string;
  participantName: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

/**
 * WebSocket message for recording events
 * Used by: Interview component
 */
export interface RecordingStatusMessage {
  type: 'recording_started' | 'recording_stopped' | 'recording_failed';
  roomName: string;
  egressId?: string;
  recordingUrl?: string;
  timestamp: number;
  error?: string;
}

/**
 * WebSocket message for timer updates
 * Used by: SharedTimer component
 */
export interface TimerMessage {
  type: 'timer_update' | 'timer_ended';
  roomName: string;
  remainingSeconds: number;
  timestamp: number;
}
