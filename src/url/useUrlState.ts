import { useMemo, useSyncExternalStore } from 'react';

export type NavigateMode = 'push' | 'replace';

/**
 * The query string, as a subscribable external store.
 *
 * "Not in scope: routing to anything other than what this screen needs" is a
 * fence against adding a router and a second page, not against touching
 * history - and the back button cannot behave without history entries. So:
 * the History API directly, one screen, no path segments, no dependency.
 *
 * pushState and replaceState deliberately do not fire popstate, so every
 * navigation this module performs notifies subscribers itself.
 */

const listeners = new Set<() => void>();
let snapshot = typeof window === 'undefined' ? '' : window.location.search;

function emit(): void {
  snapshot = window.location.search;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener('popstate', emit);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('popstate', emit);
  };
}

function getSnapshot(): string {
  return snapshot;
}

function getServerSnapshot(): string {
  return '';
}

export function useUrlSearchParams(): URLSearchParams {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function navigate(
  params: URLSearchParams,
  mode: NavigateMode,
  state: unknown = null,
): void {
  const query = params.toString();
  const url = `${window.location.pathname}${query === '' ? '' : `?${query}`}${window.location.hash}`;

  if (mode === 'push') {
    window.history.pushState(state, '', url);
  } else {
    window.history.replaceState(state, '', url);
  }

  emit();
}

export function historyState(): unknown {
  return typeof window === 'undefined' ? null : window.history.state;
}

export function goBack(): void {
  window.history.back();
}
