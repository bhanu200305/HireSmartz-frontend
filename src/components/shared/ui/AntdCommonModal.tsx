import React from 'react';
import { Modal, ModalProps } from 'antd';

export type CommonModalProps = {
  open: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string | React.ReactNode;
  children?: React.ReactNode;
  modalProps?: Omit<ModalProps, 'open' | 'onCancel' | 'footer' | 'title'>;
};

const AntdCommonModal: React.FC<CommonModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  modalProps = {},
}) => {
  if (!open) return null;
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      maskClosable={false}
      keyboard={false}
      className="ant-custom-modal"
      title={null}
      {...modalProps}
    >
      {(title || subtitle) && (
        <div className="mb-6 text-center">
          {title && (
            <h2 className="font-display text-lg font-semibold text-neutral-900 mb-1.5">{title}</h2>
          )}
          {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
        </div>
      )}
      <div className="modal-content">{children}</div>
    </Modal>
  );
};

export default AntdCommonModal;
