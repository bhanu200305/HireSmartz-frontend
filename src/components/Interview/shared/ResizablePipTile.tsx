import { useRef, useState, type ReactNode } from 'react';

export type ResizablePipTileProps = {
  children: ReactNode;
  /** The stage element's own bounds, so drag/resize can be clamped to it. */
  stageRef: React.RefObject<HTMLElement | null>;
};

const DEFAULT_WIDTH = 200;
const MIN_WIDTH = 140;
const ASPECT_RATIO = 4 / 3;
const MARGIN = 16;

// Floating picture-in-picture tile for the non-pinned side of a spotlight —
// corner-drag to resize, drag-by-body to reposition. Plain pointer events,
// no new dependency, same "hand-roll it" approach every other custom bit of
// UI in this room already uses (DeviceCheckLobby's level meter, SoundwaveTile's
// canvas). Size/position is local state, reset every mount — confirmed with
// the user this should NOT persist across reloads/sessions.
export const ResizablePipTile = ({ children, stageRef }: ResizablePipTileProps) => {
  const tileRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [position, setPosition] = useState<{ right: number; bottom: number } | null>(null);

  const clampWidth = (w: number) => {
    const stageWidth = stageRef.current?.clientWidth ?? 800;
    const maxWidth = stageWidth * 0.45;
    return Math.min(Math.max(w, MIN_WIDTH), maxWidth);
  };

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const onMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      // Dragging the bottom-right handle outward (right/down) grows the
      // tile — the handle sits at the tile's own bottom-right corner, so
      // moving right always means "wider," regardless of which screen
      // corner the tile currently occupies.
      setWidth(clampWidth(startWidth + delta));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleDragPointerDown = (e: React.PointerEvent) => {
    // Only the tile body (not the resize handle, which stops propagation
    // itself) starts a reposition drag.
    const stage = stageRef.current;
    if (!stage) return;
    e.preventDefault();
    const stageRect = stage.getBoundingClientRect();
    const tileRect = tileRef.current?.getBoundingClientRect();
    const startRight = tileRect ? stageRect.right - tileRect.right : MARGIN;
    const startBottom = tileRect ? stageRect.bottom - tileRect.bottom : MARGIN;
    const startX = e.clientX;
    const startY = e.clientY;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const onMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const tileWidth = tileRect?.width ?? width;
      const tileHeight = tileRect?.height ?? width / ASPECT_RATIO;
      const nextRight = Math.min(
        Math.max(startRight - dx, MARGIN),
        stageRect.width - tileWidth - MARGIN
      );
      const nextBottom = Math.min(
        Math.max(startBottom - dy, MARGIN),
        stageRect.height - tileHeight - MARGIN
      );
      setPosition({ right: nextRight, bottom: nextBottom });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      ref={tileRef}
      onPointerDown={handleDragPointerDown}
      className="absolute z-20 cursor-move overflow-hidden rounded-2xl border-2 border-white/20 shadow-2xl"
      style={{
        width,
        aspectRatio: ASPECT_RATIO,
        right: position?.right ?? MARGIN,
        bottom: position?.bottom ?? MARGIN,
      }}
    >
      <div className="pointer-events-none h-full w-full [&>*]:pointer-events-auto">{children}</div>
      <div
        onPointerDown={handleResizePointerDown}
        role="presentation"
        title="Drag to resize"
        className="absolute bottom-0 right-0 z-30 h-5 w-5 cursor-nwse-resize touch-none"
      >
        <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-sm border-b-2 border-r-2 border-white/70" />
      </div>
    </div>
  );
};

export default ResizablePipTile;
