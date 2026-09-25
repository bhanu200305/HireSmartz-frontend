import React from 'react';
import { Modal, ModalProps } from 'antd';
import clsx from 'clsx';
import { MdClose } from 'react-icons/md';

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
      // Reserves the sticky header/footer's height at the top/bottom of the
      // full-viewport modal wrap (see index.css) so a centered modal never
      // renders underneath them — those two now sit at a higher z-index
      // than any modal and would otherwise visually clip the modal's edges.
      wrapClassName={clsx('ant-custom-modal-wrap', modalProps.wrapClassName)}
      title={null}
      // antd's own default close icon is a bare, unboxed glyph with no
      // hover affordance — easy to miss and, at small sizes, easy to
      // mistake for a rendering glitch. This gives it the same
      // rounded-hover-button treatment every other icon-only button in the
      // app already uses.
      closeIcon={
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600">
          <MdClose size={18} />
        </span>
      }
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
      {/* `title={null}` above means antd never reserves a header row for
          its own close button — it stays `position: absolute` over the
          modal's top-right corner regardless, on top of whatever a caller
          renders first in `children`. A caller building its own header row
          (rather than using this component's `title`/`subtitle`) needs its
          own right-side gutter to stay clear of it — see
          `TenantAnalyticsModal`'s header row for the pattern. */}
      <div className="modal-content">{children}</div>
    </Modal>
  );
};

export default AntdCommonModal;
