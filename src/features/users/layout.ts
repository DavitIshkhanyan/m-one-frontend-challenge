/**
 * Row height in pixels.
 *
 * Single source of truth: this value is written onto the list element as the
 * `--row-height` custom property, and the stylesheet reads it from there. The
 * virtualizer added later divides scroll offset by exactly this number, so
 * letting CSS and TypeScript hold separate copies would mean a padding change
 * silently desynchronising the scroll window. It cannot, because there is
 * only one copy.
 */
export const ROW_HEIGHT = 72;
