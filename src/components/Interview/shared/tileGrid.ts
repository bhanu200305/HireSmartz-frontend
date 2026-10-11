// How the video tiles are arranged, from how many people are in the room:
// one person fills the space, two sit side by side, and more form a grid. The
// columns are `auto-fit`, so they also follow the width of the room; the minimum
// tile width is small enough that two tiles still sit side by side in a narrow
// window, and `min(100%, ...)` stops a tile overflowing a very narrow one.

const MIN_TILE_PX = 180;

export const tileGridColumns = (tileCount: number): string =>
  tileCount <= 1 ? '1fr' : `repeat(auto-fit, minmax(min(100%, ${MIN_TILE_PX}px), 1fr))`;
