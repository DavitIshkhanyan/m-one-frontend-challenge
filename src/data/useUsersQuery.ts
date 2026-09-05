import { useCallback, useEffect, useRef, useState } from 'react';
import { isAbortError, toRequestError, type RequestError } from './net';
import type { User } from './types';
import { fetchUsers } from './usersApi';

export type UsersQueryStatus = 'loading' | 'success' | 'error';

export type UsersQueryState = {
  readonly status: UsersQueryStatus;
  /**
   * The last data we successfully loaded. Deliberately NOT cleared on error:
   * a failed refetch should leave the list the user was reading on screen
   * with the failure reported above it, not blank the page.
   */
  /**
   * The result set for the current query, exactly as the endpoint returned
   * it. Matching is NOT applied here - see the note on the hook below.
   */
  readonly users: readonly User[];
  readonly error: RequestError | null;
};

export type UsersQuery = UsersQueryState & {
  readonly retry: () => void;
};

/**
 * The one place a network response is allowed to become state.
 *
 * Two guards, because they fail differently and neither covers the other:
 *
 *   AbortController      cancels the in-flight request when the query changes,
 *                        so we stop waiting on work nobody wants any more.
 *
 *   generation counter   catches the response that was ALREADY past the abort
 *                        boundary when abort fired — resolved, buffered, or
 *                        sitting in a microtask. Abort cannot unwind those.
 *                        Without this check a slow request for "le" can land
 *                        after a fast one for "lea" and overwrite it.
 *
 * The third rule is that cancellation is not failure. An aborted request must
 * return silently; rendering it as an error puts a spurious "something went
 * wrong" on screen every time someone types quickly.
 *
 * Note the query is a request input, so each keystroke issues a request. For
 * ten rows that is more work than filtering in memory would be, and the README
 * says so plainly — but the endpoint has no search parameter to send, and
 * building the race away rather than guarding it would answer a different
 * question than the one being asked.
 */
export function useUsersQuery(query: string): UsersQuery {
  const [state, setState] = useState<UsersQueryState>({
    status: 'loading',
    users: [],
    error: null,
  });

  const latestGeneration = useRef(0);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const generation = (latestGeneration.current += 1);
    const controller = new AbortController();

    // Mark in flight without discarding what is already rendered.
    setState((previous) => ({ ...previous, status: 'loading' }));

    void (async () => {
      try {
        const users = await fetchUsers(controller.signal);
        if (generation !== latestGeneration.current) return;

        setState({ status: 'success', users, error: null });
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return;
        if (generation !== latestGeneration.current) return;

        setState((previous) => ({
          status: 'error',
          users: previous.users,
          error: toRequestError(error),
        }));
      }
    })();

    return () => controller.abort();
  }, [query, retryToken]);

  const retry = useCallback(() => setRetryToken((token) => token + 1), []);

  return { ...state, retry };
}
