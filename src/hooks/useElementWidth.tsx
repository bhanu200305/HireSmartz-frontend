import { RefObject, useEffect, useState } from 'react';

/**
 * Tracks a DOM node's actual rendered width via `ResizeObserver`, instead of
 * `useMediaQuery`'s viewport width. The two diverge whenever something
 * fixed-width sits beside the content column — this app's sidebar being the
 * main one: a 1366px viewport with the sidebar expanded leaves meaningfully
 * less room than the same viewport with it collapsed, and a `max-width`
 * media query can't tell those apart because it never looks past the
 * viewport. Measuring the element itself reacts correctly to sidebar
 * collapse, container padding, and window width all at once — one number
 * that is actually "how much room do I have," which is what a component
 * deciding how much of itself to show (a peeking carousel slide, a
 * multi-column grid) needs to ask.
 *
 * Returns 0 before the first measurement (SSR / not yet mounted) — callers
 * should treat that as "unknown" and fall back to their widest layout rather
 * than their narrowest, so a slow-to-measure first paint never flashes the
 * most cramped variant.
 */
export const useElementWidth = <T extends HTMLElement>(ref: RefObject<T | null>): number => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    setWidth(node.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, [ref]);

  return width;
};
