/**
 * VideoGrid Component - LiveKit Version
 *
 * Displays video layout for interview participants
 * Replaces Agora-based VideoGrid with LiveKit's built-in components
 */

import React, { useEffect } from 'react';
import {
  ParticipantTile,
  FocusLayoutContainer,
  FocusLayout,
  CarouselLayout,
  useRemoteParticipants,
  useLocalParticipant,
  useTracks,
  RoomAudioRenderer,
  LayoutContextProvider,
  type TrackReference,
  type TrackReferenceOrPlaceholder,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import type { UseLiveKitReturn } from '../../hooks/useLiveKit';
import type { LiveKitTokenResponse } from '../../types/LiveKit';
import { useSpotlight } from './shared/useSpotlight';
import { PinButton } from './shared/PinButton';
import { SpotlightStage, type SpotlightSide } from './shared/SpotlightStage';
import { SoundwaveTile } from './soundwave/SoundwaveTile';
import { TileLabel } from './shared/TileLabel';

interface VideoGridProps {
  token: LiveKitTokenResponse;
  liveKit: UseLiveKitReturn;
  isRecording: boolean;
}

// PIN/SPOTLIGHT — added alongside chat/settings/background (see
// InterviewRoomLayout.tsx's own module comment for the shared reasoning).
//
// PER-PARTICIPANT RENDERING IS TRACK-DRIVEN, NOT ROUND-TYPE-DRIVEN — same
// reasoning as InterviewRoomLayout.tsx's own module comment: a remote
// participant with a subscribed camera track gets a real `ParticipantTile`;
// one with audio only (today, always the AI_VIDEO agent — ai-service's own
// agent never publishes video, see SoundwaveTile's own module comment) gets
// `SoundwaveTile` instead. This used to be built from `useTracks([{source:
// Camera, withPlaceholder: true}])` alone, which — for a participant that
// will NEVER publish a camera, not just one with it toggled off — rendered
// LiveKit's own bare "camera off" placeholder box instead: easy to miss
// even in the full grid, and easy to mistake for "gone entirely" once
// shrunk into the small spotlight PIP corner. GridLayout also clones one
// static `children` template per track internally — it has no per-tile
// render hook, so there was no way to substitute `SoundwaveTile` for the
// AI's tile there either. Both the plain grid and the pinned/spotlight
// stage now build their tiles from the same explicit `.map()`, so the
// AI's presence looks identical (and unmistakable) in either state — it
// never disappears or degrades to a blank box when the other side is
// pinned/maximized.
const VideoGridInner: React.FC = () => {
  const { localParticipant, cameraTrack: localCameraPublication } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const { isPinned, togglePin, pinnedTrackRef, unpin } = useSpotlight();

  const cameraTrackRefs = useTracks([Track.Source.Camera], { onlySubscribed: true });
  const micTrackRefs = useTracks([Track.Source.Microphone], { onlySubscribed: true });
  const screenShareTrackRefs = useTracks(
    [{ source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: true }
  );
  const screenShareTrack = screenShareTrackRefs[0];

  // Screenshare owns "what's focused" while active — clear any spotlight
  // pin so returning from a share doesn't leave a stale one behind.
  useEffect(() => {
    if (screenShareTrack && pinnedTrackRef) unpin();
    // Only react to screenshare starting, not to the pin/unpin functions
    // themselves (stable across renders, but not worth depending on).
  }, [!!screenShareTrack]);

  const localCameraTrackRef: TrackReference | undefined = localCameraPublication
    ? {
        participant: localParticipant,
        publication: localCameraPublication,
        source: Track.Source.Camera,
      }
    : undefined;

  const localSide: SpotlightSide & { identity: string; source: Track.Source } = {
    key: `${localParticipant.identity}-${Track.Source.Camera}`,
    identity: localParticipant.identity,
    source: Track.Source.Camera,
    node: (
      <div className="relative h-full w-full">
        <ParticipantTile trackRef={localCameraTrackRef} className="h-full w-full" />
        <PinButton
          pinned={isPinned(localParticipant.identity, Track.Source.Camera)}
          onClick={() =>
            localCameraTrackRef
              ? togglePin(localCameraTrackRef)
              : togglePin({ participant: localParticipant, source: Track.Source.Camera })
          }
          className="absolute right-3 top-3 z-10"
        />
      </div>
    ),
  };

  const remoteSides: (SpotlightSide & { identity: string; source: Track.Source })[] =
    remoteParticipants.map((participant) => {
      const cameraRef = cameraTrackRefs.find(
        (ref) => ref.participant.identity === participant.identity
      );
      const micRef = micTrackRefs.find((ref) => ref.participant.identity === participant.identity);
      const pinRef: TrackReferenceOrPlaceholder | undefined = cameraRef ?? micRef;
      const source = cameraRef ? Track.Source.Camera : Track.Source.Microphone;
      return {
        key: `${participant.identity}-${source}`,
        identity: participant.identity,
        source,
        node: (
          <div className="relative h-full w-full">
            {cameraRef ? (
              <ParticipantTile trackRef={cameraRef} className="h-full w-full" />
            ) : (
              <>
                <SoundwaveTile audioTrackRef={micRef} label="" className="h-full w-full" />
                <TileLabel>Interviewer</TileLabel>
              </>
            )}
            {pinRef && (
              <PinButton
                pinned={isPinned(participant.identity, source)}
                onClick={() => togglePin(pinRef)}
                className="absolute right-3 top-3 z-10"
              />
            )}
          </div>
        ),
      };
    });

  const allSides = [localSide, ...remoteSides];
  const pinnedSide = allSides.find(
    (side) => pinnedTrackRef && isPinned(side.identity, side.source)
  );

  return (
    <div className="relative w-full h-full bg-gray-900">
      <div className="video-grid-container w-full h-full absolute inset-0">
        {screenShareTrack ? (
          <FocusLayoutContainer>
            <CarouselLayout tracks={cameraTrackRefs}>
              <ParticipantTile />
            </CarouselLayout>
            <FocusLayout trackRef={screenShareTrack as TrackReferenceOrPlaceholder} />
          </FocusLayoutContainer>
        ) : pinnedSide ? (
          <div className="h-full w-full p-3">
            <SpotlightStage
              main={pinnedSide}
              others={allSides.filter((s) => s.key !== pinnedSide.key)}
            />
          </div>
        ) : (
          <div className="grid h-full w-full grid-cols-1 gap-3 p-3 sm:grid-cols-2">
            {allSides.map((side) => (
              <div key={side.key} className="min-h-[220px]">
                {side.node}
              </div>
            ))}
          </div>
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
