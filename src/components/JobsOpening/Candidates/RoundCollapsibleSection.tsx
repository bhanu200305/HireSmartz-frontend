import { useId, useState, type ReactNode } from 'react';
import CollapseToggle from '../../shared/ui/CollapseToggle';

type RoundCollapsibleSectionProps = {
  title: string;
  /** Short helper line under the title. */
  subtitle?: ReactNode;
  /** Read-only summary on the right of the header (e.g. a score), visible
   * while collapsed. Must not contain buttons — the header is itself one. */
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
};

// One collapsible block in a round's detail panel (old app's accordion:
// rounded bordered row, title on the left, circled down-arrow on the
// right). Content is always mounted, just height-animated, so opening a
// section never refetches anything.
const RoundCollapsibleSection = ({
  title,
  subtitle,
  summary,
  defaultOpen = false,
  children,
}: RoundCollapsibleSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50 cursor-pointer sm:px-6"
      >
        <span className="min-w-0">
          <span className="block text-base font-semibold text-gray-900">{title}</span>
          {subtitle && <span className="mt-0.5 block text-sm text-gray-500">{subtitle}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {summary && (
            <span className="hidden text-sm font-semibold text-primary sm:inline">{summary}</span>
          )}
          <CollapseToggle open={open} />
        </span>
      </button>
      <div
        id={bodyId}
        className={`grid transition-all duration-300 ease-in-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-gray-100 px-5 py-4 sm:px-6">{children}</div>
        </div>
      </div>
    </section>
  );
};

export default RoundCollapsibleSection;
