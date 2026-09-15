/**
 * VideoGrid Component - LiveKit Version
 *
 * Displays video layout for interview participants
 * Replaces Agora-based VideoGrid with LiveKit's built-in components
 */

import React, { useEffect } from 'react';
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
  LayoutContextProvider,
  type TrackReferenceOrPlaceholder,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import type { UseLiveKitReturn } from '../../hooks/useLiveKit';
import type { LiveKitTokenResponse } from '../../types/LiveKit';
import { useSpotlight } from './shared/useSpotlight';
import { PinButton } from './shared/PinButton';
import { SpotlightStage, type SpotlightSide } from './shared/SpotlightStage';

interface VideoGridProps {
  token: LiveKitTokenResponse;
  liveKit: UseLiveKitReturn;
  isRecording: boolean;
}

// PIN/SPOTLIGHT — added alongside chat/settings/background (see
// InterviewRoomLayout.tsx's own module comment for the shared reasoning).
//
// GridLayout clones one static `children` template per track internally —
// it has no per-tile render hook, so there's no way to attach a `PinButton`
// (with its own per-participant `onClick` closure) to each auto-generated
// tile. Switched the default (no screenshare) case to explicit `.map()`
// rendering instead, same approach `InterviewRoomLayout.tsx` (the other
// interview flow) already uses — keeps both visually/architecturally
// consistent, and only the plain-grid case needed to change: the
// screenshare `FocusLayoutContainer`/`CarouselLayout`/`FocusLayout` path
// below is untouched, since pin is deliberately suppressed while someone is
// sharing their screen (screenshare already has its own "what's focused"
// answer).
const VideoGridInner: React.FC = () => {
  // Return values unused here; kept the hook calls themselves (rather than
  // deleting them) since LiveKit context hooks like these commonly have
  // subscription side effects independent of their return value.
  useLocalParticipant();
  useRemoteParticipants();
  const { isPinned, togglePin, pinnedTrackRef, unpin } = useSpotlight();

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

  // Screenshare owns "what's focused" while active — clear any spotlight
  // pin so returning from a share doesn't leave a stale one behind.
  useEffect(() => {
    if (screenShareTrack && pinnedTrackRef) unpin();
    // Only react to screenshare starting, not to the pin/unpin functions
    // themselves (stable across renders, but not worth depending on).
  }, [!!screenShareTrack]);

  const sides: SpotlightSide[] = cameraTracks.map((trackRef) => ({
    key: `${trackRef.participant.identity}-${trackRef.source}`,
    node: (
      <div className="relative h-full w-full">
        <ParticipantTile trackRef={trackRef} className="h-full w-full" />
        <PinButton
          pinned={isPinned(trackRef.participant.identity, trackRef.source)}
          onClick={() => togglePin(trackRef)}
          className="absolute right-3 top-3 z-10"
        />
      </div>
    ),
  }));

  const pinnedIndex = cameraTracks.findIndex(
    (t) =>
      pinnedTrackRef &&
      t.participant.identity === pinnedTrackRef.participant.identity &&
      t.source === pinnedTrackRef.source
  );

  return (
    <div className="relative w-full h-full bg-gray-900">
      <div className="video-grid-container w-full h-full absolute inset-0">
        {screenShareTrack ? (
          <FocusLayoutContainer>
            <CarouselLayout tracks={cameraTracks}>
              <ParticipantTile />
            </CarouselLayout>
            <FocusLayout trackRef={screenShareTrack as TrackReferenceOrPlaceholder} />
          </FocusLayoutContainer>
        ) : pinnedIndex !== -1 ? (
          <div className="h-full w-full p-3">
            <SpotlightStage
              main={sides[pinnedIndex]}
              others={sides.filter((_, i) => i !== pinnedIndex)}
            />
          </div>
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

export const VideoGrid: React.FC<VideoGridProps> = () => (
  <LayoutContextProvider>
    <VideoGridInner />
  </LayoutContextProvider>
);

export default VideoGrid;
