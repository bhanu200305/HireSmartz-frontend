import { useCallback, useRef } from 'react';

/**
 * When a modal doesn't close on an outside click, clicking the mask
 * otherwise gives no feedback at all — nothing visibly happens. This flashes
 * the modal's close (X) button red instead, so the click visibly points at
 * the control that does close it.
 *
 * Works for any antd `<Modal>`, with or without a custom `closeIcon`, and
 * whether or not it has a default footer: rather than needing a ref to a
 * specific element, it tells a "real" close request (the X button, a footer
 * Cancel button, anything the caller renders inside the modal) from a mask
 * click by checking whether the event target is inside `.ant-modal-content`
 * at all — a mask/backdrop click is the only way `onCancel` fires with a
 * target outside it.
 *
 * The wrapped antd `<Modal>` must be given `maskClosable` (true) so a mask
 * click reaches `onCancel` in the first place; `closeOnMaskClick` below is
 * what actually decides whether that click closes the modal or just flashes
 * the X — same intent as antd's own `maskClosable`, just resolved here so
 * the flash can happen either way.
 */
export const MODAL_CLOSE_ATTENTION_CLASS = 'modal-close-attention';
const ATTENTION_DURATION_MS = 550;

type CancelLikeEvent = { target?: EventTarget | null } | undefined;

type CloseAttentionOptions = {
  onClose?: () => void;
  closeOnMaskClick?: boolean;
};

export function useModalCloseAttention() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    ({ onClose, closeOnMaskClick = false }: CloseAttentionOptions) =>
      (e?: CancelLikeEvent) => {
        const target = e?.target as HTMLElement | null | undefined;
        const insideContent = !!target?.closest?.('.ant-modal-content');
        // A keyboard-triggered cancel (Esc, when a modal opts into
        // `keyboard`) has no `clientX` — only a real mouse click on the
        // mask does. Anything that isn't that mask click is a real close.
        const isMaskClick = !!e && 'clientX' in (e as object) && !insideContent;
        if (!isMaskClick || closeOnMaskClick) {
          onClose?.();
          return;
        }

        const scope = (target?.closest?.('.ant-modal-wrap') as HTMLElement | null) ?? document;
        const closeButton = scope.querySelector<HTMLElement>('.ant-modal-close');
        if (!closeButton) return;

        closeButton.classList.remove(MODAL_CLOSE_ATTENTION_CLASS);
        // Force a reflow so a second outside-click restarts the animation
        // even if it's still running from a previous one.
        void closeButton.offsetWidth;
        closeButton.classList.add(MODAL_CLOSE_ATTENTION_CLASS);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          closeButton.classList.remove(MODAL_CLOSE_ATTENTION_CLASS);
        }, ATTENTION_DURATION_MS);
      },
    []
  );
}
