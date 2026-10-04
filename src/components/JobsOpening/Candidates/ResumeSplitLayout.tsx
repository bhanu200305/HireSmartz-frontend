import { useEffect, useRef, useState, type ReactNode } from 'react';

type ResumeSplitLayoutProps = {
  /** Left column: scores, comments, rating, feedback. */
  children: ReactNode;
  /** Right column. With `fitPreview`, the preview is sized to the left
   * column's height (see below); otherwise it's just placed as given. */
  aside: ReactNode;
  fitPreview: boolean;
  /** While true the preview keeps its current size (e.g. the AI comment is
   * expanded: the left column grows, the resume must not change). */
  freezeSize?: boolean;
};

const MIN_PREVIEW_HEIGHT = 380;
// Constant preview column width (never derived from the left column's height,
// so there is no width <-> height feedback loop). Wide enough that the page
// is fitted by HEIGHT: its bottom edge then sits on the frame's bottom edge.
const PREVIEW_WIDTH = 'min(520px, 46%)';

// Left column + resume preview. On wide screens the preview frame's height is
// measured from the left column (collapsed state), so the resume page ends
// level with the bottom of the Feedback Comments box. Expanding the AI
// comment does not resize it (`freezeSize`).
const ResumeSplitLayout = ({
  children,
  aside,
  fitPreview,
  freezeSize = false,
}: ResumeSplitLayoutProps) => {
  const leftRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(MIN_PREVIEW_HEIGHT);
  const [isWide, setIsWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsWide(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const el = leftRef.current;
    if (!el || !fitPreview || freezeSize) return;
    const measure = () =>
      setHeight(Math.max(MIN_PREVIEW_HEIGHT, Math.round(el.getBoundingClientRect().height)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitPreview, freezeSize]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div ref={leftRef} className="flex min-w-0 flex-1 flex-col gap-4">
        {children}
      </div>
      {fitPreview ? (
        <div
          className="relative h-[380px] w-full shrink-0"
          style={isWide ? { height, width: PREVIEW_WIDTH } : undefined}
        >
          <div className="absolute inset-0">{aside}</div>
        </div>
      ) : (
        <div className="shrink-0 lg:w-[300px]">{aside}</div>
      )}
    </div>
  );
};

export default ResumeSplitLayout;
