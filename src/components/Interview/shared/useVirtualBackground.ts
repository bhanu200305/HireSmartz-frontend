import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import type { LocalVideoTrack } from 'livekit-client';
import {
  BackgroundProcessor,
  supportsBackgroundProcessors,
  type BackgroundProcessorWrapper,
} from '@livekit/track-processors';

export type BackgroundMode = 'none' | 'blur' | 'image';

export interface UseVirtualBackgroundResult {
  mode: BackgroundMode;
  isSupported: boolean;
  isApplying: boolean;
  error: string | null;
  setNone: () => void;
  setBlur: (radius: number) => void;
  setImage: (imagePath: string) => void;
}

// Applies to the candidate's OWN camera only — never a remote track, never
// treated as a UI/page background. One `BackgroundProcessorWrapper` is
// created per mount and reused via `.switchTo(...)` for every mode change
// (never recreated), per the package's own documented pattern — recreating
// it on every toggle would cause a visible reattach glitch each time.
export function useVirtualBackground(): UseVirtualBackgroundResult {
  const { localParticipant, cameraTrack } = useLocalParticipant();
  const [mode, setModeState] = useState<BackgroundMode>('none');
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const processorRef = useRef<BackgroundProcessorWrapper | null>(null);
  const isSupported = useRef(supportsBackgroundProcessors()).current;

  const getVideoTrack = useCallback((): LocalVideoTrack | undefined => {
    const track = cameraTrack?.track;
    return track?.kind === 'video' ? (track as unknown as LocalVideoTrack) : undefined;
  }, [cameraTrack]);

  const ensureProcessor = useCallback((): BackgroundProcessorWrapper => {
    if (!processorRef.current) {
      processorRef.current = BackgroundProcessor({ mode: 'disabled' });
    }
    return processorRef.current;
  }, []);

  const applySwitch = useCallback(
    async (
      options: Parameters<BackgroundProcessorWrapper['switchTo']>[0],
      next: BackgroundMode
    ) => {
      if (!isSupported) {
        setError('Background effects are not supported in this browser.');
        return;
      }
      const track = getVideoTrack();
      if (!track) {
        setError('Turn your camera on before choosing a background.');
        return;
      }
      setIsApplying(true);
      setError(null);
      try {
        const processor = ensureProcessor();
        // First real use on this track — attach the processor. Re-running
        // `setProcessor` with the same, already-attached processor instance
        // is a harmless no-op on livekit-client's side, so this doesn't
        // need to track "have I attached yet" separately.
        await track.setProcessor(processor);
        await processor.switchTo(options);
        setModeState(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not apply background effect.');
      } finally {
        setIsApplying(false);
      }
    },
    [isSupported, getVideoTrack, ensureProcessor]
  );

  const setNone = useCallback(() => {
    void applySwitch({ mode: 'disabled' }, 'none');
  }, [applySwitch]);

  const setBlur = useCallback(
    (radius: number) => {
      void applySwitch({ mode: 'background-blur', blurRadius: radius }, 'blur');
    },
    [applySwitch]
  );

  const setImage = useCallback(
    (imagePath: string) => {
      void applySwitch({ mode: 'virtual-background', imagePath }, 'image');
    },
    [applySwitch]
  );

  // Re-attach if the local camera track is replaced (device switch
  // publishes a new LocalVideoTrack instance) while a non-'none' mode is
  // already selected, so switching cameras mid-call doesn't silently drop
  // the effect.
  useEffect(() => {
    if (mode === 'none') return;
    const track = getVideoTrack();
    const processor = processorRef.current;
    if (!track || !processor) return;
    void track.setProcessor(processor);
    // Only re-run when the underlying track identity actually changes.
  }, [cameraTrack?.track]);

  useEffect(() => {
    return () => {
      const track = getVideoTrack();
      void track?.stopProcessor();
      processorRef.current = null;
    };
    // Cleanup only needs to run once, on unmount.
  }, []);

  // `localParticipant` isn't read directly but keeps this hook re-rendering
  // in step with `useLocalParticipant()`'s own subscription — matches the
  // "keep the hook call even if a value looks unused" pattern already used
  // in VideoGridLiveKit.tsx for the same reason.
  void localParticipant;

  return { mode, isSupported, isApplying, error, setNone, setBlur, setImage };
}
