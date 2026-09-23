'use client';

import { ReactNode, TouchEvent, useRef, useState } from 'react';
import clsx from 'clsx';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useElementWidth } from '../../hooks/useElementWidth';
import './DashboardCarousel.css';

export interface DashboardSlide {
  key: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface DashboardCarouselProps {
  slides: DashboardSlide[];
  initialIndex?: number;
  className?: string;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const SWIPE_THRESHOLD_PX = 40;
const FAR_SHIFT_PERCENT = 130; // pushes non-adjacent slides fully out of view

/**
 * How much of the stage the active slide takes, and how much of its
 * neighbor peeks in beside it — tiered by the STAGE'S OWN measured width
 * (see `useElementWidth`), not the viewport. A viewport breakpoint can't
 * tell "1366px viewport, sidebar collapsed" from "1366px viewport, sidebar
 * expanded" apart, and those two have very different amounts of room left
 * for this carousel — which is exactly why the old single 700px breakpoint
 * looked fine on a wide desktop but let the peek crowd the active card's own
 * text on a narrower laptop. Ordered widest-first; the first tier whose
 * `min` the stage width clears wins, and the loop's fallback (the last,
 * narrowest entry) also covers width===0 — before the first measurement —
 * so a slow-to-measure first paint uses the SMALLEST peek rather than
 * flashing the most crowded one full-size.
 */
const SIZE_TIERS: Array<{
  min: number;
  activeWidthPercent: number;
  peekShiftPercent: number; // as % of the peeking slide's own width
  peekScale: number;
  peekOpacity: number;
}> = [
  { min: 1200, activeWidthPercent: 74, peekShiftPercent: 74, peekScale: 0.72, peekOpacity: 0.75 },
  { min: 950, activeWidthPercent: 80, peekShiftPercent: 80, peekScale: 0.68, peekOpacity: 0.6 },
  { min: 700, activeWidthPercent: 88, peekShiftPercent: 88, peekScale: 0.62, peekOpacity: 0.4 },
  // Below 700px there is not enough room to show a neighbor legibly at all
  // — opacity 0 keeps it out of sight (still hit-testable/tappable via its
  // own slide-dot, nothing about navigation changes) instead of leaving a
  // sliver of someone else's card touching the active one's edge.
  { min: 0, activeWidthPercent: 96, peekShiftPercent: 96, peekScale: 0.6, peekOpacity: 0 },
];

const sizeTierFor = (stageWidth: number) =>
  SIZE_TIERS.find((tier) => stageWidth >= tier.min) ?? SIZE_TIERS[SIZE_TIERS.length - 1];

const arrowButtonClass =
  'absolute top-1/2 -translate-y-1/2 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-md transition-colors hover:border-primary-200 hover:text-primary-600 disabled:pointer-events-none disabled:opacity-30 sm:h-10 sm:w-10';

/**
 * Sneak-peek carousel for the dashboard: the active slide fills most of the
 * content area while the previous/next slides peek in small and dimmed at
 * the edges, growing back to full size as they become active — a scale +
 * slide + fade "pop" transition. Arrows stay pinned to the vertical center
 * of the carousel viewport regardless of each slide's own content.
 */
const DashboardCarousel = ({ slides, initialIndex = 0, className }: DashboardCarouselProps) => {
  const count = slides.length;
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), Math.max(count - 1, 0))
  );
  const prefersReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const stageRef = useRef<HTMLDivElement>(null);
  const stageWidth = useElementWidth(stageRef);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  if (count === 0) return null;

  const goTo = (index: number) => setActiveIndex(Math.min(Math.max(index, 0), count - 1));
  const goPrev = () => goTo(activeIndex - 1);
  const goNext = () => goTo(activeIndex + 1);

  const handleTouchStart = (e: TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const handleTouchEnd = (e: TouchEvent) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    setTouchStartX(null);
    if (deltaX > SWIPE_THRESHOLD_PX) goPrev();
    else if (deltaX < -SWIPE_THRESHOLD_PX) goNext();
  };

  const transition = prefersReducedMotion
    ? 'none'
    : 'transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 320ms ease-out';

  const activeSlide = slides[activeIndex];
  // `stageWidth === 0` is "not measured yet" (see useElementWidth) and lands
  // on the narrowest tier by design — see SIZE_TIERS' own comment.
  const tier = sizeTierFor(stageWidth);

  return (
    <div className={clsx('flex h-full min-h-0 w-full flex-col', className)}>
      <div className="shrink-0 pb-2 text-center sm:pb-3">
        <p
          className="flex items-center justify-center gap-1.5 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase sm:text-xs"
          aria-live="polite"
        >
          {activeSlide.icon && <span className="text-primary-600">{activeSlide.icon}</span>}
          {activeSlide.label}
        </p>
        <div
          className="mt-2 flex items-center justify-center gap-2"
          role="tablist"
          aria-label="Dashboard sections"
        >
          {slides.map((slide, index) => (
            <button
              key={slide.key}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Show ${slide.label} slide`}
              onClick={() => goTo(index)}
              className={clsx(
                'h-2 cursor-pointer rounded-full transition-all',
                index === activeIndex
                  ? 'w-6 bg-primary-600'
                  : 'w-2 bg-neutral-300 hover:bg-neutral-400'
              )}
            />
          ))}
        </div>
      </div>

      <div
        ref={stageRef}
        className="relative min-h-0 flex-1"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          type="button"
          aria-label="Previous slide"
          onClick={goPrev}
          disabled={activeIndex === 0}
          className={clsx(arrowButtonClass, 'left-1 sm:left-2', 'cursor-pointer')}
        >
          <LeftOutlined />
        </button>

        <button
          type="button"
          aria-label="Next slide"
          onClick={goNext}
          disabled={activeIndex === count - 1}
          className={clsx(arrowButtonClass, 'right-1 sm:right-2', 'cursor-pointer')}
        >
          <RightOutlined />
        </button>

        <div className="relative h-full w-full overflow-hidden">
          {slides.map((slide, index) => {
            const offset = index - activeIndex;
            const isActive = offset === 0;
            const isAdjacent = Math.abs(offset) === 1;
            const direction = Math.sign(offset);
            // A peek tier of opacity 0 (the narrowest, see SIZE_TIERS) means
            // the neighbor is invisible — an invisible element must not stay
            // a click target, or a tap near the active card's edge silently
            // jumps slides with nothing on screen explaining why.
            const isVisiblePeek = isAdjacent && tier.peekOpacity > 0;

            const shiftPercent = isActive
              ? 0
              : isAdjacent
                ? direction * tier.peekShiftPercent
                : direction * FAR_SHIFT_PERCENT;
            const scale = isActive ? 1 : isAdjacent ? tier.peekScale : tier.peekScale * 0.9;
            const opacity = isActive ? 1 : isAdjacent ? tier.peekOpacity : 0;

            // A peeking slide is real content, not a decoration — its own
            // heading/labels are full legible text, sized for when IT is
            // active. Shrunk and dimmed is still legible enough to read as
            // stray words sitting next to the active card (a right peek's
            // "Active team members" card, say, reads as loose text past the
            // active card's own border) — which is what got reported as
            // "overlapping", and stayed reported after the width tiering
            // below because that only changed HOW MUCH of the neighbor
            // shows, not whether the part that does show is legible.
            //
            // Two independent measures against the same target — reading
            // words in the peek — since neither alone is safe to rely on
            // without measuring exact rendered pixels here (impossible to do
            // blind: OS display scaling means CSS pixels and screenshot
            // pixels aren't the same number, so a mask tuned to "the
            // reported screenshot's" apparent geometry could easily be
            // right for the wrong width elsewhere):
            //   - the mask fades the side facing the active slide to fully
            //     transparent, revealing only a slim outer sliver (mostly
            //     card background/border) as the "there's more here" hint;
            //   - `blur` below then makes ANY text still inside that sliver
            //     illegible regardless of exactly where the mask's edge
            //     lands. Blur, not a smaller reveal window alone, is what
            //     makes this robust to being wrong about the geometry.
            const maskImage = isVisiblePeek
              ? direction > 0
                ? 'linear-gradient(to right, transparent 0%, transparent 55%, black 82%)'
                : 'linear-gradient(to left, transparent 0%, transparent 55%, black 82%)'
              : undefined;

            return (
              <div
                key={slide.key}
                // Visible peeking slides stay hit-testable so they're
                // clickable to jump to; invisible and fully offscreen slides
                // are inert.
                inert={!isActive && !isVisiblePeek}
                aria-hidden={!isActive}
                onClick={isVisiblePeek ? () => goTo(index) : undefined}
                className={clsx(
                  'absolute top-0 left-1/2 h-full',
                  isVisiblePeek && 'cursor-pointer'
                )}
                style={{
                  width: `${tier.activeWidthPercent}%`,
                  transition,
                  opacity,
                  transform: `translateX(calc(-50% + ${shiftPercent}%)) scale(${scale})`,
                  // blur(3px) on top of the mask above — see that constant's
                  // comment for why both, not just one. Skipped for the
                  // far/invisible slides (opacity 0 already, and paying for
                  // a blur filter on something never shown is pure waste).
                  filter: isActive
                    ? 'none'
                    : isVisiblePeek
                      ? 'saturate(85%) blur(3px)'
                      : 'saturate(85%)',
                  pointerEvents: isActive || isVisiblePeek ? 'auto' : 'none',
                  zIndex: isActive ? 2 : 1,
                  maskImage,
                  WebkitMaskImage: maskImage,
                }}
              >
                <div
                  className="h-full w-full min-h-0 py-1"
                  style={{ pointerEvents: isActive ? 'auto' : 'none' }}
                >
                  <div
                    className={clsx('cfp-gradient-frame', isActive && 'cfp-gradient-frame--active')}
                    style={{ animationPlayState: isActive ? 'running' : 'paused' }}
                  >
                    <div className="cfp-gradient-frame__inner">{slide.content}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardCarousel;
