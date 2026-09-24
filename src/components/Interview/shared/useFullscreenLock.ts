import { useEffect, useState } from 'react';
import { exitFullscreen, isDocumentFullscreen, requestFullscreen } from './fullscreen';

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
  const [isFullscreen, setIsFullscreen] = useState(() => isDocumentFullscreen());

  useEffect(() => {
    if (!enabled) return undefined;
    const handleChange = () => setIsFullscreen(isDocumentFullscreen());
    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('webkitfullscreenchange', handleChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
    };
  }, [enabled]);

  // Leaving the interview (this component unmounting) shouldn't leave the
  // browser stuck in fullscreen on whatever page comes next.
  useEffect(() => {
    if (!enabled) return undefined;
    return () => exitFullscreen();
  }, [enabled]);

  return {
    isFullscreen: enabled ? isFullscreen : true,
    requestFullscreen,
  };
}
