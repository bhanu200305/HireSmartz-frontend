import { useEffect, useRef } from 'react';
import { Chat, useChat } from '@livekit/components-react';
import { MdClose } from 'react-icons/md';

export type ChatPanelProps = {
  open: boolean;
  onClose: () => void;
  className?: string;
  /** True when a caller already provides its own header/title/close chrome
   * around this panel — Flow A's `InterviewLiveKit.tsx` renders this inside
   * its existing `Sidebar` component, which already has a title bar and
   * close button; without this flag both panels would each add their own,
   * doubling up. Flow B's `InterviewRoomLayout.tsx` has no such wrapper, so
   * it uses the default (false) — a fully self-contained floating card. */
  embedded?: boolean;
};

// Wraps LiveKit's own `<Chat />` prefab (a complete, ready-to-use widget —
// message list + input in one component) rather than hand-building from
// `useChat` directly. Unread-count tracking lives in the separate
// `useUnreadChatCount` hook below, called by whichever parent renders the
// toggle button — this component only needs to render the panel itself.
export const ChatPanel = ({ open, onClose, className, embedded = false }: ChatPanelProps) => {
  if (!open) return null;

  if (embedded) {
    return (
      <div className={`h-full min-h-[420px] w-full ${className ?? ''}`}>
        <Chat className="h-full" />
      </div>
    );
  }

  return (
    <div
      className={`flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 ${className ?? ''}`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">Chat</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-white/10 hover:text-white"
        >
          <MdClose size={18} />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <Chat className="h-full" />
      </div>
    </div>
  );
};

/** Unread count against the panel's own open/close state — read this from
 * the parent (which owns `open`) rather than from inside `ChatPanel` itself,
 * since the toggle button that needs the badge lives outside this panel. */
export function useUnreadChatCount(panelOpen: boolean): number {
  const { chatMessages } = useChat();
  const lastSeenCountRef = useRef(0);

  useEffect(() => {
    if (panelOpen) lastSeenCountRef.current = chatMessages.length;
  }, [panelOpen, chatMessages.length]);

  return panelOpen ? 0 : Math.max(0, chatMessages.length - lastSeenCountRef.current);
}

export default ChatPanel;
