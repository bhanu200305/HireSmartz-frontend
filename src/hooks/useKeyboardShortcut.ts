import { useEffect, useRef } from 'react';

export interface KeyboardShortcutOptions {
  /** Matches Ctrl on Windows/Linux OR Cmd (metaKey) on Mac. */
  ctrlOrCmd?: boolean;
  /** Default true — calls `e.preventDefault()` when the shortcut fires. */
  preventDefault?: boolean;
  /**
   * Default true — skip while the user is typing in an input/textarea/
   * contenteditable element, so a bare-key shortcut (e.g. `?`) doesn't fire
   * mid-sentence. `ctrlOrCmd` shortcuts (e.g. Ctrl/Cmd+K) are exempt from
   * this by design — a recruiter mid-form still expects Ctrl+K to jump to
   * search from anywhere.
   */
  ignoreInInputs?: boolean;
  /** Default true — lets a caller conditionally disable without unmounting. */
  enabled?: boolean;
}

const isTypingTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
};

/**
 * One global `window` keydown listener per call — same pattern already used
 * for the Escape-closes-panel listener in `NotesSidePanel.tsx` and the
 * inactivity tracker in `MainLayout.tsx`. `handler` is kept in a ref so a
 * caller passing a fresh function identity every render doesn't cause a
 * rebind on every render.
 */
export function useKeyboardShortcut(
  key: string,
  handler: (e: KeyboardEvent) => void,
  options: KeyboardShortcutOptions = {}
): void {
  const {
    ctrlOrCmd = false,
    preventDefault = true,
    ignoreInInputs = true,
    enabled = true,
  } = options;

  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      if (ctrlOrCmd && !(e.ctrlKey || e.metaKey)) return;
      if (!ctrlOrCmd && (e.ctrlKey || e.metaKey)) return;
      if (!ctrlOrCmd && ignoreInInputs && isTypingTarget(e.target) && key !== 'Escape') return;

      if (preventDefault) e.preventDefault();
      handlerRef.current(e);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, ctrlOrCmd, preventDefault, ignoreInInputs, enabled]);
}
