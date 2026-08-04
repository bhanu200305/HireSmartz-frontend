import { FaTimes } from 'react-icons/fa';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, title, children, className }) => {
  return (
    <div
      className={`bg-gray-900 text-gray-100 border-l border-gray-800 shrink-0 h-full shadow-2xl transition-all duration-300 ease-in-out flex flex-col overflow-hidden ${
        isOpen ? 'w-96 opacity-100' : 'w-0 opacity-0 border-none'
      } ${className || ''}`}
    >
      <div className="flex justify-between items-center p-5 border-b border-gray-800 w-96 shrink-0">
        <h2 className="text-lg font-semibold tracking-wide text-white">{title}</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-1"
          aria-label="Close sidebar"
        >
          <FaTimes />
        </button>
      </div>
      <div className="flex-1 p-5 overflow-y-auto w-96 shrink-0 custom-scrollbar">{children}</div>
    </div>
  );
};

export default Sidebar;
