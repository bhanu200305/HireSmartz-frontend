import { useLayoutEffect, useRef, useState } from 'react';

type AiCommentsBoxProps = {
  /** The AI's overall summary as short bullet phrases (`scoring_reason_bullets`).
   * When present it is rendered as a real list. */
  bullets?: string[] | null;
  /** Fallback for candidates scored before bullets existed: the plain
   * `scoring_reason` paragraph. */
  text: string;
  expanded: boolean;
  onToggle: () => void;
};

// Collapsed, a bullet list shows this many items; the rest is behind "View more".
const COLLAPSED_BULLETS = 3;

// The AI's written reasoning. A bullet list when the backend sent bullets,
// otherwise the old paragraph clamped to 4 lines. Either way: View more / View
// less, shown only when there is something hidden.
const AiCommentsBox = ({ bullets, text, expanded, onToggle }: AiCommentsBoxProps) => {
  const items = (bullets ?? []).map((b) => b.trim()).filter(Boolean);

  const ref = useRef<HTMLParagraphElement>(null);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded || items.length > 0) return;
    const measure = () => setOverflows(el.scrollHeight - el.clientHeight > 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded, items.length]);

  if (items.length > 0) {
    const hasMore = items.length > COLLAPSED_BULLETS;
    const visible = expanded ? items : items.slice(0, COLLAPSED_BULLETS);
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
        <ul className="m-0 list-disc space-y-1 pl-5 text-xs text-gray-700">
          {visible.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        {hasMore && (
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
  }

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
