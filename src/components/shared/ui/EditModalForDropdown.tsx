import { FC, useState } from 'react';
import { MdClose } from 'react-icons/md';
import { Input } from './input';

interface EditModalProps {
  onClose: () => void;
  onSave: (newValue: string) => void;
  title: string;
  initialValue: string;
  isLoading?: boolean;
}

const EditModal: FC<EditModalProps> = ({
  onClose,
  onSave,
  title = 'Edit Option',
  initialValue = '',
  isLoading = false,
}) => {
  const [editValue, setEditValue] = useState(initialValue);

  const handleSave = () => {
    if (editValue.trim()) {
      onSave(editValue.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <div className="app-modal-overlay fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="app-modal-panel bg-[#FAFAFA] p-6 rounded-lg shadow-lg w-[400px] max-w-[92vw] relative">
        <h2 className="text-lg font-semibold text-center mb-4">{title}</h2>

        <div className="mb-4">
          <Input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter new value"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            // Sole input in this modal — focusing it on open is the expected UX.
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-3xl cursor-pointer hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!editValue.trim() || isLoading}
            className="flex-1 bg-primary text-white py-2 rounded-3xl cursor-pointer hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>

        <button className="absolute top-4 right-4 text-primary cursor-pointer" onClick={onClose}>
          <MdClose size={20} />
        </button>
      </div>
    </div>
  );
};

export default EditModal;
