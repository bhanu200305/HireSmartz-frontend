import { FC } from 'react';
import { MdClose } from 'react-icons/md';
import { Loader } from '../shared/ui/loader';

interface StartRecordingModalProps {
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

const StartRecordingModal: FC<StartRecordingModalProps> = ({
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="bg-[#FAFAFA] p-6 rounded-lg shadow-lg w-[600px] relative">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 cursor-pointer transition"
          onClick={onClose}
        >
          <MdClose size={20} />
        </button>
        <div className="text-left">
          <h2 className="text-lg font-semibold text-black mb-2">Make sure everyone is ready</h2>
          <p className="text-black text-sm mb-6">
            Recording a meeting without the consent of all participants may be illegal and
            actionable. You should obtain consent to record this meeting from all participants,
            including external guests and guests who join late.
          </p>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 border border-gray-300 text-gray-600 py-2 rounded-3xl cursor-pointer hover:bg-gray-100 transition"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-6 bg-primary text-white py-2 rounded-3xl cursor-pointer hover:bg-primary-dark transition disabled:opacity-70"
          >
            {isLoading ? <Loader /> : 'START'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartRecordingModal;
