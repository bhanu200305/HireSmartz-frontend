import { FC } from 'react';
import { MdClose } from 'react-icons/md';
import type { RoundInfoSection } from '../../../shared/utils/roundInfoContent';

interface RoundInfoModalProps {
  roundName: string;
  badgeLabel?: string | null;
  /** The round's own description, as saved on the round type. */
  description?: string | null;
  /** Plain-language explanation of the round; shown instead of the description when given. */
  sections?: RoundInfoSection[];
  onClose: () => void;
}

/** Round info popup opened from the "i" icon. */
const RoundInfoModal: FC<RoundInfoModalProps> = ({
  roundName,
  badgeLabel,
  description,
  sections = [],
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

      <div className="px-6 py-5 overflow-y-auto">
        {sections.length > 0 ? (
          <div className="flex flex-col gap-4">
            {sections.map((section) => (
              <div key={section.title}>
                <h3 className="m-0 mb-1 text-sm font-semibold text-neutral-900">{section.title}</h3>
                <p className="m-0 text-sm text-neutral-600 leading-relaxed">{section.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="m-0 text-sm text-neutral-600 leading-relaxed">
            {description || 'No description has been added for this round.'}
          </p>
        )}
      </div>
    </div>
  </div>
);

export default RoundInfoModal;
