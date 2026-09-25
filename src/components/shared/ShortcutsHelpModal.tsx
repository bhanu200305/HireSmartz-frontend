import React from 'react';
import AntdCommonModal from './ui/AntdCommonModal';

type ShortcutsHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: 'Ctrl / Cmd + K', description: 'Jump to search from anywhere' },
  { keys: '↑ / ↓', description: 'Move between rows or search results' },
  { keys: 'Enter', description: 'Open the highlighted row, or submit the open dialog' },
  { keys: 'Esc', description: 'Close the open dialog or search panel' },
  { keys: '?', description: 'Show this shortcuts list' },
];

const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ open, onClose }) => (
  <AntdCommonModal
    open={open}
    onClose={onClose}
    title="Keyboard Shortcuts"
    modalProps={{ width: 420, keyboard: true, maskClosable: true }}
  >
    <div className="flex flex-col gap-2">
      {SHORTCUTS.map((shortcut) => (
        <div
          key={shortcut.keys}
          className="flex items-center justify-between gap-4 rounded-lg px-2 py-2 text-sm"
        >
          <span className="text-neutral-600">{shortcut.description}</span>
          <kbd className="shrink-0 rounded-md border border-neutral-300 bg-neutral-50 px-2 py-1 font-mono text-xs text-neutral-700">
            {shortcut.keys}
          </kbd>
        </div>
      ))}
    </div>
  </AntdCommonModal>
);

export default ShortcutsHelpModal;
