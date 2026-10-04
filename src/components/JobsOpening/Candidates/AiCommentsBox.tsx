import { useLayoutEffect, useRef, useState } from 'react';

// The AI's written reasoning, clamped to 4 lines with View more / View less.
// The toggle only appears when the text actually overflows 4 lines.
type AiCommentsBoxProps = {
  text: string;
  expanded: boolean;
  onToggle: () => void;
};

const AiCommentsBox = ({ text, expanded, onToggle }: AiCommentsBoxProps) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    const measure = () => setOverflows(el.scrollHeight - el.clientHeight > 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <p
        ref={ref}
        className={`whitespace-pre-line text-xs text-gray-700 ${expanded ? '' : 'line-clamp-4'}`}
      >
        {text}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
        >
          {expanded ? 'View less' : 'View more'}
        </button>
      )}
    </div>
  );
};

export default AiCommentsBox;
