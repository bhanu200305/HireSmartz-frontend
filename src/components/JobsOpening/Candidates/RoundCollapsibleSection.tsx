import { useId, useState, type ReactNode } from 'react';
import { AiOutlineMinus, AiOutlinePlus } from 'react-icons/ai';

type RoundCollapsibleSectionProps = {
  title: string;
  /** Short helper line under the title. */
  subtitle?: ReactNode;
  /** Read-only summary on the right of the header (e.g. a score), visible
   * while collapsed. Must not contain buttons — the header is itself one. */
  summary?: ReactNode;
  defaultOpen?: boolean;
  /** Don't mount the content until the section is first opened (then keep
   * it mounted) — for content that downloads media on mount. */
  lazy?: boolean;
  children: ReactNode;
};

// One collapsible block in a round's detail panel, styled like the old
// app's accordion (careerforcepro-web AiInterviewDetails.tsx): a pill-shaped
// bordered row while collapsed, rounded card once open, title on the left
// and a blue plus/minus on the right, content in an inner bordered box.
// Content is always mounted (unless `lazy`), just height-animated, so
// opening a section never refetches anything.
const RoundCollapsibleSection = ({
  title,
  subtitle,
  summary,
  defaultOpen = false,
  lazy = false,
  children,
}: RoundCollapsibleSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const [hasOpened, setHasOpened] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <section
      className={`overflow-hidden border border-[#E2E2E2] bg-white ${
        open ? 'rounded-xl' : 'rounded-full'
      }`}
    >
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          setHasOpened(true);
        }}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50 cursor-pointer focus:outline-none focus-visible:bg-gray-50 sm:px-6"
      >
        <span className="min-w-0">
          <span className="block text-base font-medium text-gray-800">{title}</span>
          {subtitle && <span className="mt-0.5 block text-sm text-gray-500">{subtitle}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {summary && (
            <span className="hidden text-sm font-semibold text-primary sm:inline">{summary}</span>
          )}
          {open ? (
            <AiOutlineMinus className="h-5 w-5 text-primary" aria-hidden />
          ) : (
            <AiOutlinePlus className="h-5 w-5 text-primary" aria-hidden />
          )}
        </span>
      </button>
      <div
        id={bodyId}
        className={`grid transition-all duration-300 ease-in-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-4 sm:px-6">
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm">
              {lazy && !hasOpened ? null : children}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RoundCollapsibleSection;
