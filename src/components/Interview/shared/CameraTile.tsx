import {
  ParticipantTile,
  VideoTrack,
  useIsMuted,
  type TrackReference,
} from '@livekit/components-react';
import type { Participant } from 'livekit-client';
import { CameraOffTile } from './CameraOffTile';
import { TileLabel } from './TileLabel';

// A camera that's published but switched off (setCameraEnabled(false) mutes
// rather than unpublishes) shows initials instead of a black frame. The
// label is ours, not LiveKit's default template — that one renders
// `participant.name`/`.identity` directly, with no way to override it.
export const CameraTile = ({
  trackRef,
  participant,
  name,
}: {
  trackRef: TrackReference;
  participant: Participant;
  name: string;
}) => {
  const isMuted = useIsMuted(trackRef);
  if (isMuted) {
    return (
      <>
        <CameraOffTile participant={participant} name={name} />
        <TileLabel>{name}</TileLabel>
      </>
    );
  }
  return (
    <ParticipantTile trackRef={trackRef} className="h-full w-full rounded-2xl">
      <VideoTrack trackRef={trackRef} />
      <TileLabel>{name}</TileLabel>
    </ParticipantTile>
  );
};

/** A person with no camera at all: initials and a name label. */
export const NoCameraTile = ({ participant, name }: { participant: Participant; name: string }) => (
  <>
    <CameraOffTile participant={participant} name={name} />
    <TileLabel>{name}</TileLabel>
  </>
);

export default CameraTile;
