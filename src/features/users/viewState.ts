import { useCallback, useMemo } from 'react';
import { goBack, historyState, navigate, useUrlSearchParams } from '../../url/useUrlState';

export type SortDirection = 'asc' | 'desc';

export type ViewState = {
  readonly query: string;
  /** Empty string means "every city". */
  readonly city: string;
  readonly direction: SortDirection;
  readonly selectedUserId: number | null;
};

export const PARAM = {
  query: 'q',
  city: 'city',
  direction: 'dir',
  user: 'user',
} as const;

/** Marker written into history.state when this app opened the detail view. */
const OPENED_BY_APP = 'detail-opened-by-app';

export function decodeViewState(params: URLSearchParams): ViewState {
  const rawUser = params.get(PARAM.user);
  const parsedUser = rawUser === null ? Number.NaN : Number.parseInt(rawUser, 10);

  return {
    query: params.get(PARAM.query) ?? '',
    city: params.get(PARAM.city) ?? '',
    direction: params.get(PARAM.direction) === 'desc' ? 'desc' : 'asc',
    selectedUserId: Number.isFinite(parsedUser) ? parsedUser : null,
  };
}

function setOrDelete(params: URLSearchParams, key: string, value: string | null): void {
  if (value === null || value === '') {
    params.delete(key);
  } else {
    params.set(key, value);
  }
}

/**
 * Encode a patch over the current state.
 *
 * Starts from the existing params rather than a blank set so unrelated keys
 * survive, and omits any value that equals its default so the common URL
 * stays clean and shareable.
 */
function encode(current: URLSearchParams, patch: Partial<ViewState>): URLSearchParams {
  const next = { ...decodeViewState(current), ...patch };
  const params = new URLSearchParams(current);

  setOrDelete(params, PARAM.query, next.query);
  setOrDelete(params, PARAM.city, next.city);
  setOrDelete(params, PARAM.direction, next.direction === 'desc' ? 'desc' : null);
  setOrDelete(params, PARAM.user, next.selectedUserId === null ? null : String(next.selectedUserId));

  return params;
}

/**
 * View state, read from and written to the URL.
 *
 * History policy - a product decision, not an implementation detail:
 *
 *   query / city / direction   replaceState. Nobody expects Back to un-type a
 *                              letter or to rewind a filter tweak; doing so
 *                              makes the button useless for leaving the page.
 *
 *   open detail                pushState. Back closes the detail. This is the
 *                              expectation the brief most clearly names.
 *
 * Closing the detail prefers history.back() so the forward entry is consumed
 * rather than orphaned - but only when this app pushed that entry. Someone who
 * arrived on a ?user= deep link has no entry to go back to, and calling back()
 * would throw them out of the app entirely, so that case rewrites the URL
 * instead.
 */
export function useViewState() {
  const params = useUrlSearchParams();
  const view = useMemo(() => decodeViewState(params), [params]);

  const setQuery = useCallback(
    (query: string) => navigate(encode(params, { query }), 'replace', historyState()),
    [params],
  );

  const setCity = useCallback(
    (city: string) => navigate(encode(params, { city }), 'replace', historyState()),
    [params],
  );

  const setDirection = useCallback(
    (direction: SortDirection) =>
      navigate(encode(params, { direction }), 'replace', historyState()),
    [params],
  );

  const clearFilters = useCallback(
    () => navigate(encode(params, { query: '', city: '' }), 'replace', historyState()),
    [params],
  );

  const selectUser = useCallback(
    (selectedUserId: number) =>
      navigate(encode(params, { selectedUserId }), 'push', OPENED_BY_APP),
    [params],
  );

  const clearSelection = useCallback(() => {
    if (historyState() === OPENED_BY_APP) {
      goBack();
      return;
    }
    navigate(encode(params, { selectedUserId: null }), 'replace', historyState());
  }, [params]);

  return { ...view, setQuery, setCity, setDirection, clearFilters, selectUser, clearSelection };
}
