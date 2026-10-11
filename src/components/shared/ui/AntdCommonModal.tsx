import React from 'react';
import { Modal, ModalProps } from 'antd';
import clsx from 'clsx';
import { MdClose } from 'react-icons/md';
import { useModalCloseAttention } from './useModalCloseAttention';

export type CommonModalProps = {
  open: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string | React.ReactNode;
  children?: React.ReactNode;
  modalProps?: Omit<ModalProps, 'open' | 'onCancel' | 'footer' | 'title'>;
  /**
   * For a caller whose body is one bounded, self-scrolling region (a
   * CustomTable capped via `scrollY="100%"`) alongside its own fixed
   * search/filter controls and pagination footer — those stay pinned in
   * place and only the table scrolls, with the table's own height
   * resolving against whatever vertical space is actually left in the
   * modal (computed by the browser's own layout) rather than a flat `vh`
   * guess that can still be too tall on a shorter window. Without this,
   * `.modal-content` defaults to its natural content height and lets
   * `.ant-modal-body`'s own fallback scrollbar take over the instant that
   * height doesn't fit — a second, OUTER scrollbar stacked on top of the
   * table's own, which also visually collides with the close button since
   * neither reserves room for it. See index.css's
   * `.modal-content.cfp-modal-fill` rule.
   */
  fillHeight?: boolean;
};

const AntdCommonModal: React.FC<CommonModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  modalProps = {},
  fillHeight = false,
}) => {
  const withCloseAttention = useModalCloseAttention();
  // The underlying antd Modal always gets maskClosable=true so a mask click
  // reaches onCancel at all — whether that click actually closes (real
  // maskClosable intent, defaulting to the old `false`) is decided inside
  // withCloseAttention/onCancel below, not by this prop.
  const { maskClosable: callerMaskClosable, ...restModalProps } = modalProps;

  if (!open) return null;

  return (
    <Modal
      open={open}
      onCancel={withCloseAttention({ onClose, closeOnMaskClick: !!callerMaskClosable })}
      footer={null}
      centered
      maskClosable
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
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500">
          <MdClose size={20} />
        </span>
      }
      {...restModalProps}
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
      <div className={clsx('modal-content', fillHeight && 'cfp-modal-fill')}>{children}</div>
    </Modal>
  );
};

export default AntdCommonModal;
