import {
  ParticipantTile,
  DisconnectButton,
  TrackToggle,
  useTracks,
  useRemoteParticipants,
  useLocalParticipant,
  type TrackReference,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { SoundwaveTile } from './soundwave/SoundwaveTile';

// The custom room UI that replaces LiveKit's stock `<VideoConference />`
// (what `SessionJoinScreen` used before this component existed — a generic
// grid of plain video tiles, no per-participant customization).
//
// PER-PARTICIPANT RENDERING IS TRACK-DRIVEN, NOT ROUND-TYPE-DRIVEN
// -------------------------------------------------------------------------
// Neither `SessionTokenView` (the candidate's actual join response) nor any
// other candidate-facing session endpoint carries `interview_type` or
// `presentation_mode` — confirmed directly against interview-service's
// `mint_session_token.py`/`video_session_dto.py`. So this layout never asks
// "is this a PANEL or an AI_VIDEO round" — it looks at what each remote
// participant has actually published:
//   - has a subscribed camera track -> real video tile (every PANEL
//     interviewer, and automatically covers a future avatar-video AI agent
//     too, with zero change here, the day ai-service ever publishes one)
//   - audio only, no camera track   -> SoundwaveTile (today, always the
//     AI_VIDEO agent — ai-service's own agent never publishes video, see
//     SoundwaveTile's own module comment)
//
// The candidate's OWN tile is never track-driven — always a real camera
// tile, always with both mic and camera toggles, for every round type. Per
// product decision: the candidate's camera stays on in AI_VIDEO rounds too,
// it's only the *other* side of the call that goes audio-only.
export const InterviewRoomLayout = () => {
  const { localParticipant, cameraTrack: localCameraPublication } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  const cameraTrackRefs = useTracks([Track.Source.Camera], { onlySubscribed: true });
  const micTrackRefs = useTracks([Track.Source.Microphone], { onlySubscribed: true });

  const localCameraTrackRef: TrackReference | undefined = localCameraPublication
    ? {
        participant: localParticipant,
        publication: localCameraPublication,
        source: Track.Source.Camera,
      }
    : undefined;

  return (
    <div className="flex h-full w-full flex-col bg-neutral-950">
      <div className="grid flex-1 grid-cols-1 gap-3 p-3 sm:grid-cols-2">
        {/* Local — the candidate. Always a real camera tile, never the
            waveform, regardless of round type. */}
        <div className="min-h-[220px]">
          {localCameraTrackRef ? (
            <ParticipantTile trackRef={localCameraTrackRef} className="h-full w-full rounded-2xl" />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-2xl bg-neutral-900 text-sm text-neutral-500">
              Camera off
            </div>
          )}
        </div>

        {/* Remote — one tile per remote participant. Empty room (nobody has
            joined the AI agent / interviewer yet) still shows a waiting
            waveform in the 'connecting' state rather than a blank slot, so
            the layout doesn't jump the moment they do join. */}
        {remoteParticipants.length === 0 ? (
          <div className="min-h-[220px]">
            <SoundwaveTile audioTrackRef={undefined} label="Waiting to join…" />
          </div>
        ) : (
          remoteParticipants.map((participant) => {
            const cameraRef = cameraTrackRefs.find(
              (ref) => ref.participant.identity === participant.identity
            );
            const micRef = micTrackRefs.find(
              (ref) => ref.participant.identity === participant.identity
            );
            return (
              <div key={participant.identity} className="min-h-[220px]">
                {cameraRef ? (
                  <ParticipantTile trackRef={cameraRef} className="h-full w-full rounded-2xl" />
                ) : (
                  <SoundwaveTile audioTrackRef={micRef} label="Interviewer" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Room chrome — mic + camera toggle always both present for the
          candidate (never conditional on round type), plus leave. */}
      <div className="flex items-center justify-center gap-3 border-t border-neutral-800 bg-neutral-900 px-4 py-3">
        <TrackToggle
          source={Track.Source.Microphone}
          className="rounded-full border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 data-[lk-enabled=false]:bg-red-600 data-[lk-enabled=false]:border-red-600"
        />
        <TrackToggle
          source={Track.Source.Camera}
          className="rounded-full border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 data-[lk-enabled=false]:bg-red-600 data-[lk-enabled=false]:border-red-600"
        />
        <DisconnectButton className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500">
          Leave
        </DisconnectButton>
      </div>
    </div>
  );
};

export default InterviewRoomLayout;
