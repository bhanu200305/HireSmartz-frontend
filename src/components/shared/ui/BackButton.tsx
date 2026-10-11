import { FC } from 'react';
import { MdOutlineArrowBack } from 'react-icons/md';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  /** Spacing only, e.g. `mb-4`. */
  className?: string;
}

/** The app's one "Back" control - same size and look on every page. */
const BackButton: FC<BackButtonProps> = ({ onClick, label = 'Back', className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-fit cursor-pointer items-center gap-1 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-xs transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${className}`}
  >
    <MdOutlineArrowBack size={15} />
    <span>{label}</span>
  </button>
);

export default BackButton;
