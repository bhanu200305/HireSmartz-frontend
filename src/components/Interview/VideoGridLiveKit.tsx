/**
 * VideoGrid Component - LiveKit Version
 *
 * Displays video layout for interview participants
 * Replaces Agora-based VideoGrid with LiveKit's built-in components
 *
 * Much simpler than Agora version - no manual track management needed
 */

import React from 'react';
import {
  GridLayout,
  ParticipantTile,
  FocusLayoutContainer,
  FocusLayout,
  CarouselLayout,
  useRemoteParticipants,
  useLocalParticipant,
  useTracks,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import type { UseLiveKitReturn } from '../../hooks/useLiveKit';
import type { LiveKitTokenResponse } from '../../types/LiveKit';

interface VideoGridProps {
  token: LiveKitTokenResponse;
  liveKit: UseLiveKitReturn;
  isRecording: boolean;
}

export const VideoGrid: React.FC<VideoGridProps> = () => {
  // Return values unused here; kept the hook calls themselves (rather than
  // deleting them) since LiveKit context hooks like these commonly have
  // subscription side effects independent of their return value.
  useLocalParticipant();
  useRemoteParticipants();

  // Ensure withPlaceholder is true for the camera so local user tile renders immediately
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const screenShareTrack = tracks.find((t) => t.source === Track.Source.ScreenShare);
  const cameraTracks = tracks.filter((t) => t.source !== Track.Source.ScreenShare);

  return (
    <div className="relative w-full h-full bg-gray-900">
      <div className="video-grid-container w-full h-full absolute inset-0">
        {screenShareTrack ? (
          <FocusLayoutContainer>
            <CarouselLayout tracks={cameraTracks}>
              <ParticipantTile />
            </CarouselLayout>
            <FocusLayout trackRef={screenShareTrack} />
          </FocusLayoutContainer>
        ) : (
          <GridLayout tracks={tracks}>
            <ParticipantTile />
          </GridLayout>
        )}
      </div>

      <RoomAudioRenderer />
    </div>
  );
};

export default VideoGrid;
