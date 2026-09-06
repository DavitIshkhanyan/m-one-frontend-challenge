import { useEffect, useRef, useState } from 'react';

/**
 * Show a busy indicator only when the wait is long enough to be worth
 * mentioning, and once shown, leave it up long enough to be read.
 *
 * Two problems, one hook:
 *
 *   A request that resolves in 40ms does not need an indicator. Rendering one
 *   anyway produces a flash on every keystroke - motion the user cannot
 *   interpret, attached to nothing they can act on.
 *
 *   An indicator that appears and vanishes within a frame or two is worse than
 *   none: it reads as a glitch. So once it is up it stays up for a minimum,
 *   even if the work has already finished.
 *
 * Delay is a little over the ~200ms at which a wait starts to feel like a
 * wait; minimum visibility is long enough to register as deliberate.
 */
export function useDelayedFlag(active: boolean, delayMs = 250, minVisibleMs = 400): boolean {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (active) {
      // Already showing: nothing to schedule, and rescheduling would reset
      // the minimum-visible clock on every re-render.
      if (visible) return;

      const timer = setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, delayMs);
      return () => clearTimeout(timer);
    }

    if (!visible) return;

    const elapsed = Date.now() - shownAt.current;
    const timer = setTimeout(() => setVisible(false), Math.max(0, minVisibleMs - elapsed));
    return () => clearTimeout(timer);
  }, [active, visible, delayMs, minVisibleMs]);

  return visible;
}
