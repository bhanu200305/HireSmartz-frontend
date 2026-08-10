'use client';

import { ReactNode, TouchEvent, useState } from 'react';
import clsx from 'clsx';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useMediaQuery } from '../../hooks/useMediaQuery';
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
const NARROW_QUERY = '(max-width: 700px)';
const SWIPE_THRESHOLD_PX = 40;

// Active slide takes up most of the stage, leaving room on either side for
// the previous/next slide to sneak-peek in — small, dimmed, tucked behind.
const ACTIVE_WIDTH_PERCENT = 74;
const PEEK_OWN_SHIFT_PERCENT = 74; // how far a peeking slide shifts, as % of its own width
const PEEK_SCALE = 0.72;
const PEEK_OPACITY = 0.75;
const FAR_SHIFT_PERCENT = 130; // pushes non-adjacent slides fully out of view

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
  const isNarrow = useMediaQuery(NARROW_QUERY);
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
  const activeWidthPercent = isNarrow ? 88 : ACTIVE_WIDTH_PERCENT;

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
        className="relative min-h-0 flex-1"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          type="button"
          aria-label="Previous slide"
          onClick={goPrev}
          disabled={activeIndex === 0}
          className={clsx(arrowButtonClass, 'left-1 sm:left-2')}
        >
          <LeftOutlined />
        </button>

        <button
          type="button"
          aria-label="Next slide"
          onClick={goNext}
          disabled={activeIndex === count - 1}
          className={clsx(arrowButtonClass, 'right-1 sm:right-2')}
        >
          <RightOutlined />
        </button>

        <div className="relative h-full w-full overflow-hidden">
          {slides.map((slide, index) => {
            const offset = index - activeIndex;
            const isActive = offset === 0;
            const isAdjacent = Math.abs(offset) === 1;
            const direction = Math.sign(offset);

            const shiftPercent = isActive
              ? 0
              : isAdjacent
                ? direction * PEEK_OWN_SHIFT_PERCENT
                : direction * FAR_SHIFT_PERCENT;
            const scale = isActive ? 1 : isAdjacent ? PEEK_SCALE : PEEK_SCALE * 0.9;
            const opacity = isActive ? 1 : isAdjacent ? PEEK_OPACITY : 0;

            return (
              <div
                key={slide.key}
                // Adjacent (peeking) slides stay hit-testable so they're
                // clickable to jump to; fully offscreen slides are inert.
                inert={!isActive && !isAdjacent}
                aria-hidden={!isActive}
                onClick={isAdjacent ? () => goTo(index) : undefined}
                className={clsx('absolute top-0 left-1/2 h-full', isAdjacent && 'cursor-pointer')}
                style={{
                  width: `${activeWidthPercent}%`,
                  transition,
                  opacity,
                  transform: `translateX(calc(-50% + ${shiftPercent}%)) scale(${scale})`,
                  filter: isActive ? 'none' : 'saturate(85%)',
                  pointerEvents: isActive || isAdjacent ? 'auto' : 'none',
                  zIndex: isActive ? 2 : 1,
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
