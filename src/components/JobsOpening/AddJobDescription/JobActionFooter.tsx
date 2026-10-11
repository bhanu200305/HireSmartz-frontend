import React from 'react';

interface JobActionFooterProps {
  children: React.ReactNode;
  label?: string;
  floating?: boolean;
  className?: string;
}

const JobActionFooter: React.FC<JobActionFooterProps> = ({
  children,
  label = 'Job actions',
  floating = true,
  className = '-mx-5 -mb-5 mt-4',
}) => {
  const slotRef = React.useRef<HTMLDivElement>(null);
  const footerRef = React.useRef<HTMLElement>(null);
  const [layout, setLayout] = React.useState({ height: 0, left: 0, width: 0, isReady: false });

  React.useLayoutEffect(() => {
    if (!floating) return;

    const measure = () => {
      const slot = slotRef.current;
      const footer = footerRef.current;
      if (!slot || !footer) return;

      const { left, width } = slot.getBoundingClientRect();
      const { height } = footer.getBoundingClientRect();
      setLayout((previous) =>
        previous.height === height &&
        previous.left === left &&
        previous.width === width &&
        previous.isReady
          ? previous
          : { height, left, width, isReady: true }
      );
    };

    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    const observer = new ResizeObserver(measure);
    if (slotRef.current?.parentElement) observer.observe(slotRef.current.parentElement);
    if (footerRef.current) observer.observe(footerRef.current);

    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
      observer.disconnect();
    };
  }, [floating]);

  // Always float once measured (layout.isReady), so buttons are always visible.
  // floating={false} callers (e.g. Job Details tab) render inline as before.
  const isFloating = floating && layout.isReady;

  return (
    <div
      ref={slotRef}
      className={`relative shrink-0 ${className}`}
      style={{ height: isFloating ? layout.height || undefined : undefined }}
    >
      <footer
        ref={footerRef}
        aria-label={label}
        className={`${isFloating ? 'fixed' : 'relative'} z-20 border-t border-neutral-200/80 bg-white/95 px-6 py-1 backdrop-blur-md rounded-b-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.03)]`}
        style={
          isFloating
            ? { bottom: 'var(--app-footer-height, 0px)', left: layout.left, width: layout.width }
            : undefined
        }
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          {children}
        </div>
      </footer>
    </div>
  );
};

export default JobActionFooter;
