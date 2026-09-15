import { useCallback } from 'react';
import type { KeyboardEvent } from 'react';

export interface UseEnterToSubmitOptions {
  /** Default true — set false to temporarily suspend (e.g. while submitting). */
  enabled?: boolean;
}

export interface UseEnterToSubmitResult {
  onKeyDown: (e: KeyboardEvent) => void;
}

/**
 * Spread onto a modal's content wrapper to submit on Enter, the way most
 * real-world dialogs do. Skips `<textarea>` (Enter should insert a newline,
 * not submit) and anything that already handled the key itself
 * (`e.defaultPrevented` — e.g. an antd `Select`/`AutoComplete` confirming
 * its own dropdown selection on Enter).
 */
export function useEnterToSubmit(
  onSubmit: () => void,
  { enabled = true }: UseEnterToSubmitOptions = {}
): UseEnterToSubmitResult {
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;
      if (e.key !== 'Enter') return;
      if (e.defaultPrevented) return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA') return;

      onSubmit();
    },
    [enabled, onSubmit]
  );

  return { onKeyDown };
}
