import React, { useState } from 'react';
import { CaretRightOutlined } from '@ant-design/icons';

interface CollapsibleSectionProps {
  /** Section heading, e.g. "Job Info", "Location". */
  title: React.ReactNode;
  /** One-line summary shown to the right of the title while collapsed, e.g.
   * "Senior Backend Engineer · Engineering · Full-time" — lets a collapsed
   * section still communicate what's filled in without opening it. */
  summary?: React.ReactNode;
  /** Whether the section starts expanded. Only read on first render — this
   * is uncontrolled after mount, same as the hand-rolled expand/collapse
   * pattern already used for interview rounds (`sortableInterviewRounds.tsx`,
   * `ViewInterviewRounds.tsx`), which this component generalizes. */
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Lightweight collapsible section for long forms — click the header to
 * toggle. Deliberately a small custom wrapper rather than antd's `Collapse`
 * (see `collapse.tsx`'s `CustomCollapse`): that component's styling doesn't
 * match this use case (a section header inline with a summary line), and
 * nothing in the codebase repurposes it for form sections today.
 */
const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  summary,
  defaultOpen = false,
  children,
  className = '',
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`mt-2 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-2 py-1 text-left cursor-pointer"
        aria-expanded={open}
      >
        <CaretRightOutlined
          rotate={open ? 90 : 0}
          className="text-gray-400 text-xs transition-transform duration-150"
        />
        <span className="text-lg font-semibold">{title}</span>
        {!open && summary && (
          <span className="flex-1 min-w-0 text-right text-sm text-gray-500 truncate">
            {summary}
          </span>
        )}
      </button>
      {open && <div className="pl-5">{children}</div>}
    </div>
  );
};

export default CollapsibleSection;
