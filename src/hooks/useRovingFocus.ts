import { useCallback, useState } from 'react';
import type { KeyboardEvent } from 'react';

export interface UseRovingFocusOptions<T> {
  items: T[];
  /** Only responds to keydowns while true (e.g. dropdown open, panel focused). */
  isActive: boolean;
  /** Enter on the focused item. */
  onSelect: (item: T, index: number) => void;
  onEscape?: () => void;
  /** Wrap around at the ends instead of clamping. Default false. */
  loop?: boolean;
}

export interface UseRovingFocusResult {
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  getItemProps: (index: number) => { 'data-roving-index': number; 'aria-selected': boolean };
  handleKeyDown: (e: KeyboardEvent) => void;
}

/**
 * ArrowUp/ArrowDown/Enter/Escape roving-focus, generalized from the working
 * pattern in `components/shared/ui/MultiSelectDropdown.tsx` (its
 * `handleSearchKeyDown` + `focusedIndex` state). Returned rather than bound
 * to `window`, since each consumer attaches it to a different scoped element
 * (a search input, a table/list container) — roving focus is inherently
 * scoped to one open panel or table, never global.
 */
export function useRovingFocus<T>({
  items,
  isActive,
  onSelect,
  onEscape,
  loop = false,
}: UseRovingFocusOptions<T>): UseRovingFocusResult {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isActive || items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((i) => {
          if (i >= items.length - 1) return loop ? 0 : items.length - 1;
          return i + 1;
        });
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((i) => {
          if (i <= 0) return loop ? items.length - 1 : 0;
          return i - 1;
        });
        return;
      }

      if (e.key === 'Enter') {
        if (focusedIndex < 0 || focusedIndex >= items.length) return;
        e.preventDefault();
        onSelect(items[focusedIndex], focusedIndex);
        return;
      }

      if (e.key === 'Escape') {
        if (!onEscape) return;
        e.preventDefault();
        setFocusedIndex(-1);
        onEscape();
      }
    },
    [isActive, items, focusedIndex, loop, onSelect, onEscape]
  );

  const getItemProps = useCallback(
    (index: number) => ({
      'data-roving-index': index,
      'aria-selected': index === focusedIndex,
    }),
    [focusedIndex]
  );

  return { focusedIndex, setFocusedIndex, getItemProps, handleKeyDown };
}
