import { useEffect, type RefObject } from 'react';

/**
 * Chrome/Edge show a native "Picture-in-Picture" hover icon in the
 * top-right corner of every `<video>` element by default — a browser
 * feature, not something LiveKit's `VideoTrack`/`ParticipantTile` opts
 * into or lets us configure via props. It sits in exactly the same corner
 * as our own per-tile `PinButton` (`absolute right-3 top-3`), so the two
 * visibly overlap. The only way to suppress it is the `disablePictureInPicture`
 * IDL property on the element itself — no CSS selector reaches it — so this
 * walks the room's video elements directly and sets it there, including
 * ones LiveKit attaches after this effect first runs (a participant's
 * camera track publishing, or the track element being recreated on a
 * processor/device switch).
 */
export function useDisablePictureInPicture(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const disableAll = () => {
      container.querySelectorAll('video').forEach((video) => {
        video.disablePictureInPicture = true;
      });
    };

    disableAll();

    const observer = new MutationObserver(disableAll);
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [containerRef]);
}

export default useDisablePictureInPicture;
