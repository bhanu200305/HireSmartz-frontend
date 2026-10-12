// How the video tiles are arranged, from how many people are in the room:
//   1 person   fills the whole space
//   2          side by side
//   3-4        a 2 x 2 grid
//   5-6        three across, then wrapping rows; 7+ stay at 3 or 4 across
// Each tile past the first keeps a normal video shape (16:9) instead of
// stretching to the full height of the room, and the group sits in the middle
// of the room. The column count is a target, not a rule: on a narrow window the
// tiles keep a minimum width and wrap onto more rows rather than shrinking into
// slivers.

const GAP_PX = 12;
const MIN_TILE_PX = 220;

export const tileGridColumnCount = (tileCount: number): number => {
  if (tileCount <= 1) return 1;
  if (tileCount <= 4) return 2;
  if (tileCount <= 9) return 3;
  return 4;
};

export const tileGridColumns = (tileCount: number): string => {
  const columns = tileGridColumnCount(tileCount);
  if (columns === 1) return '1fr';
  const share = `calc((100% - ${(columns - 1) * GAP_PX}px) / ${columns})`;
  return `repeat(auto-fit, minmax(min(100%, max(${MIN_TILE_PX}px, ${share})), 1fr))`;
};

/** The box around each tile: the only tile fills the room, the rest are 16:9. */
export const tileCellClass = (tileCount: number): string =>
  tileCount <= 1 ? 'h-full min-h-[220px]' : 'aspect-video min-h-0';

/** The grid itself: one tile stretches, several are centred as a group. */
export const tileGridClass = (tileCount: number): string =>
  tileCount <= 1
    ? 'grid h-full gap-3 overflow-y-auto'
    : 'grid h-full content-center gap-3 overflow-y-auto';
