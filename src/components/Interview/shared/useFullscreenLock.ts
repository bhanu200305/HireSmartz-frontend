import { useEffect, useState } from 'react';
import {
  exitFullscreen,
  isDocumentFullscreen,
  isFullscreenSupported,
  requestFullscreen,
} from './fullscreen';

/**
 * Anti-cheating measure for the candidate side of an AI-video / hiring-panel
 * round. Entering fullscreen itself needs a real user gesture — that
 * happens at the "Join Interview" click in `DeviceCheckLobby`, before this
 * component (and the LiveKit room) even mounts (see that file's
 * `handleJoin`). This hook only tracks fullscreen state from then on, and
 * exposes `requestFullscreen` again for the re-entry prompt shown if the
 * candidate exits (Esc/F11) — that button click is itself a fresh gesture,
 * which is why re-entry can't happen automatically.
 *
 * Interviewer side is never locked (`enabled=false`) — see the scope
 * decision on this feature: interviewers keep full freedom to alt-tab.
 */
export function useFullscreenLock(enabled: boolean) {
  // Never enforce on a platform that can't grant fullscreen at all — most
  // notably iOS Safari (see isFullscreenSupported's own comment). Without
  // this, `isFullscreen` can never become true there, so the "return to
  // fullscreen" warning below would show permanently with a button that can
  // never actually work, rather than just not locking the candidate in the
  // first place.
  const locked = enabled && isFullscreenSupported();

  const [isFullscreen, setIsFullscreen] = useState(() => isDocumentFullscreen());

  useEffect(() => {
    if (!locked) return undefined;
    const handleChange = () => setIsFullscreen(isDocumentFullscreen());
    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('webkitfullscreenchange', handleChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
    };
  }, [locked]);

  // Leaving the interview (this component unmounting) shouldn't leave the
  // browser stuck in fullscreen on whatever page comes next.
  useEffect(() => {
    if (!locked) return undefined;
    return () => exitFullscreen();
  }, [locked]);

  return {
    isFullscreen: locked ? isFullscreen : true,
    requestFullscreen,
  };
}
