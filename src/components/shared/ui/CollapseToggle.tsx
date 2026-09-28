import { MdKeyboardArrowDown } from 'react-icons/md';

/** Circled chevron used to toggle a collapsible section. Points down when
 * collapsed, flips to point up while its section is open. */
const CollapseToggle = ({ open }: { open: boolean }) => (
  <span
    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-transform duration-200 ${
      open ? 'rotate-180' : ''
    }`}
  >
    <MdKeyboardArrowDown size={18} />
  </span>
);

export default CollapseToggle;
