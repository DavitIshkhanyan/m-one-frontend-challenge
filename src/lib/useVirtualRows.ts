import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Fixed-height row windowing.
 *
 * Rows in this app are a fixed height by design, which collapses
 * virtualization to arithmetic: divide the scroll offset by the row height to
 * find the first visible index, render a screenful either side, and translate
 * the rendered slice down to where it belongs. That is small enough to own,
 * and owning it keeps the one technique the "far more rows than ten"
 * requirement is asking about visible in the codebase rather than hidden
 * inside a dependency.
 *
 * The row height comes from a single TypeScript constant that is also written
 * onto the element as a custom property for the stylesheet to read, so CSS
 * and JS cannot drift apart and silently desynchronise the scroll window.
 */

/** Used until the container has been measured, and under jsdom where it is 0. */
const ASSUMED_VIEWPORT = 800;

export type VirtualWindow = {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly totalHeight: number;
  readonly offsetY: number;
};

export function useVirtualRows(
  count: number,
  rowHeight: number,
  overscan = 6,
): VirtualWindow & { readonly containerRef: React.RefObject<HTMLDivElement | null> } {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (element === null) return;

    const onScroll = () => setScrollTop(element.scrollTop);
    element.addEventListener('scroll', onScroll, { passive: true });
    setViewportHeight(element.clientHeight);

    // Guarded because jsdom has no ResizeObserver, and because the container
    // resizes for reasons scroll events never report: window resize, OS text
    // size, the browser's own zoom.
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(() => setViewportHeight(element.clientHeight));
    observer?.observe(element);

    return () => {
      element.removeEventListener('scroll', onScroll);
      observer?.disconnect();
    };
  }, []);

  return useMemo(() => {
    const viewport = viewportHeight > 0 ? viewportHeight : ASSUMED_VIEWPORT;
    const first = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visible = Math.ceil(viewport / rowHeight) + overscan * 2;

    return {
      containerRef,
      startIndex: first,
      endIndex: Math.min(count, first + visible),
      totalHeight: count * rowHeight,
      offsetY: first * rowHeight,
    };
  }, [count, rowHeight, overscan, scrollTop, viewportHeight]);
}
