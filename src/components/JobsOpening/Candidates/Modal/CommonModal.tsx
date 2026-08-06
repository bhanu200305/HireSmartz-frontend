import React from 'react';
import { Modal } from 'antd';
import { Textarea } from '../../../shared';

type CommonModalProps = {
  visible: boolean;
  onClose: () => void;
  reason?: string;
  setReason?: React.Dispatch<React.SetStateAction<string>>;
  title?: string;
  footer?: React.ReactNode;
  children?: React.ReactNode;
};

const CommonModal: React.FC<CommonModalProps> = ({
  visible,
  onClose,
  title,
  footer,
  reason,
  setReason,
}) => {
  return (
    <div>
      <Modal
        open={visible}
        onCancel={onClose}
        footer={footer}
        centered
        maskClosable={false}
        keyboard={false}
        className="custom-modal"
        destroyOnClose={true}
      >
        <h2 className="text-xl font-semibold text-center mb-8 max-w-md mx-auto">{title}</h2>
        <div className="flex flex-col justify-start">
          <p className="font-medium text-sm pb-2">Reason</p>
          <Textarea
            className="w-full p-3 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-gray-300"
            rows={4}
            value={reason}
            placeholder="Type your reason here....."
            onChange={(e) => setReason && setReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

export default CommonModal;
