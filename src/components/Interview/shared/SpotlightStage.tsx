import { useRef, type ReactNode } from 'react';
import ResizablePipTile from './ResizablePipTile';

export type SpotlightSide = {
  key: string;
  node: ReactNode;
};

export type SpotlightStageProps = {
  main: SpotlightSide;
  others: SpotlightSide[];
};

// Renders once something is pinned (the caller decides plain-grid vs.
// spotlight — see VideoGridLiveKit.tsx / InterviewRoomLayout.tsx). Takes
// arbitrary ReactNode per side rather than LiveKit TrackReferences, on
// purpose: LiveKit's own `FocusLayoutContainer`/`CarouselLayout` prefabs
// only render real camera TrackReferences via `ParticipantTile`, which
// can't host `SoundwaveTile` (the AI participant has no camera track — see
// InterviewRoomLayout.tsx's module comment) — so this stage is deliberately
// track-agnostic instead of reusing those prefabs, to work whether the
// non-pinned sides are real video tiles, the AI's waveform, or a mix.
//
// Exactly one "other" side (the common 1-on-1 case) gets the full
// draggable/resizable PIP treatment. Two or more get a simple fixed-size
// filmstrip along the bottom instead — resize is deliberately scoped to the
// single-PIP case only (confirmed with the user), a panel round with
// several interviewers just needs everyone visibly reachable, not each
// individually resizable.
export const SpotlightStage = ({ main, others }: SpotlightStageProps) => {
  const stageRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={stageRef} className="relative h-full w-full overflow-hidden rounded-2xl">
      <div className="h-full w-full">{main.node}</div>

      {others.length === 1 && (
        <ResizablePipTile stageRef={stageRef}>{others[0].node}</ResizablePipTile>
      )}

      {others.length > 1 && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex gap-2 overflow-x-auto p-3">
          {others.map((side) => (
            <div
              key={side.key}
              className="aspect-video h-24 shrink-0 overflow-hidden rounded-xl border-2 border-white/20 shadow-lg sm:h-28"
            >
              {side.node}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpotlightStage;
