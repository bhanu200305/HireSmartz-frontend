import { useCallback, useState } from 'react';
import {
  useLocalParticipant,
  useRemoteParticipants,
  useConnectionState,
  useTracks,
} from '@livekit/components-react';
import { ConnectionState, Track, Participant, type RemoteTrackPublication } from 'livekit-client';

/**
 * Configuration for useLiveKit hook
 */
export interface UseLiveKitConfig {
  /** LiveKit access token (null if not yet fetched) */
  token: string | null;
  /** LiveKit server URL (e.g., wss://your-server.com) */
  serverUrl: string | null;
  /** Room name to join */
  roomName: string | null;
  /** Interview booking ID (for recording metadata) */
  bookingId?: string;
  /** User role in interview */
  role: 'CANDIDATE' | 'RECRUITER' | 'INTERVIEWER';
  /** User display name */
  name: string;
}

/**
 * Media state for the current participant
 */
export interface MediaState {
  /** Is microphone enabled */
  micEnabled: boolean;
  /** Is camera enabled */
  cameraEnabled: boolean;
  /** Is screen sharing enabled */
  screenSharing: boolean;
}

/**
 * Return type for useLiveKit hook
 */
export interface UseLiveKitReturn {
  /** Local participant object (null if not connected) */
  localParticipant: Participant | undefined;
  /** Array of remote participants */
  remoteParticipants: Participant[];
  /** Current connection state */
  connectionState: ConnectionState;
  /** Media device states */
  mediaState: MediaState;
  /** Toggle microphone on/off */
  toggleMic: () => Promise<void>;
  /** Toggle camera on/off */
  toggleCam: () => Promise<void>;
  /** Toggle screen sharing on/off */
  toggleScreenShare: () => Promise<void>;
  /** Is connection established */
  isConnected: boolean;
  /** Loading state for mic toggle only */
  isMicLoading: boolean;
  /** Loading state for camera toggle only */
  isCamLoading: boolean;
  /** Loading state for screen share toggle only */
  isScreenShareLoading: boolean;
  /** Error message if connection failed */
  error: string | null;
  /**
   * True when any remote participant is actively screen sharing.
   * Use this to disable the local screen share button or show a tooltip.
   */
  isRemoteScreenSharing: boolean;
}

/**
 * Main LiveKit hook for managing video interview state and controls.
 *
 * This hook replaces the 720-line useAgora hook with a simplified LiveKit integration.
 * It handles:
 * - Connection management (via LiveKitRoom wrapper component)
 * - Media device toggles (mic, camera, screen share)
 * - Participant tracking (local + remote)
 * - Connection state monitoring
 *
 * **USAGE**:
 * ```tsx
 * const {
 *   localParticipant,
 *   remoteParticipants,
 *   toggleMic,
 *   toggleCam,
 *   isConnected,
 * } = useLiveKit(config);
 * ```
 *
 * **IMPORTANT**: This hook must be used INSIDE a `<LiveKitRoom>` component.
 * See Interview.tsx for wrapper implementation.
 *
 * **Comparison to useAgora**:
 * - ✅ No manual track creation (LiveKit handles it)
 * - ✅ No audio mixing code (server-side via Egress)
 * - ✅ No bot client code (screen share is native track)
 * - ✅ No MediaRecorder code (server-side recording)
 * - ✅ Simplified state management (200 lines vs 720 lines)
 *
 * @param config - Hook configuration
 * @returns Hook return object with controls and state
 * @throws Error if config missing required fields
 */
