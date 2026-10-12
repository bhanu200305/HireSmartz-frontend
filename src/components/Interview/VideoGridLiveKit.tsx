/**
 * VideoGrid Component - LiveKit Version
 *
 * Displays video layout for interview participants
 * Replaces Agora-based VideoGrid with LiveKit's built-in components
 */

import React, { useEffect, useRef } from 'react';
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
import { CameraTile, NoCameraTile } from './shared/CameraTile';
import { useDisablePictureInPicture } from './shared/useDisablePictureInPicture';
import { isAiInterviewer } from './shared/participantKind';
import { tileCellClass, tileGridClass, tileGridColumns } from './shared/tileGrid';

interface VideoGridProps {
  token: LiveKitTokenResponse;
  liveKit: UseLiveKitReturn;
  isRecording: boolean;
  /** The candidate's real name, already resolved by the caller (decoded
   * interview token, falling back to `token.participantName` — see
   * InterviewLiveKit.tsx's own `smsCandidateName`). LiveKit's own
   * `participant.identity` for the candidate is a generic role string
   * ("candidate"), not a real name, so a remote tile falls back to
   * showing that literal word unless this is supplied. */
  candidateName?: string;
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
const VideoGridInner: React.FC<{ candidateName?: string }> = ({ candidateName }) => {
  const { localParticipant, cameraTrack: localCameraPublication } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const { isPinned, togglePin, pinnedTrackRef, unpin } = useSpotlight();

  const roomContainerRef = useRef<HTMLDivElement | null>(null);
  useDisablePictureInPicture(roomContainerRef);

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

  const localName = localParticipant.name || localParticipant.identity || 'You';

  const localSide: SpotlightSide & { identity: string; source: Track.Source } = {
    key: `${localParticipant.identity}-${Track.Source.Camera}`,
    identity: localParticipant.identity,
    source: Track.Source.Camera,
    node: (
      <div className="relative h-full w-full">
        {localCameraTrackRef ? (
          <CameraTile
            trackRef={localCameraTrackRef}
            participant={localParticipant}
            name={localName}
          />
        ) : (
          <NoCameraTile participant={localParticipant} name={localName} />
        )}
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
      // interview-service mints the candidate's LiveKit identity as the
      // generic role string "candidate", not their real name — `.name` is
      // never set for them either, so both halves of LiveKit's own
      // fallback resolve to that literal word. `candidateName` (decoded
      // from the interview token, passed down from InterviewLiveKit.tsx)
      // is the one place their real name actually exists on this side, so
      // it wins whenever this tile's identity marks it as the candidate's.
      const displayName =
        candidateName && participant.identity?.toLowerCase().startsWith('candidate')
          ? candidateName
          : participant.name || participant.identity || 'Interviewer';
      return {
        key: `${participant.identity}-${source}`,
        identity: participant.identity,
        source,
        node: (
          <div className="relative h-full w-full">
            {cameraRef ? (
              // Explicit TileLabel, not LiveKit's default template — that one
              // renders `participant.name`/`.identity` directly (no override),
              // which is the generic "candidate" text this tile exists to fix.
              <CameraTile trackRef={cameraRef} participant={participant} name={displayName} />
            ) : isAiInterviewer(participant) ? (
              // Only the AI interviewer gets the soundwave — it has no camera.
              // (It joins as a plain participant named "Iris", not as a LiveKit
              // agent, so `isAgent` alone never matches it.)
              <>
                <SoundwaveTile audioTrackRef={micRef} label="" className="h-full w-full" />
                <TileLabel>{displayName}</TileLabel>
              </>
            ) : (
              // A person with their camera off: initials, not a soundwave.
              <NoCameraTile participant={participant} name={displayName} />
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
    <div ref={roomContainerRef} className="relative w-full h-full bg-gray-900">
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
          // `repeat(auto-fit, minmax(240px, 1fr))` instead of a fixed
          // `grid-cols-1 sm:grid-cols-2` — the fixed 2-column cap only ever
          // fit the common 1 interviewer + 1 candidate case; a panel round
          // with 3+ interviewers just got crammed into (or clipped from) the
          // same two columns. auto-fit recomputes the column count itself
          // from however many tiles + however wide the container actually
          // is, so it keeps working unchanged as more interviewers join —
          // no per-count breakpoint list to maintain. `overflow-y-auto` is
          // the fallback once a very large panel's tiles hit their 220px
          // floor and no longer all fit — scroll, never clip.
          <div
            className={`${tileGridClass(allSides.length)} w-full p-3`}
            style={{ gridTemplateColumns: tileGridColumns(allSides.length) }}
          >
            {allSides.map((side) => (
              <div key={side.key} className={tileCellClass(allSides.length)}>
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

export const VideoGrid: React.FC<VideoGridProps> = ({ candidateName }) => (
  <LayoutContextProvider>
    <VideoGridInner candidateName={candidateName} />
  </LayoutContextProvider>
);

export default VideoGrid;
