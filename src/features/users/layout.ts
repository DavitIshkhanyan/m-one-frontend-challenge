import { useEffect, useState } from 'react';

/**
 * Row height, in rem.
 *
 * Rows have to be a uniform height for the windowing arithmetic to work, but
 * that height must not be a constant number of pixels. Someone who raises
 * their browser or OS default text size gets larger text inside a row that
 * never grew, and the third line is clipped - measured here at roughly 250%
 * of default, which is well inside the range people actually use.
 *
 * So the height is expressed in rem and resolved against the root font size
 * at runtime. The result is written onto the list element as a custom
 * property that the stylesheet reads, and handed to the virtualizer as a
 * number, so CSS and TypeScript cannot disagree about it.
 */
export const ROW_HEIGHT_REM = 4.5;

const FALLBACK_ROOT_FONT_SIZE = 16;

export function measureRowHeight(): number {
  if (typeof window === 'undefined') return ROW_HEIGHT_REM * FALLBACK_ROOT_FONT_SIZE;

  const root = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  const base = Number.isFinite(root) && root > 0 ? root : FALLBACK_ROOT_FONT_SIZE;
  return Math.round(base * ROW_HEIGHT_REM);
}

export function useRowHeight(): number {
  const [rowHeight, setRowHeight] = useState(measureRowHeight);

  useEffect(() => {
    const update = () => setRowHeight(measureRowHeight());
    update();

    window.addEventListener('resize', update);

    // There is no event for "the user changed their default font size", but
    // doing so relaunches layout, which the observer does see.
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update);
    observer?.observe(document.documentElement);

    return () => {
      window.removeEventListener('resize', update);
      observer?.disconnect();
    };
  }, []);

  return rowHeight;
}
