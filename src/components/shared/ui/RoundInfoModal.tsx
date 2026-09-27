import { FC } from 'react';
import { MdClose } from 'react-icons/md';
import { HiOutlineFlag, HiOutlineClipboardList, HiOutlineChartBar } from 'react-icons/hi';
import type { IconType } from 'react-icons';
import type { RoundInfoContent } from '../../../shared/utils/roundInfoContent';

interface RoundInfoModalProps {
  roundName: string;
  badgeLabel?: string | null;
  content: RoundInfoContent | null;
  fallbackText?: string | null;
  onClose: () => void;
}

const InfoSection: FC<{ icon: IconType; title: string; text: string }> = ({
  icon: Icon,
  title,
  text,
}) => (
  <div className="flex gap-3">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 text-base">
      <Icon />
    </span>
    <div className="min-w-0">
      <h3 className="text-sm font-semibold text-neutral-900 mb-1">{title}</h3>
      <p className="text-sm text-neutral-600 leading-relaxed">{text}</p>
    </div>
  </div>
);

/** Round info popup shown from the "i" icon on the rounds list and the Add
 * Round form. Content is structured (objective/procedure/analysis) for the
 * round types we can reliably identify, and falls back to the round's own
 * description when we cannot, see getRoundInfoContent. */
const RoundInfoModal: FC<RoundInfoModalProps> = ({
  roundName,
  badgeLabel,
  content,
  fallbackText,
  onClose,
}) => (
  <div
    className="app-modal-overlay fixed inset-0 flex items-center justify-center bg-neutral-900/50 z-[2000] p-4"
    onClick={onClose}
  >
    <div
      className="app-modal-panel bg-white rounded-2xl shadow-lg border border-neutral-100 w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-neutral-100 shrink-0">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-neutral-900 truncate">
            {roundName}
          </h2>
          {badgeLabel && (
            <p className="text-xs font-medium text-sky-700 mt-0.5 truncate">{badgeLabel}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg p-1.5 shrink-0 transition-colors cursor-pointer"
        >
          <MdClose size={18} />
        </button>
      </div>

      <div className="px-6 py-5 space-y-5 overflow-y-auto">
        {content ? (
          <>
            <InfoSection icon={HiOutlineFlag} title="Objective" text={content.objective} />
            <InfoSection icon={HiOutlineClipboardList} title="Procedure" text={content.procedure} />
            <InfoSection
              icon={HiOutlineChartBar}
              title="What we evaluate"
              text={content.analysis}
            />
          </>
        ) : (
          <p className="text-sm text-neutral-600 leading-relaxed">
            {fallbackText ||
              'This round has not been described yet. Reach out to your hiring team for more detail.'}
          </p>
        )}
      </div>
    </div>
  </div>
);

export default RoundInfoModal;
