import { BACKGROUND_BLUR_LEVELS, BACKGROUND_IMAGE_PRESETS } from './interviewBackgrounds';
import { useVirtualBackground } from './useVirtualBackground';

const swatchBase =
  'flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 text-xs font-medium transition-colors';
const swatchActive = 'border-primary-400 ring-2 ring-primary-400/50';
const swatchInactive = 'border-white/15 hover:border-white/30';

// Lives in both the in-room settings panel and the pre-join device-check
// lobby — same component either way, `useVirtualBackground` itself doesn't
// care which screen it's rendered from, only whether a local camera track
// currently exists to attach to.
export const BackgroundSelector = () => {
  const { mode, isSupported, isApplying, error, setNone, setBlur, setImage } =
    useVirtualBackground();

  if (!isSupported) {
    return (
      <p className="text-sm text-neutral-400">
        Background effects aren&apos;t supported in this browser.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={setNone}
          disabled={isApplying}
          className={`${swatchBase} bg-neutral-800 text-neutral-300 ${
            mode === 'none' ? swatchActive : swatchInactive
          }`}
        >
          None
        </button>
        {BACKGROUND_BLUR_LEVELS.map((level) => (
          <button
            key={level.id}
            type="button"
            onClick={() => setBlur(level.radius)}
            disabled={isApplying}
            className={`${swatchBase} bg-neutral-800 text-neutral-300 ${
              mode === 'blur' ? swatchActive : swatchInactive
            }`}
            title={level.label}
          >
            {level.label.split(' ')[0]}
          </button>
        ))}
        {BACKGROUND_IMAGE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setImage(preset.imagePath)}
            disabled={isApplying}
            className={`${swatchBase} overflow-hidden bg-cover bg-center text-white ${
              mode === 'image' ? swatchActive : swatchInactive
            }`}
            style={{ backgroundImage: `url(${preset.imagePath})` }}
            title={preset.label}
          >
            <span className="rounded bg-black/50 px-1 text-[10px]">{preset.label}</span>
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default BackgroundSelector;
