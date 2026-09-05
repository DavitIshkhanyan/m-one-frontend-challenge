import 'csstype';

/*
 * React's CSSProperties does not accept custom properties, which normally
 * forces a cast at every call site that sets one. Augmenting csstype instead
 * makes `style={{ '--row-height': '72px' }}` type-check honestly, so no `as`
 * is needed anywhere to silence the checker.
 */
declare module 'csstype' {
  interface Properties {
    [key: `--${string}`]: string | number | undefined;
  }
}