export const useLiveKit = (): UseLiveKitReturn => {
  // Get participant data from LiveKit context
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const connectionState = useConnectionState();

  // Track subscriptions — onlySubscribed: false ensures we track all published
  // tracks from all participants, even if autoSubscribe hasn't fired yet.
  // This prevents a new joiner from missing ongoing audio/video when they haven't
  // toggled their own mic/camera button yet.
  useTracks([Track.Source.Camera, Track.Source.Microphone, Track.Source.ScreenShare], {
    onlySubscribed: false,
  });

  /**
   * Detect if any remote participant is currently screen sharing.
   * Checks for a published, non-muted ScreenShare track publication.
   */
  const isRemoteScreenSharing = remoteParticipants.some((p) =>
    Array.from(p.trackPublications.values()).some(
      (pub: RemoteTrackPublication) => pub.source === Track.Source.ScreenShare && !pub.isMuted
    )
  );

  // Separate loading states per control so only the toggled button shows a spinner.
  // A single shared isLoading would show the spinner on ALL three buttons simultaneously.
  const [isMicLoading, setIsMicLoading] = useState<boolean>(false);
  const [isCamLoading, setIsCamLoading] = useState<boolean>(false);
  const [isScreenShareLoading, setIsScreenShareLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Toggle microphone on/off
   *
   * **Behavior**:
   * - If mic is enabled → disable it
   * - If mic is disabled → enable it
   * - Updates both locally and on remote participants
   * - WebSocket message sent automatically by LiveKit
   */
  const toggleMic = useCallback(async (): Promise<void> => {
    try {
      setIsMicLoading(true);
      setError(null);

      if (!localParticipant) {
        throw new Error('Local participant not connected');
      }

      const shouldEnable = !isMicrophoneEnabled;

      await localParticipant.setMicrophoneEnabled(shouldEnable);
      setIsMicLoading(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to toggle microphone';
      setError(errorMsg);
      setIsMicLoading(false);
      console.error('Microphone toggle error:', err);
    }
  }, [isMicrophoneEnabled, localParticipant]);

  /**
   * Toggle camera on/off
   *
   * **Behavior**:
   * - If camera is enabled → disable it
   * - If camera is disabled → enable it
   * - Updates both locally and on remote participants
   * - WebSocket message sent automatically by LiveKit
   */
  const toggleCam = useCallback(async (): Promise<void> => {
    try {
      setIsCamLoading(true);
      setError(null);

      if (!localParticipant) {
        throw new Error('Local participant not connected');
      }

      const shouldEnable = !isCameraEnabled;

      await localParticipant.setCameraEnabled(shouldEnable);
      setIsCamLoading(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to toggle camera';
      setError(errorMsg);
      setIsCamLoading(false);
      console.error('Camera toggle error:', err);
    }
  }, [isCameraEnabled, localParticipant]);

  /**
   * Toggle screen sharing on/off
   *
   * **Behavior**:
   * - If screen share is enabled → stop sharing
   * - If screen share is disabled → start sharing (prompts for screen selection)
   * - User must grant permission to share screen
   * - Updates both locally and on remote participants
   *
   * **Note**: Unlike Agora, no separate bot client needed.
   * Screen share is just another track published by local participant.
   */
  const toggleScreenShare = useCallback(async (): Promise<void> => {
    try {
      setIsScreenShareLoading(true);
      setError(null);

      if (!localParticipant) {
        throw new Error('Local participant not connected');
      }

      const shouldEnable = !isScreenShareEnabled;

      // Single screen share policy: block if a remote participant is already sharing.
      // The room event listener in InterviewContent handles the reverse case
      // (auto-stopping local share when a remote share starts).
      if (shouldEnable && isRemoteScreenSharing) {
        setError('Another participant is already sharing their screen');
        setIsScreenShareLoading(false);
        return;
      }

      await localParticipant.setScreenShareEnabled(shouldEnable);

      setIsScreenShareLoading(false);
    } catch (err) {
      // Screen share permission denied is not an error - user just cancelled
      if (err instanceof Error && err.message.includes('Permission denied')) {
        setError('Screen share permission denied');
      } else {
        const errorMsg = err instanceof Error ? err.message : 'Failed to toggle screen share';
        setError(errorMsg);
        console.error('Screen share toggle error:', err);
      }
      setIsScreenShareLoading(false);
    }
  }, [isScreenShareEnabled, isRemoteScreenSharing, localParticipant]);

  /**
   * Compute media state from track publications
   */
  const mediaState: MediaState = {
    micEnabled: isMicrophoneEnabled,
    cameraEnabled: isCameraEnabled,
    screenSharing: isScreenShareEnabled,
  };

  /**
   * Check if connection is established
   */
  const isConnected = connectionState === ConnectionState.Connected;

  return {
    localParticipant,
    remoteParticipants,
    connectionState,
    mediaState,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    isConnected,
    isMicLoading,
    isCamLoading,
    isScreenShareLoading,
    error,
    isRemoteScreenSharing,
  };
};

/**
 * MIGRATION NOTES:
 *
 * Comparison to useAgora (720 lines):
 *
 * ### REMOVED (not needed in LiveKit):
 * - Track creation/destruction logic (88 lines)
 * - Audio mixing (AudioContext) logic (43 lines)
 * - Bot client for screen sharing (166 lines)
 * - Client-side MediaRecorder (86 lines)
 * - Chunked upload logic (254 lines)
 * - RTM messaging (RTM client is separate)
 * - Complex state management (75 lines)
 *
 * ### KEPT (still needed):
 * - Mic/camera toggle logic (now simpler)
 * - Screen share toggle logic (now simpler, no bot needed)
 * - Connection state tracking
 *
 * ### ADDED (LiveKit-specific):
 * - Error handling for media operations
 * - Loading state management
 * - useConnectionState hook
 * - useTracks hook for subscription management
 *
 * Total: ~200 lines (68% reduction from Agora)
 *
 * Server-side responsibilities (moved from client):
 * - Recording: LiveKit Egress API (backend team)
 * - Audio mixing: LiveKit Egress server (backend team)
 * - Screen share: Native LiveKit track (no bot needed)
 */
