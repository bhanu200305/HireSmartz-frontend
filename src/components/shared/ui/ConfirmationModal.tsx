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
  cancelText = 'Cancel',
}) => {
  return (
    <div className="app-modal-overlay fixed inset-0 flex items-center justify-center bg-neutral-900/50 z-[2000] p-4">
      <div className="app-modal-panel bg-white p-6 rounded-2xl shadow-lg border border-neutral-100 max-w-lg w-full relative">
        {/* Title section with proper text wrapping */}
        <div className="flex items-start justify-between mb-5 gap-3">
          {/* Same width as the close button, so the title is truly centred. */}
          <span className="w-[30px] shrink-0" aria-hidden />
          <h2 className="font-display text-lg font-semibold text-neutral-900 flex-1 break-words overflow-hidden text-center">
            {titleHasHtml(title) ? <span dangerouslySetInnerHTML={{ __html: title }} /> : title}
          </h2>
          <button
            className="text-neutral-400 cursor-pointer shrink-0 flex-shrink-0 -mt-1 -mr-1 p-1.5 rounded-lg transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            onClick={() => onClose(true)}
            aria-label="Close"
          >
            <MdClose size={18} />
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
              className="w-full border border-neutral-200 text-neutral-700 bg-white py-2.5 px-4 rounded-lg cursor-pointer font-medium transition-colors hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {cancelText}
            </button>
          </Col>

          <Col xs={24} sm={12}>
            <button
              type="button"
              onClick={onConfirm}
              disabled={disableConfirm || isLoading}
              className="w-full bg-primary-600 text-white py-2.5 px-4 rounded-lg cursor-pointer font-medium transition-colors hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
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
