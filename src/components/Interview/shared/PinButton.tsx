import { FaThumbtack } from 'react-icons/fa';

export type PinButtonProps = {
  pinned: boolean;
  onClick: () => void;
  className?: string;
};

// Explicit pin affordance on every tile — `ParticipantTile`'s own built-in
// click-to-pin (see useSpotlight.ts's module comment) exists but relying on
// "click anywhere on the video" alone is too undiscoverable for a
// candidate/interviewer who's never used this UI before. `stopPropagation`
// so this doesn't also fire whatever the tile's own onClick does.
export const PinButton = ({ pinned, onClick, className }: PinButtonProps) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    aria-pressed={pinned}
    aria-label={pinned ? 'Unpin this tile' : 'Pin this tile'}
    title={pinned ? 'Unpin' : 'Pin'}
    className={`pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border text-xs transition-colors ${
      pinned
        ? 'border-primary-400 bg-primary-500/90 text-white'
        : 'border-white/20 bg-black/50 text-white/80 hover:bg-black/70'
    } ${className ?? ''}`}
  >
    <FaThumbtack className={pinned ? '' : 'rotate-45'} />
  </button>
);

export default PinButton;
