/**
 * A minimal <dialog> implementation for jsdom, which ships none.
 *
 * What this shim reproduces, because the app's behaviour depends on it and
 * the tests assert it:
 *
 *   - open / close state and the `open` property
 *   - the `close` event, fired by close(); and the `cancel` event, fired only
     by Escape - the distinction the app relies on to tell a user dismissal
     apart from its own teardown
 *   - focus moving into the dialog on showModal()
 *   - focus returning to the previously focused element on close()
 *
 * What it deliberately does NOT reproduce, so no test should claim to cover
 * it: the focus trap, background inertness, and top-layer stacking. Those are
 * the platform's job and are verified in a real browser instead. A shim that
 * pretended to implement them would let a test pass while the real modal
 * leaked focus.
 */
const previouslyFocused = new WeakMap<HTMLDialogElement, Element | null>();
const openDialogs = new Set<HTMLDialogElement>();

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function installDialogShim(): void {
  const proto = window.HTMLDialogElement.prototype;
  if (typeof proto.showModal === 'function') return;

  proto.showModal = function showModal(this: HTMLDialogElement): void {
    if (this.hasAttribute('open')) return;
    previouslyFocused.set(this, document.activeElement);
    this.setAttribute('open', '');
    openDialogs.add(this);

    const target = this.querySelector<HTMLElement>(FOCUSABLE) ?? this;
    if (target instanceof HTMLElement) {
      if (target === this) this.tabIndex = -1;
      target.focus();
    }
  };

  proto.show = function show(this: HTMLDialogElement): void {
    this.setAttribute('open', '');
  };

  proto.close = function close(this: HTMLDialogElement, returnValue?: string): void {
    if (!this.hasAttribute('open')) return;
    if (returnValue !== undefined) this.returnValue = returnValue;

    this.removeAttribute('open');
    openDialogs.delete(this);

    const restore = previouslyFocused.get(this);
    previouslyFocused.delete(this);
    if (restore instanceof HTMLElement && restore.isConnected) restore.focus();

    this.dispatchEvent(new Event('close'));
  };

  // Escape on the topmost modal fires a cancelable `cancel` event first, and
  // only closes if nothing calls preventDefault(). Reproducing that ordering
  // is the whole point of the shim: the app depends on it.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || openDialogs.size === 0) return;

    const topmost = [...openDialogs][openDialogs.size - 1];
    if (topmost === undefined) return;

    const cancelled = topmost.dispatchEvent(new Event('cancel', { cancelable: true }));
    if (cancelled) topmost.close();
  });
}
