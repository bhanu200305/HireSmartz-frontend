import { useEffect, useRef, useState } from 'react';
import {
  DisconnectButton,
  TrackToggle,
  useTracks,
  useRemoteParticipants,
  useLocalParticipant,
  useMediaDeviceSelect,
  LayoutContextProvider,
  type TrackReference,
} from '@livekit/components-react';
import { Track, ParticipantEvent } from 'livekit-client';
import { MdChatBubbleOutline, MdOutlineSettings, MdListAlt } from 'react-icons/md';
import { SoundwaveTile } from './soundwave/SoundwaveTile';
import { useSpotlight } from './shared/useSpotlight';
import { PinButton } from './shared/PinButton';
import { TileLabel } from './shared/TileLabel';
import { CameraTile, NoCameraTile } from './shared/CameraTile';
import { SpotlightStage, type SpotlightSide } from './shared/SpotlightStage';
import { ChatPanel, useUnreadChatCount } from './shared/ChatPanel';
import { SettingsPanel } from './shared/SettingsPanel';
import { PanelQuestionsPanel, usePanelQuestions } from './shared/PanelQuestionsPanel';
import { useFullscreenLock } from './shared/useFullscreenLock';
import { useDisablePictureInPicture } from './shared/useDisablePictureInPicture';
import { isAiInterviewer } from './shared/participantKind';
import { tileCellClass, tileGridClass, tileGridColumns } from './shared/tileGrid';

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
//
// PIN/SPOTLIGHT — added alongside chat/settings/background
// -------------------------------------------------------------------------
// Wraps the tile area in `LayoutContextProvider` so `ParticipantTile`'s own
// built-in pin-on-click (previously wired to nothing, see useSpotlight.ts)
// becomes real. Panel rounds can have 3+ human interviewers on the call —
// `SpotlightStage` handles that by falling back to a filmstrip of small
// tiles instead of a single PIP once there's more than one non-pinned side.

