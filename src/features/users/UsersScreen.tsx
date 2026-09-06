import { useDeferredValue, useMemo } from 'react';
import { matchesUser } from '../../data/search';
import { useUsersQuery, type UsersQueryStatus } from '../../data/useUsersQuery';
import { clearEdit, saveEdit, useEdits } from '../../edits/editsStore';
import { applyEdits, type MergedUser } from '../../edits/merge';
import { isPersistent } from '../../lib/storage';
import { useDelayedFlag } from '../../lib/useDelayedFlag';
import { SimulationPanel } from './SimulationPanel';
import { Toolbar } from './Toolbar';
import { UserDetail, UserNotFound } from './UserDetail';
import { UserList } from './UserList';
import styles from './UsersScreen.module.css';
import { cityOptions, filterByCity, sortUsersByName } from './derive';
import { EmptyState } from './states/EmptyState';
import { ErrorState } from './states/ErrorState';
import { NoResults } from './states/NoResults';
import { SkeletonList } from './states/SkeletonList';
import { useSimulation } from './simulation';
import { useViewState } from './viewState';

const Body = ({
  status,
  users,
  hasError,
  isFiltered,
  onClearFilters,
  onSelect,
}: {
  readonly status: UsersQueryStatus;
  readonly users: readonly MergedUser[];
  readonly hasError: boolean;
  readonly isFiltered: boolean;
  readonly onClearFilters: () => void;
  readonly onSelect: (id: number) => void;
}) => {
  // First load: nothing to preserve, so show the shape of what is coming.
  if (status === 'loading' && users.length === 0) return <SkeletonList />;

  if (users.length === 0) {
    // A failure is already explained above; do not stack a second empty
    // message underneath it saying the same blank screen differently.
    if (hasError) return null;
    return isFiltered ? <NoResults onClearFilters={onClearFilters} /> : <EmptyState />;
  }

  return <UserList users={users} onSelect={onSelect} />;
};

export const UsersScreen = () => {
  const view = useViewState();
  const edits = useEdits();
  const simulation = useSimulation();
  const { status, users, error, retry } = useUsersQuery(view.query, simulation.config);

  /*
   * The derived pipeline, in the order it has to happen.
   *
   * Merging comes first so that everything downstream - search, the city
   * options, the detail lookup - operates on what the user is actually
   * looking at rather than on what the server last said. Searching before
   * merging would mean a user renamed on this device could not be found by
   * their new name, which reads as a bug however it is explained.
   */
  const merged = useMemo(() => applyEdits(users, edits), [users, edits]);

  /*
   * The input stays bound to view.query so typing is never laggy; the list
   * re-filters against a deferred copy at lower priority. At ten rows this
   * changes nothing. At ten thousand it is the difference between a
   * responsive field and one that drops characters, and it is cheaper and
   * more accurate than a debounce, which would make every user wait a fixed
   * delay whether or not the work was slow.
   */
  const deferredQuery = useDeferredValue(view.query);

  const matched = useMemo(
    () => merged.filter((user) => matchesUser(user, deferredQuery)),
    [merged, deferredQuery],
  );

  // Filter before sort: same result, smaller array to sort.
  const visibleUsers = useMemo(
    () => sortUsersByName(filterByCity(matched, view.city), view.direction),
    [matched, view.city, view.direction],
  );

  const cities = useMemo(() => cityOptions(merged), [merged]);

  // Looked up in the full dataset, not the filtered view: a ?user= link must
  // still open even when the current search or city filter excludes that row.
  const selectedUser = useMemo(
    () =>
      view.selectedUserId === null
        ? null
        : (merged.find((user) => user.id === view.selectedUserId) ?? null),
    [merged, view.selectedUserId],
  );

  // Only once a load has actually succeeded. While loading we do not yet know
  // whether the id is bad, and claiming "not found" would be a guess.
  const selectionMissing =
    view.selectedUserId !== null && selectedUser === null && status === 'success';

  const isFirstLoad = status === 'loading' && merged.length === 0;

  /*
   * Only surfaced once the wait is long enough to notice. Against the real
   * endpoint every request resolves in milliseconds, so an ungated indicator
   * flashes on each keystroke and tells the user nothing.
   */
  const isRefreshing = useDelayedFlag(status === 'loading' && merged.length > 0);
  const isFiltered = view.query !== '' || view.city !== '';

  const summary = summarize({
    isFirstLoad,
    hasError: error !== null,
    count: visibleUsers.length,
    total: merged.length,
    isFiltered,
  });

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Users</h1>
        <SimulationPanel
          config={simulation.config}
          onChange={simulation.setConfig}
          isActive={simulation.isActive}
        />
      </header>

      <Toolbar
        query={view.query}
        onQueryChange={view.setQuery}
        city={view.city}
        cities={cities}
        onCityChange={view.setCity}
        direction={view.direction}
        onDirectionChange={view.setDirection}
        summary={summary}
      />

      <main className={styles.main} aria-busy={status === 'loading'}>
        {error !== null && <ErrorState error={error} onRetry={retry} />}
        {isRefreshing && <div className={styles.progress} />}

        <Body
          status={status}
          users={visibleUsers}
          hasError={error !== null}
          isFiltered={isFiltered}
          onClearFilters={view.clearFilters}
          onSelect={view.selectUser}
        />
      </main>

      {selectedUser !== null && (
        <UserDetail
          user={selectedUser}
          onClose={view.clearSelection}
          // The edit records the server value it was made against, which is
          // what lets the app notice later that the server has moved on.
          onSaveName={(name) => saveEdit(selectedUser.id, name, selectedUser.serverName)}
          onRevertName={() => clearEdit(selectedUser.id)}
          canPersist={isPersistent()}
        />
      )}
      {selectionMissing && <UserNotFound onClose={view.clearSelection} />}
    </div>
  );
};

function summarize({
  isFirstLoad,
  hasError,
  count,
  total,
  isFiltered,
}: {
  readonly isFirstLoad: boolean;
  readonly hasError: boolean;
  readonly count: number;
  readonly total: number;
  readonly isFiltered: boolean;
}): string {
  if (isFirstLoad) return 'Loading users';
  if (hasError && count === 0) return 'Could not load users';
  // Deliberately not the same sentence as the NoResults panel below it:
  // printing identical copy twice makes a screen reader say it twice and
  // makes the sighted reader wonder which one is the control.
  if (count === 0) return isFiltered ? `Showing 0 of ${total} users` : 'No users';
  if (isFiltered) return `Showing ${count} of ${total} users`;
  return `${total} ${total === 1 ? 'user' : 'users'}`;
}
