import { useCallback } from 'react';
import {
  useLayoutContext,
  usePinnedTracks,
  type TrackReferenceOrPlaceholder,
} from '@livekit/components-react';

// Thin wrapper around LiveKit's OWN pin/focus system — `ParticipantTile`
// already dispatches `set_pin`/`clear_pin` to `LayoutContext` on click, but
// neither interview room wraps its tile area in a `LayoutContextProvider`
// today, so that click is silently inert. Wrapping the tile area (see
// `SpotlightStage.tsx`) turns that existing, unused wiring into a real
// feature instead of adding a second, parallel "which tile is focused"
// state machine next to LiveKit's own.
//
// Identity comparison is done by participant + source, NOT by object
// identity or by structural track equality — the AI's tile in the
// session-join flow (`InterviewRoomLayout.tsx`) is sometimes a real camera
// `ParticipantTile` and sometimes a `SoundwaveTile` with no camera track at
// all, pinned via a synthesized MICROPHONE `TrackReference` instead (see
// `pinMicrophone` below). LiveKit's pin reducer stores whatever
// `TrackReferenceOrPlaceholder` it's given without caring what kind of
// track it is, so this works for both cases as long as callers compare the
// same way this hook does.
const sameTrack = (
  a: TrackReferenceOrPlaceholder | undefined,
  b: { participant: { identity: string }; source: string }
): boolean => !!a && a.participant.identity === b.participant.identity && a.source === b.source;

export interface UseSpotlightResult {
  /** `undefined` when nothing is pinned — render the plain grid. */
  pinnedTrackRef: TrackReferenceOrPlaceholder | undefined;
  isPinned: (participantIdentity: string, source: string) => boolean;
  pin: (trackRef: TrackReferenceOrPlaceholder) => void;
  unpin: () => void;
  togglePin: (trackRef: TrackReferenceOrPlaceholder) => void;
}

/** Must be called from inside a `<LayoutContextProvider>` — see
 * `SpotlightStage.tsx`, which owns that wrapper so callers never forget it. */
export function useSpotlight(): UseSpotlightResult {
  const layoutContext = useLayoutContext();
  const pinned = usePinnedTracks(layoutContext);
  const pinnedTrackRef = pinned[0];

  const pin = useCallback(
    (trackRef: TrackReferenceOrPlaceholder) => {
      layoutContext.pin.dispatch?.({ msg: 'set_pin', trackReference: trackRef });
    },
    [layoutContext]
  );

  const unpin = useCallback(() => {
    layoutContext.pin.dispatch?.({ msg: 'clear_pin' });
  }, [layoutContext]);

  const isPinned = useCallback(
    (participantIdentity: string, source: string) =>
      sameTrack(pinnedTrackRef, { participant: { identity: participantIdentity }, source }),
    [pinnedTrackRef]
  );

  const togglePin = useCallback(
    (trackRef: TrackReferenceOrPlaceholder) => {
      if (sameTrack(pinnedTrackRef, trackRef)) {
        unpin();
      } else {
        pin(trackRef);
      }
    },
    [pinnedTrackRef, pin, unpin]
  );

  return { pinnedTrackRef, isPinned, pin, unpin, togglePin };
}
