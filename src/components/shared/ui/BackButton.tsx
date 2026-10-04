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
    className={`-ml-2 flex w-fit cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 ${className}`}
  >
    <MdOutlineArrowBack size={16} />
    <span>{label}</span>
  </button>
);

export default BackButton;