const InterviewRoomLayoutInner = ({ isInterviewer }: { isInterviewer: boolean }) => {
  const { localParticipant, cameraTrack: localCameraPublication } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const { isPinned, togglePin } = useSpotlight();

  const roomContainerRef = useRef<HTMLDivElement | null>(null);
  useDisablePictureInPicture(roomContainerRef);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPanelQuestionsOpen, setIsPanelQuestionsOpen] = useState(false);
  const unreadChatCount = useUnreadChatCount(isChatOpen);
  const panelQuestions = usePanelQuestions(isInterviewer);

  // Anti-cheating measures, candidate side only — see the scope decision
  // on this feature (interviewers keep full freedom to alt-tab/share).
  const isCandidate = !isInterviewer;
  const { isFullscreen, requestFullscreen } = useFullscreenLock(isCandidate);

  // Defense-in-depth against a candidate publishing a screen-share track
  // via devtools/console (there is no button for it in this UI to begin
  // with). This alone isn't the real enforcement boundary — LiveKit's
  // room-join token grants `canPublish: true` with no `canPublishSources`
  // restriction today, so a screen-share publish currently *succeeds*
  // server-side before this effect reacts and tears it back down. Actually
  // blocking it requires interview-service to scope the candidate's token
  // grant to camera+microphone only (flagged to pass on to backend).
  useEffect(() => {
    if (!isCandidate) return undefined;
    const handleLocalTrackPublished = (publication: { source: Track.Source }) => {
      if (
        publication.source === Track.Source.ScreenShare ||
        publication.source === Track.Source.ScreenShareAudio
      ) {
        void localParticipant.setScreenShareEnabled(false);
      }
    };
    localParticipant.on(ParticipantEvent.LocalTrackPublished, handleLocalTrackPublished);
    return () => {
      localParticipant.off(ParticipantEvent.LocalTrackPublished, handleLocalTrackPublished);
    };
  }, [localParticipant, isCandidate]);

  const cameraTrackRefs = useTracks([Track.Source.Camera], { onlySubscribed: true });
  const micTrackRefs = useTracks([Track.Source.Microphone], { onlySubscribed: true });

  // Flow B has no device-picker UI today — use LiveKit's own primitives
  // rather than duplicating Flow A's hand-rolled enumerate/switch logic a
  // second time (see plan's §7).
  const micDevices = useMediaDeviceSelect({ kind: 'audioinput' });
  const cameraDevices = useMediaDeviceSelect({ kind: 'videoinput' });
  const speakerDevices = useMediaDeviceSelect({ kind: 'audiooutput' });

  const localCameraTrackRef: TrackReference | undefined = localCameraPublication
    ? {
        participant: localParticipant,
        publication: localCameraPublication,
        source: Track.Source.Camera,
      }
    : undefined;

  const localName = localParticipant.name || 'You';

  const localTile = (
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
            : togglePin({
                participant: localParticipant,
                source: Track.Source.Camera,
              })
        }
        className="absolute right-3 top-3 z-10"
      />
    </div>
  );

  const remoteSides: (SpotlightSide & { identity: string; source: Track.Source })[] =
    remoteParticipants.length === 0
      ? []
      : remoteParticipants.map((participant) => {
          const cameraRef = cameraTrackRefs.find(
            (ref) => ref.participant.identity === participant.identity
          );
          const micRef = micTrackRefs.find(
            (ref) => ref.participant.identity === participant.identity
          );
          const pinRef: TrackReference | undefined = cameraRef ?? micRef;
          const source = cameraRef ? Track.Source.Camera : Track.Source.Microphone;
          const name = participant.name || participant.identity || 'Interviewer';
          const node = (
            <div className="relative h-full w-full">
              {cameraRef ? (
                <CameraTile trackRef={cameraRef} participant={participant} name={name} />
              ) : isAiInterviewer(participant) ? (
                <>
                  <SoundwaveTile audioTrackRef={micRef} label="" className="h-full w-full" />
                  <TileLabel>{name}</TileLabel>
                </>
              ) : (
                // A person with their camera off: initials, not a soundwave.
                <NoCameraTile participant={participant} name={name} />
              )}
              {pinRef && (
                <PinButton
                  pinned={isPinned(participant.identity, source)}
                  onClick={() => togglePin(pinRef)}
                  className="absolute right-3 top-3 z-10"
                />
              )}
            </div>
          );
          return { key: participant.identity, node, identity: participant.identity, source };
        });

  const localSide: SpotlightSide & { identity: string; source: Track.Source } = {
    key: localParticipant.identity,
    node: localTile,
    identity: localParticipant.identity,
    source: Track.Source.Camera,
  };

  const allSides = [localSide, ...remoteSides];
  const pinnedSide = allSides.find((side) => isPinned(side.identity, side.source));

  const showEmptyState = remoteParticipants.length === 0;

  return (
    <div ref={roomContainerRef} className="flex h-full w-full flex-col bg-neutral-950">
      <div className="relative flex-1 p-3">
        {pinnedSide ? (
          <SpotlightStage
            main={pinnedSide}
            others={allSides.filter((s) => s.key !== pinnedSide.key)}
          />
        ) : showEmptyState ? (
          // Alone in the room: just your own tile, full size. Nobody else's
          // card appears until they actually join.
          <div className="relative h-full min-h-[220px]">
            {localTile}
            <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-4">
              <span className="rounded-full bg-black/60 px-3 py-1.5 text-center text-xs font-medium text-white backdrop-blur-sm sm:text-sm">
                Waiting for others to join…
              </span>
            </div>
          </div>
        ) : (
          // Same reasoning as VideoGridLiveKit.tsx's identical block: a
          // fixed 2-column grid only ever fit 1 interviewer + 1 candidate.
          // Panel rounds routinely have 3+ human interviewers on the call
          // (see this file's own module comment) — `auto-fit` recomputes
          // the column count from however many tiles are actually present,
          // so it keeps accommodating them regardless of how many join,
          // with `overflow-y-auto` as the fallback once tiles hit their
          // 220px floor for a very large panel.
          <div
            className={tileGridClass(allSides.length)}
            style={{ gridTemplateColumns: tileGridColumns(allSides.length) }}
          >
            <div className={tileCellClass(allSides.length)}>{localTile}</div>
            {remoteSides.map((side) => (
              <div key={side.key} className={tileCellClass(allSides.length)}>
                {side.node}
              </div>
            ))}
          </div>
        )}

        {isChatOpen && (
          <div className="absolute inset-y-3 right-3 z-30 w-full max-w-sm">
            <ChatPanel open={isChatOpen} onClose={() => setIsChatOpen(false)} />
          </div>
        )}
        {isPanelQuestionsOpen && (
          <div className="absolute inset-y-3 right-3 z-30 w-full max-w-sm">
            <PanelQuestionsPanel
              open={isPanelQuestionsOpen}
              onClose={() => setIsPanelQuestionsOpen(false)}
              panelQuestions={panelQuestions}
            />
          </div>
        )}
        {isSettingsOpen && (
          <div className="absolute inset-y-3 right-3 z-30 w-full max-w-sm">
            <SettingsPanel
              open={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              devicesSection={
                <div className="flex flex-col gap-3 text-sm text-white">
                  <div>
                    <p className="mb-1 text-xs text-neutral-400">Microphone</p>
                    <select
                      value={micDevices.activeDeviceId}
                      onChange={(e) => void micDevices.setActiveMediaDevice(e.target.value)}
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5"
                    >
                      {micDevices.devices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || 'Microphone'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-neutral-400">Camera</p>
                    <select
                      value={cameraDevices.activeDeviceId}
                      onChange={(e) => void cameraDevices.setActiveMediaDevice(e.target.value)}
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5"
                    >
                      {cameraDevices.devices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || 'Camera'}
                        </option>
                      ))}
                    </select>
                  </div>
                  {speakerDevices.devices.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs text-neutral-400">Speaker</p>
                      <select
                        value={speakerDevices.activeDeviceId}
                        onChange={(e) => void speakerDevices.setActiveMediaDevice(e.target.value)}
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5"
                      >
                        {speakerDevices.devices.map((d) => (
                          <option key={d.deviceId} value={d.deviceId}>
                            {d.label || 'Speaker'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              }
            />
          </div>
        )}

        {isCandidate && !isFullscreen && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-neutral-950/95 text-center px-6">
            <p className="text-sm font-medium text-white">
              This interview must stay in fullscreen.
            </p>
            <p className="max-w-sm text-xs text-neutral-400">
              You exited fullscreen mode. Please return to continue your interview.
            </p>
            <button
              type="button"
              onClick={requestFullscreen}
              className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-neutral-950 hover:opacity-90 cursor-pointer"
            >
              Return To Fullscreen
            </button>
          </div>
        )}
      </div>

      {/* Room chrome — mic + camera toggle always both present for the
          candidate (never conditional on round type), plus chat/settings/leave. */}
      <div className="flex items-center justify-center gap-3 border-t border-neutral-800 bg-neutral-900 px-4 py-3">
        <TrackToggle
          source={Track.Source.Microphone}
          className="rounded-full border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 data-[lk-enabled=false]:bg-red-600 data-[lk-enabled=false]:border-red-600"
        />
        <TrackToggle
          source={Track.Source.Camera}
          className="rounded-full border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 data-[lk-enabled=false]:bg-red-600 data-[lk-enabled=false]:border-red-600"
        />
        <button
          type="button"
          onClick={() => {
            setIsChatOpen((v) => !v);
            setIsSettingsOpen(false);
            setIsPanelQuestionsOpen(false);
          }}
          className="relative rounded-full border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 cursor-pointer"
          aria-pressed={isChatOpen}
        >
          <MdChatBubbleOutline size={18} />
          {unreadChatCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-xs font-bold text-white">
              {unreadChatCount}
            </span>
          )}
        </button>
        {isInterviewer && (
          <button
            type="button"
            onClick={() => {
              setIsPanelQuestionsOpen((v) => !v);
              setIsChatOpen(false);
              setIsSettingsOpen(false);
            }}
            className="rounded-full border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 cursor-pointer"
            aria-pressed={isPanelQuestionsOpen}
            aria-label="Panel questions"
          >
            <MdListAlt size={18} />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setIsSettingsOpen((v) => !v);
            setIsChatOpen(false);
            setIsPanelQuestionsOpen(false);
          }}
          className="rounded-full border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 cursor-pointer"
          aria-pressed={isSettingsOpen}
          aria-label="Settings"
        >
          <MdOutlineSettings size={18} />
        </button>
        <DisconnectButton className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500">
          Leave
        </DisconnectButton>
      </div>
    </div>
  );
};

export const InterviewRoomLayout = ({ isInterviewer = false }: { isInterviewer?: boolean }) => (
  <LayoutContextProvider>
    <InterviewRoomLayoutInner isInterviewer={isInterviewer} />
  </LayoutContextProvider>
);

export default InterviewRoomLayout;
