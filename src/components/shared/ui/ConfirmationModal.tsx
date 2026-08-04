import { FC } from 'react';
import { MdClose } from 'react-icons/md';
import { Loader } from './loader';
import { titleHasHtml } from '../../../shared/utils/validation/input.helpers';
import { Col, Row } from 'antd';

interface ConfirmationModalProps {
  onClose: (close?: boolean) => void;
  onConfirm: () => void;
  title: string;
  confirmText: string;
  isLoading?: boolean;
  disableConfirm?: boolean;
  disableClose?: boolean;
  cancelText?: string;
}

const ConfirmationModal: FC<ConfirmationModalProps> = ({
  onClose,
  onConfirm,
  title = '',
  confirmText = '',
  isLoading = false,
  disableConfirm = false,
  disableClose = false,
  cancelText = 'CANCEL',
}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-[2000] p-4">
      <div className="bg-[#FAFAFA] p-6 rounded-lg shadow-lg max-w-lg w-full relative">
        {/* Title section with proper text wrapping */}
        <div className="flex items-start justify-between mb-4 gap-3">
          <h2 className="text-lg text-black/60 font-semibold flex-1 break-words overflow-hidden">
            {titleHasHtml(title) ? <span dangerouslySetInnerHTML={{ __html: title }} /> : title}
          </h2>
          <button
            className="text-primary cursor-pointer shrink-0 flex-shrink-0 mt-1"
            onClick={() => onClose(true)}
            aria-label="Close"
          >
            <MdClose size={20} />
          </button>
        </div>

        <Row
          gutter={{
            xs: 12,
            sm: 16,
          }}
        >
          <Col xs={24} sm={12}>
            <button
              type="button"
              onClick={() => onClose()}
              disabled={disableClose || isLoading}
              className="w-full border border-gray-300 text-gray-600 py-2 px-4 rounded-3xl cursor-pointer hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {cancelText}
            </button>
          </Col>

          <Col xs={24} sm={12}>
            <button
              type="button"
              onClick={onConfirm}
              disabled={disableConfirm || isLoading}
              className="w-full bg-primary text-white py-2 px-4 rounded-3xl cursor-pointer hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center gap-2"
            >
              {isLoading && <Loader />}
              {confirmText}
            </button>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default ConfirmationModal;
