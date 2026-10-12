import { useEffect } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useRemoteParticipants,
  useTracks,
} from '@livekit/components-react';
import { ConnectionState, Track } from 'livekit-client';
import '@livekit/components-styles';
import { CameraTile, NoCameraTile } from '../../components/Interview/shared/CameraTile';
import { TileLabel } from '../../components/Interview/shared/TileLabel';
import { SoundwaveTile } from '../../components/Interview/soundwave/SoundwaveTile';
import { isAiInterviewer } from '../../components/Interview/shared/participantKind';
import {
  tileCellClass,
  tileGridClass,
  tileGridColumns,
} from '../../components/Interview/shared/tileGrid';
import { endRecording, readRecorderParams, startRecording } from './recorderSignals';

// The page LiveKit's egress service records. A passive viewer: it joins as a hidden
// recorder, never publishes, needs no sign-in (the token in the URL is the only
// credential) and shows no controls, so nothing but the call itself ends up in the video.
//
// Every participant gets a tile, which is the point of this page: LiveKit's built-in grid
// layout draws a black box for anyone without a video track, so the AI interviewer (audio
// only) and any interviewer with their camera off vanished from recordings. The tiles are
// the same ones the live call shows: video, a soundwave for the AI, initials for a person
// whose camera is off.

const RecorderRoom = () => {
  const connectionState = useConnectionState();
  const remoteParticipants = useRemoteParticipants();
  const cameraTrackRefs = useTracks([Track.Source.Camera], { onlySubscribed: true });
  const micTrackRefs = useTracks([Track.Source.Microphone], { onlySubscribed: true });

  // Once connected and drawing, so the recording starts on a page that is already showing
  // the room rather than a blank one.
  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return undefined;
    const frame = requestAnimationFrame(startRecording);
    return () => cancelAnimationFrame(frame);
  }, [connectionState]);

  const tiles = remoteParticipants.map((participant) => {
    const cameraRef = cameraTrackRefs.find(
      (ref) => ref.participant.identity === participant.identity
    );
    const micRef = micTrackRefs.find((ref) => ref.participant.identity === participant.identity);
    const name = participant.name || participant.identity || 'Participant';

    return (
      <div key={participant.identity} className="relative h-full w-full">
        {cameraRef ? (
          <CameraTile trackRef={cameraRef} participant={participant} name={name} />
        ) : isAiInterviewer(participant) ? (
          <>
            <SoundwaveTile audioTrackRef={micRef} label="" className="h-full w-full" />
            <TileLabel>{name}</TileLabel>
          </>
        ) : (
          <NoCameraTile participant={participant} name={name} />
        )}
      </div>
    );
  });

  return (
    <div className="h-screen w-screen overflow-hidden bg-neutral-950 p-3">
      <div
        className={tileGridClass(tiles.length)}
        style={{ gridTemplateColumns: tileGridColumns(tiles.length) }}
      >
        {tiles.map((tile) => (
          <div key={tile.key} className={tileCellClass(tiles.length)}>
            {tile}
          </div>
        ))}
      </div>
      {/* The call's audio has to play in this page for the recorder to capture it. */}
      <RoomAudioRenderer />
    </div>
  );
};

export const RecorderPage = () => {
  const { serverUrl, token } = readRecorderParams(window.location.search);

  // Opened by hand, or without what LiveKit adds, there is nothing to join.
  if (!serverUrl || !token) {
    return <div className="h-screen w-screen bg-neutral-950" />;
  }

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      audio={false}
      video={false}
      data-lk-theme="default"
      onDisconnected={endRecording}
    >
      <RecorderRoom />
    </LiveKitRoom>
  );
};

export default RecorderPage;
