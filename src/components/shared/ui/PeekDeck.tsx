'use client';

import { ReactNode, TouchEvent, useRef, useState } from 'react';
import clsx from 'clsx';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

export interface PeekDeckPanel {
  key: string;
  label: string;
  content: ReactNode;
}

interface PeekDeckProps {
  panels: PeekDeckPanel[];
  initialIndex?: number;
  className?: string;
}

const NARROW_QUERY = '(max-width: 700px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const SWIPE_THRESHOLD_PX = 40;

const DECK_HEIGHT = 560;
const PANEL_WIDTH = 'min(760px, 88%)';
const PEEK_OFFSET_PERCENT = 86;
const ACTIVE_SHADOW = '0 24px 60px rgba(20,24,40,.16)';
const PEEK_SHADOW = '0 8px 24px rgba(20,24,40,.08)';

export const PeekDeck = ({ panels, initialIndex = 0, className }: PeekDeckProps) => {
  const count = panels.length;
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), Math.max(count - 1, 0))
  );
  const isNarrow = useMediaQuery(NARROW_QUERY);
  const prefersReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const touchStartX = useRef<number | null>(null);

  if (count === 0) return null;

  const goTo = (index: number) => setActiveIndex(Math.min(Math.max(index, 0), count - 1));
  const goPrev = () => goTo(activeIndex - 1);
  const goNext = () => goTo(activeIndex + 1);

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (deltaX > SWIPE_THRESHOLD_PX) goPrev();
    else if (deltaX < -SWIPE_THRESHOLD_PX) goNext();
  };

  const transition = prefersReducedMotion ? 'none' : 'transform 320ms ease, opacity 320ms ease';
  const activePanel = panels[activeIndex];

  const arrowClass =
    'absolute top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white border border-neutral-200 shadow-sm flex items-center justify-center text-neutral-600 hover:text-primary-600 hover:border-primary-200 transition-colors disabled:opacity-30 disabled:pointer-events-none';

  return (
    <div className={clsx('w-full', className)}>
      <div className="text-center mb-3">
        <p
          className="text-xs font-semibold tracking-wider uppercase text-neutral-500"
          aria-live="polite"
        >
          {activePanel.label}
        </p>
        <div
          className="flex items-center justify-center gap-2 mt-2"
          role="tablist"
          aria-label="Panels"
        >
          {panels.map((panel, index) => (
            <button
              key={panel.key}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Show ${panel.label} panel`}
              onClick={() => goTo(index)}
              className={clsx(
                'h-2 rounded-full transition-all cursor-pointer',
                index === activeIndex
                  ? 'w-6 bg-primary-600'
                  : 'w-2 bg-neutral-300 hover:bg-neutral-400'
              )}
            />
          ))}
        </div>
      </div>

      {isNarrow ? (
        <div
          className="relative w-full"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            type="button"
            aria-label="Previous panel"
            onClick={goPrev}
            disabled={activeIndex === 0}
            className={clsx(arrowClass, '-left-2', 'cursor-pointer')}
          >
            <LeftOutlined />
          </button>

          <div className="w-full overflow-hidden px-10">
            <div
              className="flex"
              style={{ transform: `translateX(-${activeIndex * 100}%)`, transition }}
            >
              {panels.map((panel, index) => (
                <div
                  key={panel.key}
                  className="w-full flex-shrink-0 px-1"
                  inert={index !== activeIndex}
                >
                  <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
                    {panel.content}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            aria-label="Next panel"
            onClick={goNext}
            disabled={activeIndex === count - 1}
            className={clsx(arrowClass, '-right-2', 'cursor-pointer')}
          >
            <RightOutlined />
          </button>
        </div>
      ) : (
        <div
          className="relative w-full max-w-5xl mx-auto"
          style={{ height: DECK_HEIGHT }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {panels.map((panel, index) => {
            const offset = index - activeIndex;
            const isActive = offset === 0;
            const isAdjacent = Math.abs(offset) === 1;

            const translatePercent = isActive
              ? 0
              : offset < 0
                ? -PEEK_OFFSET_PERCENT
                : PEEK_OFFSET_PERCENT;
            const scale = isActive ? 1 : 0.9;
            const opacity = isActive ? 1 : isAdjacent ? 0.55 : 0;
            const zIndex = isActive ? 3 : isAdjacent ? 2 : 1;
            const shadow = isActive ? ACTIVE_SHADOW : PEEK_SHADOW;

            return (
              <div
                key={panel.key}
                inert={!isActive}
                className="absolute top-0 left-1/2 h-full"
                style={{
                  width: PANEL_WIDTH,
                  zIndex,
                  opacity,
                  pointerEvents: isActive ? 'auto' : 'none',
                  transform: `translateX(calc(-50% + ${translatePercent}%)) scale(${scale})`,
                  filter: isActive ? 'none' : 'saturate(70%)',
                  transition,
                }}
              >
                <div
                  className="bg-white rounded-2xl border border-neutral-200 h-full overflow-hidden p-6"
                  style={{ boxShadow: shadow }}
                >
                  {panel.content}
                </div>
              </div>
            );
          })}

          <button
            type="button"
            aria-label="Previous panel"
            onClick={goPrev}
            disabled={activeIndex === 0}
            className={clsx(arrowClass, '-left-5', 'cursor-pointer')}
          >
            <LeftOutlined />
          </button>

          <button
            type="button"
            aria-label="Next panel"
            onClick={goNext}
            disabled={activeIndex === count - 1}
            className={clsx(arrowClass, '-right-5', 'cursor-pointer')}
          >
            <RightOutlined />
          </button>
        </div>
      )}
    </div>
  );
};
