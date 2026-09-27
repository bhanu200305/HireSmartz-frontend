export type TileLabelProps = {
  children: string;
  className?: string;
};

// Visually matches `.lk-participant-name` (index.css) exactly — for tiles
// that aren't a real `ParticipantTile` and so don't get that styling for
// free (today: `SoundwaveTile`, which used to render its own ad hoc label
// with different padding/opacity/no border). Kept as inline styles rather
// than a new CSS class so it doesn't depend on load order against the
// `!important`-heavy `.lk-*` overrides.
export const TileLabel = ({ children, className }: TileLabelProps) => (
  <span
    className={`pointer-events-none absolute bottom-3 left-3 inline-flex w-fit ${className ?? ''}`}
    style={{
      background: 'rgba(0, 0, 0, 0.6)',
      borderRadius: 8,
      padding: '6px 12px',
      fontWeight: 600,
      fontSize: 14,
      color: '#f8fafc',
      backdropFilter: 'blur(4px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    }}
  >
    {children}
  </span>
);

export default TileLabel;
