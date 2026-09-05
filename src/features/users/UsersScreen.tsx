import { useMemo } from 'react';
import type { User } from '../../data/types';
import { useUsersQuery, type UsersQueryStatus } from '../../data/useUsersQuery';
import { Toolbar } from './Toolbar';
import { cityOptions, filterByCity, sortUsersByName } from './derive';
import { UserList } from './UserList';
import styles from './UsersScreen.module.css';
import { EmptyState } from './states/EmptyState';
import { ErrorState } from './states/ErrorState';
import { NoResults } from './states/NoResults';
import { SkeletonList } from './states/SkeletonList';
import { useViewState } from './viewState';

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

function Body({
  status,
  users,
  hasError,
  isFiltered,
  onClearFilters,
}: {
  readonly status: UsersQueryStatus;
  readonly users: readonly User[];
  readonly hasError: boolean;
  readonly isFiltered: boolean;
  readonly onClearFilters: () => void;
}) {
  // First load: nothing to preserve, so show the shape of what is coming.
  if (status === 'loading' && users.length === 0) return <SkeletonList />;

  if (users.length === 0) {
    // A failure is already explained above; do not stack a second empty
    // message underneath it saying the same blank screen differently.
    if (hasError) return null;
    return isFiltered ? <NoResults onClearFilters={onClearFilters} /> : <EmptyState />;
  }

  return <UserList users={users} />;
}

export function UsersScreen() {
  const view = useViewState();
  const { status, users, allUsers, error, retry } = useUsersQuery(view.query);

  // Filter first, then sort: sorting the smaller set is cheaper, and the
  // result is identical either way.
  const visibleUsers = useMemo(
    () => sortUsersByName(filterByCity(users, view.city), view.direction),
    [users, view.city, view.direction],
  );

  const cities = useMemo(() => cityOptions(allUsers), [allUsers]);

  const isFirstLoad = status === 'loading' && visibleUsers.length === 0;
  const isRefreshing = status === 'loading' && visibleUsers.length > 0;
  const isFiltered = view.query !== '' || view.city !== '';

  const summary = summarize({
    isFirstLoad,
    hasError: error !== null,
    count: visibleUsers.length,
    total: allUsers.length,
    isFiltered,
  });

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Users</h1>
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
        />
      </main>
    </div>
  );
}
